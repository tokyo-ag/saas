'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, LiffMyReservation, LiffProfile, setLiffToken } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded, liff, redirectToLiffApp, isLiffLoggedIn } from '@/lib/liff';
import { useLiffTheme, readableTextColor, isLightHexColor } from '@/components/liff/LiffThemeProvider';
import { ConfirmDialog } from '@/components/liff/ConfirmDialog';
import { LiffToast } from '@/components/liff/LiffToast';

const GRADES = ['大学生（18～22歳）', '社会人'];
const GENDERS = ['男性', '女性'];
const LEVELS = ['初心者', '中級', '上級'];

const STATUS_LABEL: Record<string, string> = {
  reserved: '予約済み',
  waitlisted: 'キャンセル待ち',
  waiting_payment: '支払待ち',
};

const CATEGORY_LABELS: Record<string, string> = {
  meetup: '交流会',
  badminton: 'バドミントン',
  futsal: 'フットサル',
  basketball: 'バスケットボール',
  volleyball: 'バレー',
};

function isLineAuthErrorMessage(message: string): boolean {
  return (
    message.includes('LINEトークン') ||
    message.includes('LIFF認証') ||
    message.includes('Unauthorized')
  );
}

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

function reservationLocation(r: LiffMyReservation) {
  if (r.status === 'reserved' || r.status === 'attended') return r.event.location;
  return r.event.locationHint || r.event.location;
}

export default function ProfilePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const theme = useLiffTheme();
  const accentColor = theme.accentColor;
  // カード背景が白いため、テナントのアクセントカラーが白系だと塗りつぶしボタンが
  // 背景に同化して見えなくなる。その場合は濃色にフォールバックする。
  const solidAccentColor = isLightHexColor(accentColor) ? '#111827' : accentColor;
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
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [loginRequired, setLoginRequired] = useState(false);
  const [showLoginToast, setShowLoginToast] = useState(false);
  const [profileOpen, setProfileOpen] = useState(!!returnTo);
  const [eventsOpen, setEventsOpen] = useState(true);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const ok = await initLiff();
      let uid = '';
      if (ok) {
        if (liff.isInClient()) {
          uid = (await getLiffUserId()) ?? '';
        } else {
          const loggedIn = await loginIfNeeded();
          if (loggedIn) {
            uid = (await getLiffUserId()) ?? '';
          } else {
            setLoginRequired(true);
            setLoading(false);
            return;
          }
        }
      } else {
        uid = `demo-${tenantId}`;
      }

      if (!uid) {
        setLoginRequired(true);
        setLoading(false);
        return;
      }
      if (localStorage.getItem('liff-login-tried')) {
        setShowLoginToast(true);
        setTimeout(() => setShowLoginToast(false), 2000);
      }
      localStorage.removeItem('liff-login-tried');
      setLineUserId(uid);
      setLiffToken(isLiffLoggedIn() ? liff.getIDToken() : null);

      const [profResult, myReservations] = await Promise.all([
        api.liff.profile(tenantId, uid).then((v) => ({ ok: true as const, v })).catch((e) => ({ ok: false as const, e })),
        api.liff.myReservations(tenantId).catch(() => []),
      ]);
      let resolvedProf: LiffProfile | null = profResult.ok ? profResult.v : null;
      if (!profResult.ok) {
        const msg = profResult.e instanceof Error ? profResult.e.message : String(profResult.e);
        if (isLineAuthErrorMessage(msg)) {
          // トークンが一時的に古い可能性があるので、取り直して一度だけ再試行する。
          // それでも失敗する場合のみ再認証（ログイン画面）に進む＝二重ログイン要求を避ける。
          setLiffToken(isLiffLoggedIn() ? liff.getIDToken() : null);
          resolvedProf = await api.liff.profile(tenantId, uid).catch(() => null);
          if (!resolvedProf) {
            restartLineAuth();
            return;
          }
        }
        // それ以外（本当に初回でプロフィールが無い＝404）は空フォームのまま進める。
      }
      if (resolvedProf) {
        setProfile(resolvedProf);
        setName(resolvedProf.name ?? '');
        setGrade(resolvedProf.grade ?? '');
        setGender(resolvedProf.gender ?? '');
        setLevel(resolvedProf.level ?? '');
        setComment(resolvedProf.comment ?? '');
      } else {
        setProfileOpen(true);
      }
      setReservations(myReservations);
      setLoading(false);
    }
    init();
  }, [tenantId]);

  function restartLineAuth() {
    setError('LINE認証を更新しています。画面が切り替わらない場合は、LINEからもう一度開き直してください。');
    localStorage.removeItem('liff-login-tried');
    localStorage.setItem(
      'liff-pending-redirect',
      JSON.stringify({ url: window.location.href, expires: Date.now() + 10 * 60 * 1000 }),
    );
    setLiffToken(null);

    if (liff.isInClient()) {
      window.location.reload();
      return;
    }

    try {
      if (isLiffLoggedIn()) liff.logout();
    } catch {
      // ignore
    }
    if (!redirectToLiffApp()) {
      liff.login({ redirectUri: window.location.href });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gender) {
      setError('性別を選択してください');
      return;
    }
    setError('');
    setSaving(true);
    try {
      setLiffToken(isLiffLoggedIn() ? liff.getIDToken() : null);
      const updated = await api.liff.updateProfile(tenantId, lineUserId, { name, grade, gender, level, comment });
      setProfile(updated);
      if (returnTo) {
        router.push(returnTo);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新に失敗しました';
      if (isLineAuthErrorMessage(msg)) {
        restartLineAuth();
        return;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(reservationId: string) {
    setCancellingId(reservationId);
    try {
      setLiffToken(isLiffLoggedIn() ? liff.getIDToken() : null);
      await api.liff.cancel(tenantId, reservationId);
      setReservations((prev) => prev.filter((r) => r.id !== reservationId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (isLineAuthErrorMessage(msg)) {
        restartLineAuth();
        return;
      }
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

  async function handleLoginRetry() {
    if (liff.isInClient()) {
      window.location.reload();
      return;
    }
    if (redirectToLiffApp()) return;
    try {
      liff.login({ redirectUri: window.location.href });
    } catch {
      window.location.reload();
    }
  }

  if (loginRequired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-5" style={{ backgroundColor: theme.backgroundColor }}>
        <p className="text-sm text-gray-500">LINEへのログインが必要です。</p>
        <button
          onClick={handleLoginRetry}
          className="font-bold px-8 py-3.5 rounded-2xl text-sm active:opacity-90"
          style={{ backgroundColor: solidAccentColor, color: readableTextColor(solidAccentColor) }}
        >
          LINEログインをやり直す
        </button>
      </div>
    );
  }

  const sortedReservations = [...reservations].sort(
    (a, b) => new Date(a.event.heldAt).getTime() - new Date(b.event.heldAt).getTime(),
  );
  const groups = sortedReservations.reduce<Record<string, LiffMyReservation[]>>((acc, r) => {
    const key = threadMonthLabel(r.event.heldAt);
    (acc[key] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="min-h-screen sm:bg-gray-200" style={{ backgroundColor: theme.backgroundColor, '--liff-accent': accentColor } as React.CSSProperties}>
      <LiffToast show={showLoginToast} message="ログインしました" />
      <div className="mx-auto w-full max-w-[480px] sm:my-8 sm:overflow-hidden sm:rounded-3xl sm:shadow-2xl" style={{ backgroundColor: theme.backgroundColor, minHeight: '100dvh' }}>
      <div className="border-b border-gray-100" style={{ backgroundColor: theme.navBg }}>
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push(`/liff/${tenantId}`)} aria-label="戻る" className="-m-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-gray-900 active:bg-black/5">‹</button>
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-tight text-gray-900">マイページ</h1>
            <p className="text-[11px] leading-tight text-gray-500">プロフィールの編集と参加予定のイベントを確認</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {returnTo && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm">
            予約を続けるには、プロフィールを入力して保存してください。
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="-m-1 flex w-full items-center justify-between rounded-xl p-1 active:bg-black/5"
            >
              <span className="text-sm font-bold text-gray-800">
                プロフィールを編集する{!profileOpen && name ? <span className="ml-1 font-medium text-gray-400">（{name}）</span> : null}
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {profileOpen && (
            <>
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
              <div className="flex gap-2">
                {GENDERS.map((g) => (
                  <button key={g} type="button" onClick={() => setGender(g)}
                    className="rounded-full border px-4 py-1.5 text-sm font-bold transition"
                    style={gender === g
                      ? { backgroundColor: solidAccentColor, borderColor: solidAccentColor, color: readableTextColor(solidAccentColor) }
                      : { borderColor: '#e5e7eb', color: '#374151' }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">スポーツレベル（任意）</label>
              <div className="flex gap-2">
                {LEVELS.map((l) => (
                  <button key={l} type="button" onClick={() => setLevel(level === l ? '' : l)}
                    className="rounded-full border px-4 py-1.5 text-sm font-bold transition"
                    style={level === l
                      ? { backgroundColor: solidAccentColor, borderColor: solidAccentColor, color: readableTextColor(solidAccentColor) }
                      : { borderColor: '#e5e7eb', color: '#374151' }}>
                    {l}
                  </button>
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
            </>
            )}
          </div>

          {profileOpen && (
          <button
            type="submit" disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:opacity-90 transition-colors shadow-sm"
            style={{ backgroundColor: solidAccentColor, color: readableTextColor(solidAccentColor) }}
          >
            {saving ? '保存中...' : saved ? '保存しました' : '保存する'}
          </button>
          )}
        </form>

        <Link
          href={`/liff/${tenantId}/line-notifications`}
          className="flex items-center justify-between rounded-2xl border border-green-100 bg-green-50 p-4 shadow-sm active:opacity-80"
        >
          <div>
            <p className="text-sm font-bold text-gray-900">LINE通知の連携</p>
            <p className="mt-1 text-xs text-gray-600">予約完了・リマインドを団体公式LINEで受け取る</p>
          </div>
          <span className="text-lg text-green-600">›</span>
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <button
            type="button"
            onClick={() => setEventsOpen((v) => !v)}
            className="-m-1 flex w-full items-center justify-between rounded-xl p-1 active:bg-black/5"
          >
            <span className="text-sm font-bold text-gray-800">
              参加予定のイベントを確認{reservations.length > 0 ? `（${reservations.length}件）` : ''}
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-gray-400 transition-transform ${eventsOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {eventsOpen && (
            reservations.length === 0 ? (
              <p className="mt-4 text-center text-sm text-gray-400">予約したイベントはまだありません</p>
            ) : (
              <div className="mt-4 space-y-5">
                {Object.entries(groups).map(([month, monthReservations]) => (
                  <section key={month}>
                    <p className="text-xs font-bold text-gray-400 px-1 mb-2">{month}</p>
                    <div className="space-y-2">
                      {monthReservations.map((r) => {
                        const expanded = expandedEventId === r.id;
                        const categoryLabel = r.event.category ? (CATEGORY_LABELS[r.event.category] ?? r.event.category) : null;
                        return (
                          <div key={r.id} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setExpandedEventId(expanded ? null : r.id)}
                              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left active:bg-black/5"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-gray-900 truncate">{r.event.title}</p>
                                <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                                  <p>{threadDateLabel(r.event.heldAt)}</p>
                                  <p className="truncate">{reservationLocation(r)}</p>
                                  <p>{priceLabel(r)}</p>
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1.5">
                                <span
                                  className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                                  style={{ color: readableTextColor(solidAccentColor), backgroundColor: solidAccentColor }}
                                >
                                  {STATUS_LABEL[r.status] ?? r.status}
                                  {r.status === 'waitlisted' && r.waitlistOrder ? `（${r.waitlistOrder}番目）` : ''}
                                </span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                              </div>
                            </button>
                            {expanded && (
                              <div className="space-y-2 border-t border-gray-100 px-4 py-3 text-sm">
                                {categoryLabel && (
                                  <p><span className="text-gray-400">カテゴリ：</span>{categoryLabel}</p>
                                )}
                                <p><span className="text-gray-400">日時：</span>{threadDateLabel(r.event.heldAt)}</p>
                                <p><span className="text-gray-400">場所：</span>{reservationLocation(r)}</p>
                                <p><span className="text-gray-400">参加費：</span>{priceLabel(r)}</p>
                                {r.event.description && (
                                  <p className="whitespace-pre-wrap border-t border-gray-100 pt-2 text-xs leading-relaxed text-gray-500">{r.event.description}</p>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setConfirmCancelId(r.id)}
                                  disabled={cancellingId === r.id}
                                  className="mt-1 w-full rounded-xl py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50"
                                  style={{ backgroundColor: '#ef4444' }}
                                >
                                  {cancellingId === r.id ? 'キャンセル中...' : 'キャンセルする'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmCancelId}
        message="予約をキャンセルしますか？"
        confirmLabel="キャンセルする"
        cancelLabel="戻る"
        accentColor={accentColor}
        danger
        onCancel={() => setConfirmCancelId(null)}
        onConfirm={() => { const id = confirmCancelId; setConfirmCancelId(null); if (id) handleCancel(id); }}
      />
      </div>
    </div>
  );
}
