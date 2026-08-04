'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, API_URL, LiffEvent, LiffProfile, LiffReservation, LiffTenant, PublicRoster, setLiffToken, formatDate } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { DEFAULT_EVENT_IMAGE } from '@/lib/defaultImages';
import {
  initLiff,
  getLiffProfile,
  checkFriendship,
  liff,
  getInitError,
  loginIfNeeded,
  redirectToLiffApp,
  hasRecentLoginAttempt,
  isLiffLoggedIn,
} from '@/lib/liff';
import { useLiffTheme, hexToRgba, readableTextColor, isLightHexColor } from '@/components/liff/LiffThemeProvider';
import { LiffToast } from '@/components/liff/LiffToast';

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
  const [showLoginToast, setShowLoginToast] = useState(false);
  const isPastEvent = event ? new Date(event.heldAt).getTime() < Date.now() : false;
  const isClosed = event ? event.status === 'closed' || isPastEvent : false;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [roster, setRoster] = useState<PublicRoster | null>(null);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [expandedComment, setExpandedComment] = useState<number | null>(null);
  const [myReservation, setMyReservation] = useState<LiffReservation | null>(null);

  const requiresLevel = event?.levelEnabled;
  const hasProfile = !!(profile && profile.name && profile.grade && profile.gender && (!requiresLevel || profile.level));
  const effectiveActionStyle = event?.reserveActionStyle || tenant?.reserveActionStyle;
  const isLineMode = effectiveActionStyle === 'line' && !!tenant?.reserveLineUrl;

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
      if (isLiffLoggedIn()) liff.logout();
    } catch {
      // ignore
    }
    // liff.line.me経由だとLINEアプリを強制的に開こうとするため、
    // ブラウザ内で完結するliff.login()を優先する。
    try {
      liff.login({ redirectUri: window.location.href });
    } catch {
      if (!redirectToLiffApp()) window.location.reload();
    }
  }

  useEffect(() => {
    async function init() {
      const tenantInfo = await api.liff.tenant(tenantId).catch(() => null);
      if (tenantInfo) setTenant(tenantInfo);
      const ev = await api.liff.event(tenantId, eventId).catch(() => null);
      const effectiveActionStyle = ev?.reserveActionStyle || tenantInfo?.reserveActionStyle;

      // LINE直通イベント/テナントはLIFFログイン自体が不要。認証なしで詳細だけ見せて、
      // 最後のボタンでLINEに送る。
      if (effectiveActionStyle === 'line' && tenantInfo?.reserveLineUrl) {
        if (ev) setEvent(ev);
        setIsFriend(true);
        setAuthStatus('ok');
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
        if (!isLiffLoggedIn()) {
          if (liff.isInClient()) {
            // LINEアプリ内で未認証 = LIFF設定エラー。
            // liff.login()を呼ぶとDISCOVERタブ→ループになるので呼ばない。
            setAuthError('Step2: LINEアプリ内で未認証（LIFF設定確認要）');
            setAuthStatus('error');
            return;
          }

          const alreadyTried = hasRecentLoginAttempt();
          const loggedIn = await loginIfNeeded();
          if (!loggedIn) {
            setLoginRequired(true);
            setAuthError(
              alreadyTried
                ? 'LINEログインが完了できませんでした。Safariなどのブラウザで直接開いている場合、LINEアプリ内でこのリンクを開き直してください。'
                : 'LINEへのログインが必要です。ログインを完了すると予約を続行できます。'
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

      // 認証成功 → ループ防止フラグをクリア（直前にログインを試みていた＝今回新規にログインできた合図）
      if (localStorage.getItem('liff-login-tried')) {
        setShowLoginToast(true);
        setTimeout(() => setShowLoginToast(false), 2000);
      }
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
        api.liff.profile(tenantId, uid),
        api.liff.myReservation(tenantId, eventId, uid).catch(() => null),
      ]);
      if (ev.status === 'fulfilled') setEvent(ev.value);
      if (prof.status === 'fulfilled') {
        setProfile(prof.value);
      } else {
        const msg = prof.reason instanceof Error ? prof.reason.message : String(prof.reason);
        if (isLineAuthErrorMessage(msg)) {
          // トークンが一時的に古い可能性があるので、取り直して一度だけ再試行する。
          // それでも失敗する場合のみ再認証（ログイン画面）に進む＝二重ログイン要求を避ける。
          setLiffToken(isLiffLoggedIn() ? liff.getIDToken() : null);
          const retryProf = await api.liff.profile(tenantId, uid).catch(() => null);
          if (retryProf) {
            setProfile(retryProf);
          } else {
            restartLineAuth();
            return;
          }
        } else {
          // 本当に初回でプロフィールが無い場合（404）はnullのまま進める。
          setProfile(null);
        }
      }
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
      router.replace(`/liff/${tenantId}/profile?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [authStatus, isFriend, lineUserId, hasProfile, tenantId, eventId, router]);

  async function submit() {
    if (!lineUserId || !profile) return;
    setError('');
    setSubmitting(true);
    try {
      setLiffToken(isLiffLoggedIn() ? liff.getIDToken() : null);
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
  if (authStatus === 'loading' || (authStatus === 'ok' && isFriend === true && !hasProfile && !isLineMode)) {
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
    // liff.line.me経由だとLINEアプリを強制的に開こうとするため、
    // ブラウザ内で完結するliff.login()を優先する。
    try {
      liff.login({ redirectUri: window.location.href });
    } catch {
      if (!redirectToLiffApp()) window.location.reload();
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
            onClick={restartLineAuth}
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
    const addFriendUrl = tenant?.contactUrl?.trim() || null;
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

  return (
    <div className="min-h-screen sm:bg-gray-200 animate-page-in" style={{ backgroundColor: theme.backgroundColor }}>
      <LiffToast show={showLoginToast} message="ログインしました" />
      <div className="mx-auto w-full max-w-[480px] sm:my-8 sm:overflow-hidden sm:rounded-3xl sm:shadow-2xl" style={{ backgroundColor: theme.backgroundColor, minHeight: '100dvh' }}>
      <div className="sticky top-0 z-10 border-b border-gray-100" style={{ backgroundColor: theme.navBg }}>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Link
            href={`/liff/${tenantId}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold shadow-sm active:opacity-90"
            style={{ backgroundColor: solidAccentColor, color: readableTextColor(solidAccentColor) }}
          >
            <span>📅</span>
            <span>日程表一覧</span>
          </Link>
          <Link
            href={`/liff/${tenantId}/profile`}
            className="flex shrink-0 items-center gap-1.5 -m-2 p-2 rounded-xl active:bg-black/5"
            aria-label="マイページ"
          >
            {liffProfile?.pictureUrl ? (
              <Image src={liffProfile.pictureUrl} width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" unoptimized />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
            )}
            <div className="text-right">
              <p className="text-[13px] font-bold text-gray-900 leading-tight">マイページ</p>
              <p className="text-[10px] text-gray-800 leading-tight">ログイン中</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {isWaitlist && (
          <div className="rounded-xl px-4 py-2.5 text-sm font-bold text-center" style={{ backgroundColor: hexToRgba(accentColor, 10), color: solidAccentColor }}>
            キャンセル待ち登録
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {event && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {event.imageUrl && (
              <div className="relative aspect-[4/5] w-full bg-gray-100">
                <Image src={imgUrl(event.imageUrl, API_URL) ?? DEFAULT_EVENT_IMAGE} alt={event.title} fill className="object-cover" unoptimized />
              </div>
            )}
            <div className="p-4 space-y-3">
              {event.category && (
                <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: hexToRgba(accentColor, 10), color: solidAccentColor }}>
                  {event.category}
                </span>
              )}
              <p className="font-bold text-gray-900 text-base leading-snug">{event.title}</p>
              <div className="grid gap-2 rounded-2xl bg-gray-50 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-xs text-gray-400">日時</span>
                  <p className="text-gray-800">{formatDate(event.heldAt)}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-xs text-gray-400">場所</span>
                  <p className="text-gray-800">
                    {myReservation && (myReservation.status === 'reserved' || myReservation.status === 'attended')
                      ? event.location
                      : event.locationHint || event.location}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-xs text-gray-400">参加費</span>
                  <p className="font-semibold text-gray-900">{eventPriceLabel(event)}</p>
                </div>
              </div>
              {event.description && (
                <p className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed pt-1 border-t border-gray-100">{event.description}</p>
              )}
            </div>
          </div>
        )}

        {event?.rosterShareEnabled && roster && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <button
              type="button"
              onClick={() => setRosterOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            >
              <span className="text-sm font-bold text-gray-900">参加者名簿をみる（{roster.reservations.length}人）</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${rosterOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {rosterOpen && (
            <div className="px-4 pb-4">
            {roster.reservations.length === 0 ? (
              <p className="text-xs text-gray-400">まだ参加者はいません</p>
            ) : (
              <ul className="space-y-2">
                {roster.reservations.map((r, i) => (
                  <li key={i} className="text-xs">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="shrink-0 text-gray-400">{i + 1}.</span>
                      {r.linePictureUrl ? (
                        <img src={r.linePictureUrl} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-full bg-gray-200" />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium text-gray-900">{r.name ?? '未入力'}</span>
                      {r.comment && (
                        <button
                          type="button"
                          onClick={() => setExpandedComment(expandedComment === i ? null : i)}
                          className="shrink-0 text-gray-300"
                          aria-label="一言を表示"
                        >
                          💬
                        </button>
                      )}
                      <span className="shrink-0 text-gray-500">
                        {[r.grade, r.gender, roster.event.levelEnabled ? r.level : null].filter(Boolean).join(' / ')}
                      </span>
                    </div>
                    {r.comment && expandedComment === i && (
                      <p className="mt-0.5 pl-5 text-gray-400">{r.comment}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            </div>
            )}
          </div>
        )}

        {myReservation ? (
          <div className="w-full rounded-2xl py-4 text-center shadow-sm" style={{ backgroundColor: '#10b981' }}>
            <p className="font-bold text-base text-white">
              {myReservation.status === 'reserved' ? '予約完了！' : STATUS_LABEL[myReservation.status] ?? myReservation.status}
              {myReservation.status === 'waitlisted' && myReservation.waitlistOrder ? `（${myReservation.waitlistOrder}番目）` : ''}
            </p>
            <p className="mt-1 text-xs text-white/80">キャンセルはマイページから</p>
          </div>
        ) : isLineMode ? (
          <a
            href={tenant?.reserveLineUrl ?? ''}
            className="block w-full py-4 rounded-2xl font-bold text-base text-center active:opacity-90 transition-colors shadow-sm"
            style={{ backgroundColor: solidAccentColor, color: readableTextColor(solidAccentColor) }}
          >
            LINEで友達追加して予約する
          </a>
        ) : (
          <button
            onClick={() => submit()}
            disabled={submitting}
            className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:opacity-90 transition-colors shadow-sm"
            style={{ backgroundColor: solidAccentColor, color: readableTextColor(solidAccentColor) }}
          >
            {submitting ? '送信中...' : isWaitlist ? 'キャンセル待ちに登録する' : '予約する'}
          </button>
        )}
      </div>
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
