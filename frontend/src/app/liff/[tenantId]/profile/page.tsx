'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, LiffMyReservation, LiffProfile, setLiffToken } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded, liff } from '@/lib/liff';
import { useLiffTheme, hexToRgba } from '@/components/liff/LiffThemeProvider';

const GRADES = ['大学生（18～22歳）', '社会人'];
const GENDERS = ['男性', '女性'];
const LEVELS = ['初心者', '中級', '上級'];

const STATUS_LABEL: Record<string, string> = {
  reserved: '予約済み',
  waitlisted: 'キャンセル待ち',
  waiting_payment: '支払待ち',
};

function threadMonthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    timeZone: 'Asia/Tokyo',
  });
}

function threadDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
}

function priceLabel(r: LiffMyReservation) {
  if (r.event.priceMale != null && r.event.priceFemale != null) {
    return `男性 ¥${r.event.priceMale.toLocaleString()} / 女性 ¥${r.event.priceFemale.toLocaleString()}`;
  }
  return r.event.price === 0 ? '無料' : `¥${r.event.price.toLocaleString()}`;
}

export default function ProfilePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const theme = useLiffTheme();
  const accentColor = theme.accentColor;
  const returnTo = searchParams.get('returnTo');

  const [lineUserId, setLineUserId] = useState('');
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [reservations, setReservations] = useState<LiffMyReservation[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('');
  const [level, setLevel] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const ok = await initLiff();
      let uid = '';
      if (ok) {
        const loggedIn = await loginIfNeeded();
        if (loggedIn) uid = (await getLiffUserId()) ?? '';
      } else {
        uid = `demo-${tenantId}`;
      }

      if (!uid) {
        setLoading(false);
        return;
      }
      setLineUserId(uid);
      setLiffToken(liff.isLoggedIn() ? liff.getIDToken() : null);

      const [prof, myReservations] = await Promise.all([
        api.liff.profile(tenantId, uid).catch(() => null),
        api.liff.myReservations(tenantId).catch(() => []),
      ]);
      if (prof) {
        setProfile(prof);
        setName(prof.name ?? '');
        setGrade(prof.grade ?? '');
        setGender(prof.gender ?? '');
        setLevel(prof.level ?? '');
        setComment(prof.comment ?? '');
      }
      setReservations(myReservations);
      setLoading(false);
    }
    init();
  }, [tenantId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      setLiffToken(liff.isLoggedIn() ? liff.getIDToken() : null);
      const updated = await api.liff.updateProfile(tenantId, lineUserId, { name, grade, gender, level, comment });
      setProfile(updated);
      if (returnTo) {
        router.push(returnTo);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(reservationId: string) {
    if (!confirm('予約をキャンセルしますか？')) return;
    setCancellingId(reservationId);
    try {
      setLiffToken(liff.isLoggedIn() ? liff.getIDToken() : null);
      await api.liff.cancel(tenantId, reservationId);
      setReservations((prev) => prev.filter((r) => r.id !== reservationId));
    } catch {
      alert('キャンセルに失敗しました');
    } finally {
      setCancellingId(null);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--liff-accent)] focus:border-transparent';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm" style={{ color: accentColor }}>読み込み中...</div>
      </div>
    );
  }

  const groups = reservations.reduce<Record<string, LiffMyReservation[]>>((acc, r) => {
    const key = threadMonthLabel(r.event.heldAt);
    (acc[key] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#F5F5F5]" style={{ '--liff-accent': accentColor } as React.CSSProperties}>
      <div className="text-white" style={{ backgroundColor: accentColor }}>
        <div className="max-w-[480px] mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push(`/liff/${tenantId}`)} className="text-white text-xl leading-none">‹</button>
          <h1 className="text-base font-bold">マイページ</h1>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-5 space-y-5">
        {returnTo && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm">
            予約を続けるには、プロフィールを入力して保存してください。
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white/85 rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <p className="text-xs font-medium text-gray-500">プロフィール</p>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">お名前 <span className="text-red-400">*</span></label>
              <input required minLength={1} maxLength={50}
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="山田太郎"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">年齢 <span className="text-red-400">*</span></label>
              <select required value={grade} onChange={(e) => setGrade(e.target.value)} className={inputClass}>
                <option value="">選択してください</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">性別 <span className="text-red-400">*</span></label>
              <div className="flex gap-4">
                {GENDERS.map((g) => (
                  <label key={g} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" name="gender" value={g} required checked={gender === g} onChange={() => setGender(g)} className="accent-[var(--liff-accent)]" />
                    {g}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">レベル（任意）</label>
              <div className="flex gap-4">
                {LEVELS.map((l) => (
                  <label key={l} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" name="level" value={l} checked={level === l} onChange={() => setLevel(l)} className="accent-[var(--liff-accent)]" />
                    {l}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">一言（任意）</label>
              <input maxLength={200}
                value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="例：初心者です、よろしくお願いします！"
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit" disabled={saving}
            className="w-full text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:opacity-90 transition-colors shadow-sm"
            style={{ backgroundColor: accentColor }}
          >
            {saving ? '保存中...' : saved ? '保存しました' : '保存する'}
          </button>
        </form>

        <div>
          <p className="text-sm font-bold text-gray-800 px-1 mb-2">参加予定イベント</p>
          {reservations.length === 0 ? (
            <div className="bg-white/85 rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-400">
              予約したイベントはまだありません
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(groups).map(([month, monthReservations]) => (
                <section key={month}>
                  <p className="text-xs font-bold text-gray-400 px-1 mb-2">{month}</p>
                  <div className="space-y-2">
                    {monthReservations.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-gray-100 bg-white/85 px-4 py-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 truncate">{r.event.title}</p>
                            <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                              <p>{threadDateLabel(r.event.heldAt)}</p>
                              <p className="truncate">{r.event.location}</p>
                              <p>{priceLabel(r)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCancel(r.id)}
                            disabled={cancellingId === r.id}
                            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-50"
                            style={cancellingId === r.id ? { color: '#ef4444', backgroundColor: '#fef2f2' } : { color: accentColor, backgroundColor: hexToRgba(accentColor, 10) }}
                          >
                            {cancellingId === r.id ? 'キャンセル' : (
                              <>
                                {STATUS_LABEL[r.status] ?? r.status}
                                {r.status === 'waitlisted' && r.waitlistOrder ? `（${r.waitlistOrder}番目）` : ''}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
