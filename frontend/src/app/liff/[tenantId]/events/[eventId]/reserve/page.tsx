'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, LiffEvent, LiffProfile, LiffTenant, ReserveResult } from '@/lib/api';
import { initLiff, getLiffUserId, checkFriendship, liff } from '@/lib/liff';

const GRADES = ['高校1年', '高校2年', '高校3年', '大学1年', '大学2年', '大学3年', '大学4年', '大学院生', '社会人', 'その他'];
const GENDERS = ['男性', '女性', 'その他・回答しない'];

function ReservePageInner() {
  const { tenantId, eventId } = useParams<{ tenantId: string; eventId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isWaitlist = searchParams.get('waitlist') === '1';

  const [event, setEvent] = useState<LiffEvent | null>(null);
  const [tenant, setTenant] = useState<LiffTenant | null>(null);
  const [lineUserId, setLineUserId] = useState('');
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [isFriend, setIsFriend] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // フォーム状態（プロフィール未登録時のみ使用）
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function init() {
      const initOk = await initLiff();

      // initLiff()失敗時はliff関数を呼べないのでフォールバックを表示する
      if (!initOk) {
        setLoading(false);
        return;
      }

      try {
        if (!liff.isLoggedIn()) {
          // LINEアプリ内（LIFF browser）では liff.login() を呼ばない。
          // 呼ぶとLIFFエンドポイントURL（ルート）へのリダイレクトが発生し、
          // DISCOVERタブが表示されてしまう。LINEアプリ内では
          // liff.init()が認証を自動処理するため、ここに来るのは設定エラー。
          if (liff.isInClient()) {
            setLoading(false);
            return;
          }

          // 外部ブラウザ: ループ防止フラグをlocalStorageで管理
          // （iOSのLINEブラウザはwebview間でsessionStorageをリセットする場合がある）
          const tried = localStorage.getItem('liff-login-tried');
          if (tried) {
            localStorage.removeItem('liff-login-tried');
            setLoading(false);
            return;
          }
          localStorage.setItem('liff-login-tried', '1');
          localStorage.setItem('liff-pending-redirect', window.location.href);
          liff.login({ redirectUri: window.location.href });
          return;
        }
      } catch {
        setLoading(false);
        return;
      }
      localStorage.removeItem('liff-login-tried');

      const uid = (await getLiffUserId()) ?? '';
      if (!uid) { setLoading(false); return; }
      setLineUserId(uid);

      const [ev, prof, tenantInfo] = await Promise.allSettled([
        api.liff.event(tenantId, eventId),
        api.liff.profile(tenantId, uid).catch(() => null),
        api.liff.tenant(tenantId),
      ]);
      if (ev.status === 'fulfilled') setEvent(ev.value);
      if (prof.status === 'fulfilled') setProfile(prof.value);
      if (tenantInfo.status === 'fulfilled') setTenant(tenantInfo.value);

      const hasProfile = prof.status === 'fulfilled' && prof.value?.name && prof.value?.grade && prof.value?.gender;
      const tenantLineId = tenantInfo.status === 'fulfilled' ? tenantInfo.value?.lineChannelId : null;
      if (!hasProfile && tenantLineId) {
        const friend = await checkFriendship();
        setIsFriend(friend);
      } else {
        setIsFriend(true);
      }

      setLoading(false);
    }
    init();
  }, [tenantId, eventId]);

  async function submit(overrides?: { name: string; grade: string; gender: string }) {
    if (!lineUserId) { setError('LINEログインが必要です。ページを再読み込みしてください。'); return; }
    setError('');
    setSubmitting(true);
    try {
      const body: Record<string, string> = { eventId, lineUserId, ...(overrides ?? {}) };
      const result = await api.liff.reserve(tenantId, body as any);
      if (result.stripeCheckoutUrl) { window.location.href = result.stripeCheckoutUrl; return; }
      router.push(`/liff/${tenantId}/events/${eventId}/done?status=${result.status}&order=${result.waitlistOrder ?? ''}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '予約に失敗しました';
      const isDuplicate = msg.includes('予約済み') || msg.includes('同じ日');
      if (isDuplicate) {
        alert('既に予約済みです');
        router.push(`/liff/${tenantId}/events/${eventId}`);
        return;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:border-transparent';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#06C755] text-sm">読み込み中...</div>
      </div>
    );
  }

  const hasProfile = profile && profile.name && profile.grade && profile.gender;

  if (!loading && !lineUserId) {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    const liffUrl = liffId
      ? `https://liff.line.me/${liffId}/liff/${tenantId}/events/${eventId}/reserve${isWaitlist ? '?waitlist=1' : ''}`
      : null;
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center px-6 text-center gap-5">
        <div className="w-16 h-16 rounded-full bg-[#06C755]/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.03 2 11c0 3.13 1.68 5.9 4.28 7.54L5.5 22l3.78-1.97C10.16 20.65 11.07 21 12 21c5.52 0 10-4.03 10-9S17.52 2 12 2z" fill="#06C755"/>
          </svg>
        </div>
        <div>
          <p className="text-base font-bold text-gray-900">LINEアプリから予約してください</p>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            予約にはLINE認証が必要です。
          </p>
        </div>
        {liffUrl && (
          <a
            href={liffUrl}
            className="bg-[#06C755] text-white font-bold px-8 py-3.5 rounded-2xl text-sm active:bg-[#05a847]"
          >
            LINEアプリで開く
          </a>
        )}
      </div>
    );
  }

  if (!isFriend) {
    const addFriendUrl = tenant?.lineChannelId
      ? `https://line.me/R/ti/p/@${tenant.lineChannelId}`
      : null;
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-[#06C755]/10 flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.03 2 11c0 3.13 1.68 5.9 4.28 7.54L5.5 22l3.78-1.97C10.16 20.65 11.07 21 12 21c5.52 0 10-4.03 10-9S17.52 2 12 2z" fill="#06C755"/>
          </svg>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">公式LINEの友だち追加が必要です</p>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            予約にはLINE公式アカウントの友だち追加が必要です。追加後にもう一度お試しください。
          </p>
        </div>
        {addFriendUrl && (
          <a
            href={addFriendUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#06C755] text-white font-bold px-8 py-3.5 rounded-2xl text-sm active:bg-[#05a847]"
          >
            友だち追加する
          </a>
        )}
        <button onClick={() => router.back()} className="text-sm text-gray-400">
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#06C755] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push(`/liff/${tenantId}/events/${eventId}`)} className="text-white text-xl leading-none">‹</button>
        <h1 className="text-base font-bold">{isWaitlist ? 'キャンセル待ち登録' : '予約確認'}</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        {event && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="font-semibold text-gray-900 text-sm">{event.title}</p>
            <p className="text-xs text-[#06C755] mt-1">{event.location}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {hasProfile ? (
          /* ── 登録済みユーザー：確認画面 ── */
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <p className="text-xs font-medium text-gray-500 mb-1">参加者情報</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">お名前</span>
                <span className="font-medium text-gray-900">{profile.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">学年</span>
                <span className="font-medium text-gray-900">{profile.grade}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">性別</span>
                <span className="font-medium text-gray-900">{profile.gender}</span>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/liff/${tenantId}/profile/edit`)}
                className="text-xs text-[#06C755] hover:underline pt-1"
              >
                情報を変更する →
              </button>
            </div>

            <button
              onClick={() => submit()}
              disabled={submitting}
              className="w-full bg-[#06C755] text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:bg-[#05a847] transition-colors shadow-sm"
            >
              {submitting ? '送信中...' : isWaitlist ? 'キャンセル待ちに登録する' : '予約を確定する'}
            </button>
          </>
        ) : (
          /* ── 初回ユーザー：入力フォーム ── */
          <form
            onSubmit={(e) => { e.preventDefault(); submit({ name, grade, gender }); }}
            className="space-y-4"
          >
            <p className="text-xs text-gray-500 px-1">初回のみ情報を入力してください。次回以降は省略できます。</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">お名前 <span className="text-red-400">*</span></label>
                <input required minLength={1} maxLength={50}
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="山田太郎"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">学年 <span className="text-red-400">*</span></label>
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
                      <input type="radio" name="gender" value={g} required checked={gender === g} onChange={() => setGender(g)} className="accent-[#06C755]" />
                      {g}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit" disabled={submitting}
              className="w-full bg-[#06C755] text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:bg-[#05a847] transition-colors shadow-sm"
            >
              {submitting ? '送信中...' : isWaitlist ? 'キャンセル待ちに登録する' : '予約を確定する'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ReservePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#06C755] text-sm">読み込み中...</div>
      </div>
    }>
      <ReservePageInner />
    </Suspense>
  );
}
