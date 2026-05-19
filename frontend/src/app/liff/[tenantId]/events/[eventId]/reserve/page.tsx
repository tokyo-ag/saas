'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, LiffEvent, LiffProfile, LiffTenant } from '@/lib/api';
import { initLiff, getLiffUserId, checkFriendship, liff, getInitError } from '@/lib/liff';

const GRADES = ['高校1年', '高校2年', '高校3年', '大学1年', '大学2年', '大学3年', '大学4年', '大学院生', '社会人', 'その他'];
const GENDERS = ['男性', '女性', 'その他・回答しない'];

// auth状態を3値で管理
type AuthStatus = 'loading' | 'error' | 'ok';

function ReservePageInner() {
  const { tenantId, eventId } = useParams<{ tenantId: string; eventId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isWaitlist = searchParams.get('waitlist') === '1';

  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState('');
  const [event, setEvent] = useState<LiffEvent | null>(null);
  const [tenant, setTenant] = useState<LiffTenant | null>(null);
  const [lineUserId, setLineUserId] = useState('');
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [isFriend, setIsFriend] = useState<boolean | null>(null);

  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function init() {
      // ── Step 1: LIFF初期化 ──
      const initOk = await initLiff();

      if (!initOk) {
        setAuthError(`Step1: ${getInitError() ?? '不明'}`);
        setAuthStatus('error');
        return;
      }

      // ── Step 2: ログイン確認 ──
      try {
        if (!liff.isLoggedIn()) {
          if (liff.isInClient()) {
            // LINEアプリ内で未認証 = LIFF設定エラー。
            // liff.login()を呼ぶとDISCOVERタブ→ループになるので呼ばない。
            setAuthError('Step2: LINEアプリ内で未認証（LIFF設定確認要）');
            setAuthStatus('error');
            return;
          }

          // 外部ブラウザ: LINEログインへリダイレクト（1回のみ）
          const tried = localStorage.getItem('liff-login-tried');
          if (tried) {
            // 1回試みたが戻ってきても未認証 → エラー表示
            localStorage.removeItem('liff-login-tried');
            setAuthStatus('error');
            return;
          }
          localStorage.setItem('liff-login-tried', '1');
          localStorage.setItem('liff-pending-redirect', window.location.href);
          liff.login({ redirectUri: window.location.href });
          return; // リダイレクト待ち
        }
      } catch (e) {
        setAuthError(`Step2-catch: ${e instanceof Error ? e.message : String(e)}`);
        setAuthStatus('error');
        return;
      }

      // 認証成功 → ループ防止フラグをクリア
      localStorage.removeItem('liff-login-tried');
      localStorage.removeItem('liff-pending-redirect');

      // ── Step 3: userId取得 ──
      let uid = '';
      try {
        uid = (await getLiffUserId()) ?? '';
      } catch (e) {
        setAuthError(`Step3: ${e instanceof Error ? e.message : String(e)}`);
        setAuthStatus('error');
        return;
      }
      if (!uid) {
        setAuthError('Step3: userIdが空');
        setAuthStatus('error');
        return;
      }
      setLineUserId(uid);

      // ── Step 4: データ取得 ──
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

      setAuthStatus('ok');
    }
    init();
  }, [tenantId, eventId]);

  async function submit(overrides?: { name: string; grade: string; gender: string }) {
    if (!lineUserId) return;
    setError('');
    setSubmitting(true);
    try {
      const body: Record<string, string> = { eventId, lineUserId, ...(overrides ?? {}) };
      const result = await api.liff.reserve(tenantId, body as any);
      if (result.stripeCheckoutUrl) {
        window.location.href = result.stripeCheckoutUrl;
        return;
      }
      // router.push()はLIFF(iOS WKWebView)で動作しない場合があるためhrefを使う
      window.location.href = `/liff/${tenantId}/events/${eventId}/done?status=${result.status}&order=${result.waitlistOrder ?? ''}`;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '予約に失敗しました';
      const isDuplicate = msg.includes('予約済み') || msg.includes('同じ日');
      if (isDuplicate) {
        alert('既に予約済みです');
        window.location.href = `/liff/${tenantId}/events/${eventId}`;
        return;
      }
      setError(msg);
      alert(`予約エラー: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--cp)] focus:border-transparent';

  // ── ローディング ──
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--cp)] text-sm">読み込み中...</div>
      </div>
    );
  }

  // ── 認証エラー（リダイレクトは一切しない・ループ防止） ──
  if (authStatus === 'error') {
    return (
      <div className="min-h-screen bg-[var(--cp-15)] flex flex-col items-center justify-center px-6 text-center gap-5">
        <p className="text-sm text-gray-500">認証に失敗しました。もう一度お試しください。</p>
        {authError && (
          <p className="text-xs text-red-400 bg-red-50 px-3 py-2 rounded-lg font-mono break-all">{authError}</p>
        )}
        <button
          onClick={() => window.location.reload()}
          className="bg-[var(--cp)] text-white font-bold px-8 py-3.5 rounded-2xl text-sm active:bg-[var(--cp-h)]"
        >
          再試行する
        </button>
      </div>
    );
  }

  // ── 友だち追加が必要 ──
  if (!isFriend) {
    const addFriendUrl = tenant?.lineChannelId
      ? `https://line.me/R/ti/p/@${tenant.lineChannelId}`
      : null;
    return (
      <div className="min-h-screen bg-[var(--cp-15)] flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-[var(--cp-10)] flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.03 2 11c0 3.13 1.68 5.9 4.28 7.54L5.5 22l3.78-1.97C10.16 20.65 11.07 21 12 21c5.52 0 10-4.03 10-9S17.52 2 12 2z" fill="currentColor"/>
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
            className="bg-[var(--cp)] text-white font-bold px-8 py-3.5 rounded-2xl text-sm active:bg-[var(--cp-h)]"
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

  // ── 予約フォーム ──
  const hasProfile = profile && profile.name && profile.grade && profile.gender;

  return (
    <div className="min-h-screen bg-[var(--cp-15)]">
      <div className="bg-[var(--cp)] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push(`/liff/${tenantId}/events/${eventId}`)} className="text-white text-xl leading-none">‹</button>
        <h1 className="text-base font-bold">{isWaitlist ? 'キャンセル待ち登録' : '予約確認'}</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        {event && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="font-semibold text-gray-900 text-sm">{event.title}</p>
            <p className="text-xs text-[var(--cp)] mt-1">{event.location}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {hasProfile ? (
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
                className="text-xs text-[var(--cp)] hover:underline pt-1"
              >
                情報を変更する →
              </button>
            </div>

            <button
              onClick={() => submit()}
              disabled={submitting}
              className="w-full bg-[var(--cp)] text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:bg-[var(--cp-h)] transition-colors shadow-sm"
            >
              {submitting ? '送信中...' : isWaitlist ? 'キャンセル待ちに登録する' : '予約を確定する'}
            </button>
          </>
        ) : (
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
                      <input type="radio" name="gender" value={g} required checked={gender === g} onChange={() => setGender(g)} className="accent-[var(--cp)]" />
                      {g}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit" disabled={submitting}
              className="w-full bg-[var(--cp)] text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:bg-[var(--cp-h)] transition-colors shadow-sm"
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
        <div className="text-[var(--cp)] text-sm">読み込み中...</div>
      </div>
    }>
      <ReservePageInner />
    </Suspense>
  );
}
