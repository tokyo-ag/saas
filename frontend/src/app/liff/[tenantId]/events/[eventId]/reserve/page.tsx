'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, LiffEvent, LiffProfile, LiffReservation, LiffTenant, PublicRoster, setLiffToken, formatDate } from '@/lib/api';
import {
  initLiff,
  getLiffProfile,
  checkFriendship,
  liff,
  getInitError,
  loginIfNeeded,
  redirectToLiffApp,
} from '@/lib/liff';
import { useLiffTheme, hexToRgba, readableTextColor, isLightHexColor } from '@/components/liff/LiffThemeProvider';
import { ConfirmDialog } from '@/components/liff/ConfirmDialog';

const CATEGORY_LABELS: Record<string, string> = {
  meetup: '交流会',
  badminton: 'バドミントン',
  futsal: 'フットサル',
  basketball: 'バスケットボール',
  volleyball: 'バレー',
};

const STATUS_LABEL: Record<string, string> = {
  reserved: '予約済み',
  attended: '参加済み',
  waitlisted: 'キャンセル待ち',
  waiting_payment: '支払待ち',
};

// auth状態を3値で管理
type AuthStatus = 'loading' | 'error' | 'ok';

function isLineAuthErrorMessage(message: string): boolean {
  return (
    message.includes('LINEトークン') ||
    message.includes('LIFF認証') ||
    message.includes('Unauthorized')
  );
}

function eventPriceLabel(event: LiffEvent) {
  if (event.priceMale != null && event.priceFemale != null) {
    return `男性 ¥${event.priceMale.toLocaleString()} / 女性 ¥${event.priceFemale.toLocaleString()}`;
  }
  return event.price === 0 ? '無料' : `¥${event.price.toLocaleString()}`;
}

function ReservePageInner() {
  const { tenantId, eventId } = useParams<{ tenantId: string; eventId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const theme = useLiffTheme();
  const accentColor = theme.accentColor;
  // カード背景が白いため、テナントのアクセントカラーが白系だと塗りつぶしボタンが
  // 背景に同化して見えなくなる。その場合は濃色にフォールバックする。
  const solidAccentColor = isLightHexColor(accentColor) ? '#111827' : accentColor;
  const isWaitlist = searchParams.get('waitlist') === '1';

  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState('');
  const [event, setEvent] = useState<LiffEvent | null>(null);
  const [tenant, setTenant] = useState<LiffTenant | null>(null);
  const [lineUserId, setLineUserId] = useState('');
  const [liffProfile, setLiffProfile] = useState<{ displayName: string; pictureUrl?: string } | null>(null);
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [isFriend, setIsFriend] = useState<boolean | null>(null);
  const [loginRequired, setLoginRequired] = useState(false);
  const isPastEvent = event ? new Date(event.heldAt).getTime() < Date.now() : false;
  const isClosed = event ? event.status === 'closed' || isPastEvent : false;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [roster, setRoster] = useState<PublicRoster | null>(null);
  const [myReservation, setMyReservation] = useState<LiffReservation | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const requiresLevel = event?.levelEnabled && event.category !== 'meetup';
  const hasProfile = !!(profile && profile.name && profile.grade && profile.gender && (!requiresLevel || profile.level));

  function restartLineAuth() {
    setError('LINE認証を更新しています。画面が切り替わらない場合は、LINEからもう一度開き直してください。');
    setAuthError('');
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
      if (liff.isLoggedIn()) liff.logout();
    } catch {
      // ignore
    }
    if (!redirectToLiffApp()) {
      liff.login({ redirectUri: window.location.href });
    }
  }

  useEffect(() => {
    async function init() {
      const tenantInfo = await api.liff.tenant(tenantId).catch(() => null);
      if (tenantInfo) setTenant(tenantInfo);

      if (tenantInfo?.reserveActionStyle === 'line' && tenantInfo.reserveLineUrl) {
        window.location.href = tenantInfo.reserveLineUrl;
        return;
      }

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

          const loggedIn = await loginIfNeeded();
          if (!loggedIn) {
            setLoginRequired(true);
            setAuthError(
              'LINEへのログインが必要です。ログインを完了すると予約を続行できます。'
            );
            setAuthStatus('error');
            return;
          }
        }
      } catch (e) {
        setAuthError(`Step2-catch: ${e instanceof Error ? e.message : String(e)}`);
        setAuthStatus('error');
        return;
      }

      // 認証成功 → ループ防止フラグをクリア
      localStorage.removeItem('liff-login-tried');
      localStorage.removeItem('liff-pending-redirect');

      // ── Step 3: userId + LINEプロフィール取得 ──
      let uid = '';
      try {
        const lp = await getLiffProfile();
        uid = lp?.userId ?? '';
        if (lp) setLiffProfile({ displayName: lp.displayName, pictureUrl: lp.pictureUrl });
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
      const [ev, prof, myRes] = await Promise.allSettled([
        api.liff.event(tenantId, eventId),
        api.liff.profile(tenantId, uid).catch(() => null),
        api.liff.myReservation(tenantId, eventId, uid).catch(() => null),
      ]);
      if (ev.status === 'fulfilled') setEvent(ev.value);
      if (prof.status === 'fulfilled') setProfile(prof.value);
      if (myRes.status === 'fulfilled') setMyReservation(myRes.value);

      const profileComplete = prof.status === 'fulfilled' && prof.value?.name && prof.value?.grade && prof.value?.gender;
      const tenantLineId = tenantInfo?.lineChannelId ?? null;
      if (!profileComplete && tenantLineId) {
        const friend = await checkFriendship();
        setIsFriend(friend);
      } else {
        setIsFriend(true);
      }

      setAuthStatus('ok');
    }
    init();
  }, [tenantId, eventId]);

  function refetchRoster() {
    if (!event?.rosterShareEnabled || !event.rosterShareToken) return;
    api.public.roster(event.rosterShareToken).then(setRoster).catch(() => setRoster(null));
  }

  useEffect(() => {
    if (!event?.rosterShareEnabled || !event.rosterShareToken) {
      setRoster(null);
      return;
    }
    refetchRoster();
  }, [event?.rosterShareEnabled, event?.rosterShareToken]);

  // プロフィール未入力ならマイページへ誘導し、入力後にこのページへ戻ってきてもらう
  useEffect(() => {
    if (authStatus !== 'ok' || isFriend !== true || !lineUserId) return;
    if (!hasProfile) {
      const returnTo = `/liff/${tenantId}/events/${eventId}/reserve`;
      const categoryParam = event?.category ? `&category=${encodeURIComponent(event.category)}` : '';
      router.replace(`/liff/${tenantId}/profile?returnTo=${encodeURIComponent(returnTo)}${categoryParam}`);
    }
  }, [authStatus, isFriend, lineUserId, hasProfile, tenantId, eventId, router, event?.category]);

  async function submit() {
    if (!lineUserId || !profile) return;
    setError('');
    setSubmitting(true);
    try {
      setLiffToken(liff.isLoggedIn() ? liff.getIDToken() : null);
      const body = {
        eventId,
        name: profile.name,
        grade: profile.grade,
        gender: profile.gender,
        ...(profile.level && { level: profile.level }),
        ...(profile.comment && { comment: profile.comment }),
        ...(liffProfile?.displayName && { lineDisplayName: liffProfile.displayName }),
        ...(liffProfile?.pictureUrl && { linePictureUrl: liffProfile.pictureUrl }),
      };
      const result = await api.liff.reserve(tenantId, body as any);
      // 予約成功時はリダイレクトループ防止のためlocalStorageを必ずクリア
      localStorage.removeItem('liff-pending-redirect');
      localStorage.removeItem('liff-login-tried');
      if (result.stripeCheckoutUrl) {
        window.location.href = result.stripeCheckoutUrl;
        return;
      }
      if (result.status === 'waiting_payment') {
        setError('Payment checkout is unavailable.');
        return;
      }
      setMyReservation({
        id: result.id,
        status: result.status,
        waitlistOrder: result.waitlistOrder,
        reservedAt: new Date().toISOString(),
      });
      refetchRoster();
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '予約に失敗しました';
      if (isLineAuthErrorMessage(msg)) {
        restartLineAuth();
        return;
      }
      const isDuplicate = msg.includes('予約済み') || msg.includes('同じ日');
      if (isDuplicate) {
        alert('既に予約済みです');
        window.location.href = `/liff/${tenantId}/profile`;
        return;
      }
      setError(msg);
      alert(`予約エラー: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!myReservation) return;
    setCancelling(true);
    try {
      setLiffToken(liff.isLoggedIn() ? liff.getIDToken() : null);
      await api.liff.cancel(tenantId, myReservation.id);
      setMyReservation(null);
      refetchRoster();
    } catch {
      alert('キャンセルに失敗しました');
    } finally {
      setCancelling(false);
    }
  }

  if (event && isClosed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4" style={{ backgroundColor: theme.backgroundColor }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ backgroundColor: hexToRgba(accentColor, 10) }}>⚠️</div>
        <div>
          <p className="text-lg font-bold text-gray-900">このイベントは予約できません</p>
          <p className="text-sm text-gray-500 mt-2">
            {isPastEvent
              ? '開催日時を過ぎたため、受付は終了しました。'
              : 'このイベントは現在受付を終了しています。'}
          </p>
        </div>
        <button
          onClick={() => router.push(`/liff/${tenantId}`)}
          className="font-bold px-8 py-3.5 rounded-2xl text-sm active:opacity-90"
          style={{ backgroundColor: solidAccentColor, color: readableTextColor(solidAccentColor) }}
        >
          イベントページへ戻る
        </button>
      </div>
    );
  }

  // ── ローディング / プロフィール未入力でのマイページ誘導中 ──
  if (authStatus === 'loading' || (authStatus === 'ok' && isFriend === true && !hasProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm" style={{ color: accentColor }}>読み込み中...</div>
      </div>
    );
  }

  // ── 認証エラー（リダイレクトは一切しない・ループ防止） ──
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

  if (authStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-5" style={{ backgroundColor: theme.backgroundColor }}>
        <p className="text-sm text-gray-500">認証に失敗しました。もう一度お試しください。</p>
        {authError && (
          <p className="text-xs text-red-400 bg-red-50 px-3 py-2 rounded-lg font-mono break-all">{authError}</p>
        )}
        {loginRequired ? (
          <button
            onClick={handleLoginRetry}
            className="font-bold px-8 py-3.5 rounded-2xl text-sm active:opacity-90"
            style={{ backgroundColor: solidAccentColor, color: readableTextColor(solidAccentColor) }}
          >
            LINEログインをやり直す
          </button>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="font-bold px-8 py-3.5 rounded-2xl text-sm active:opacity-90"
            style={{ backgroundColor: solidAccentColor, color: readableTextColor(solidAccentColor) }}
          >
            再試行する
          </button>
        )}
      </div>
    );
  }

  // ── 友だち追加が必要 ──
  if (!isFriend) {
    const addFriendUrl = tenant?.lineChannelId
      ? `https://line.me/R/ti/p/@${tenant.lineChannelId}`
      : null;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6" style={{ backgroundColor: theme.backgroundColor }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: hexToRgba(accentColor, 10), color: accentColor }}>
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
            className="font-bold px-8 py-3.5 rounded-2xl text-sm active:opacity-90"
            style={{ backgroundColor: solidAccentColor, color: readableTextColor(solidAccentColor) }}
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

  const categoryLabel = event?.category ? (CATEGORY_LABELS[event.category] ?? event.category) : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="mx-auto min-h-screen max-w-[480px] border-x-0 sm:border-x" style={{ borderColor: theme.borderColor }}>
      <div className="border-b border-gray-100" style={{ backgroundColor: theme.navBg }}>
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push(`/liff/${tenantId}`)} className="text-gray-900 text-xl leading-none">‹</button>
          <h1 className="text-base font-bold flex-1 text-gray-900">{isWaitlist ? 'キャンセル待ち登録' : '予約確認'}</h1>
          <Link href={`/liff/${tenantId}/profile`} className="text-xs font-medium underline underline-offset-2" style={{ color: accentColor }}>
            マイページ
          </Link>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {event && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5">
            <p className="font-bold text-gray-900 text-base">{event.title}</p>
            <div className="space-y-1.5 text-sm text-gray-700">
              {categoryLabel && (
                <p><span className="text-gray-400">カテゴリ：</span>{categoryLabel}</p>
              )}
              <p><span className="text-gray-400">日時：</span>{formatDate(event.heldAt)}</p>
              <p><span className="text-gray-400">場所：</span>{event.location}</p>
              <p><span className="text-gray-400">参加費：</span>{eventPriceLabel(event)}</p>
            </div>
            {event.description && (
              <p className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed pt-1 border-t border-gray-100">{event.description}</p>
            )}
          </div>
        )}

        {event?.rosterShareEnabled && roster && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">参加者名簿 ({roster.reservations.length}人)</p>
            {roster.reservations.length === 0 ? (
              <p className="text-xs text-gray-400">まだ参加者はいません</p>
            ) : (
              <ul className="space-y-2">
                {roster.reservations.map((r, i) => (
                  <li key={i} className="text-xs">
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      <span className="text-gray-400">{i + 1}.</span>
                      {r.linePictureUrl ? (
                        <img src={r.linePictureUrl} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-full bg-gray-200" />
                      )}
                      <span className="font-medium text-gray-900">{r.name ?? '未入力'}</span>
                      {r.comment && <span className="text-gray-400">{r.comment}</span>}
                      <span className="text-gray-500">
                        {[r.grade, r.gender, roster.event.levelEnabled ? r.level : null].filter(Boolean).join(' / ')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {profile && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 mb-1">この情報で予約します</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">お名前</span>
              <span className="font-medium text-gray-900">{profile.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">年齢</span>
              <span className="font-medium text-gray-900">{profile.grade}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">性別</span>
              <span className="font-medium text-gray-900">{profile.gender}</span>
            </div>
            {requiresLevel && profile.level && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">レベル</span>
                <span className="font-medium text-gray-900">{profile.level}</span>
              </div>
            )}
            {profile.comment && (
              <div className="flex justify-between text-sm gap-3">
                <span className="text-gray-500 shrink-0">一言</span>
                <span className="font-medium text-gray-900 text-right">{profile.comment}</span>
              </div>
            )}
            <Link
              href={`/liff/${tenantId}/profile?returnTo=${encodeURIComponent(`/liff/${tenantId}/events/${eventId}/reserve`)}${event?.category ? `&category=${encodeURIComponent(event.category)}` : ''}`}
              className="block text-xs hover:underline pt-1"
              style={{ color: accentColor }}
            >
              情報を変更する →
            </Link>
          </div>
        )}

        {myReservation ? (
          <button
            onClick={() => setConfirmCancelOpen(true)}
            disabled={cancelling}
            className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:opacity-90 transition-colors shadow-sm"
            style={{ backgroundColor: cancelling ? '#ef4444' : '#10b981', color: '#ffffff' }}
          >
            {cancelling ? 'キャンセル中...' : (
              <>
                {STATUS_LABEL[myReservation.status] ?? myReservation.status}
                {myReservation.status === 'waitlisted' && myReservation.waitlistOrder ? `（${myReservation.waitlistOrder}番目）` : ''}
                {' / キャンセルする'}
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => submit()}
            disabled={submitting}
            className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:opacity-90 transition-colors shadow-sm"
            style={{ backgroundColor: solidAccentColor, color: readableTextColor(solidAccentColor) }}
          >
            {submitting ? '送信中...' : isWaitlist ? 'キャンセル待ちに登録する' : 'この情報で予約する'}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancelOpen}
        message="予約をキャンセルしますか？"
        confirmLabel="キャンセルする"
        cancelLabel="戻る"
        accentColor={accentColor}
        danger
        onCancel={() => setConfirmCancelOpen(false)}
        onConfirm={() => { setConfirmCancelOpen(false); handleCancel(); }}
      />
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
