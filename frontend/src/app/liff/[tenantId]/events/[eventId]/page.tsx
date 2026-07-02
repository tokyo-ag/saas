'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, API_URL, formatDate, LiffEvent, LiffReservation } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { initLiff, getLiffUserId, liff } from '@/lib/liff';
import { FriendInviteCard } from '@/components/liff/FriendInviteCard';
import LiffBottomNav from '@/components/liff/LiffBottomNav';


const STATUS_LABEL: Record<string, string> = {
  reserved: '予約済み',
  waitlisted: 'キャンセル待ち',
  waiting_payment: '支払待ち',
};

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

const URL_SPLIT = /(https?:\/\/[^\s　、。！？」』】〕]+)/g;

function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_SPLIT);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('http://') || part.startsWith('https://') ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#06C755] underline break-all">
            {part}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
}

function useLineBrowserBottomPad() {
  const [pad, setPad] = useState(0);

  useEffect(() => {
    if (/Line\//i.test(navigator.userAgent) && !window.location.href.includes('liff.line.me')) {
      setPad(49);
    }
  }, []);

  return pad;
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function TicketIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
    </svg>
  );
}
function TextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
    </svg>
  );
}

export default function LiffEventDetailPage() {
  const { tenantId, eventId } = useParams<{ tenantId: string; eventId: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<LiffEvent | null>(null);
  const [myReservation, setMyReservation] = useState<LiffReservation | null>(null);
  const [lineUserId, setLineUserId] = useState('');
  const [myReview, setMyReview] = useState<{ content: string; isPublished?: boolean } | null>(null);
  const [reviewContent, setReviewContent] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const lineBrowserBottomPad = useLineBrowserBottomPad();

  useEffect(() => {
    async function load() {
      api.public.recordView(eventId).catch(() => {});
      const cacheKey = `liff_event_${tenantId}_${eventId}`;
      let evt: LiffEvent;
      try {
        evt = await api.liff.event(tenantId, eventId);
        setEvent(evt);
        localStorage.setItem(cacheKey, JSON.stringify(evt));
      } catch {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          evt = JSON.parse(cached) as LiffEvent;
          setEvent(evt);
          setIsOffline(true);
        }
        return;
      }
      const liffOk = await initLiff();
      if (liffOk && liff.isLoggedIn()) {
        const uid = await getLiffUserId();
        if (uid) {
          setLineUserId(uid);
          const res = await api.liff.myReservation(tenantId, eventId, uid);
          setMyReservation(res);
          const review = await api.liff.myReview(tenantId, eventId, uid).catch(() => null);
          setMyReview(review);
          if (review?.content) setReviewContent(review.content);
        }
      }
    }
    load().catch(console.error).finally(() => setLoading(false));
  }, [tenantId, eventId]);

  async function handleCancel() {
    if (!myReservation) return;
    if (!confirm('予約をキャンセルしますか？')) return;
    setCancelling(true);
    try {
      await api.liff.cancel(tenantId, myReservation.id);
      setMyReservation(null);
    } catch {
      alert('キャンセルに失敗しました');
    } finally {
      setCancelling(false);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    const content = reviewContent.trim();
    if (!lineUserId || content.length < 5 || submittingReview) return;
    setSubmittingReview(true);
    try {
      const review = await api.liff.submitReview(tenantId, eventId, lineUserId, content);
      setMyReview(review);
      alert('感想を送信しました。掲載前に主催者が確認します。');
    } catch (err) {
      alert(err instanceof Error ? err.message : '感想の送信に失敗しました');
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3">
          <button onClick={() => router.push(`/liff/${tenantId}`)} className="text-gray-600 p-1 -ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="h-4 w-40 bg-[#06C755]/20 rounded-full animate-pulse" />
        </div>
        <div className="px-4 py-4">
          <div className="mx-auto max-w-3xl rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="space-y-3">
              <div className="h-5 w-11/12 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-4 w-1/2 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <p className="text-gray-400 text-sm">イベントが見つかりません</p>
        <button onClick={() => router.push(`/liff/${tenantId}`)} className="text-[#06C755] text-sm font-medium">ホームに戻る</button>
      </div>
    );
  }

  const isFull = event.capacity != null && event.reservedCount >= event.capacity;
  const isPastEvent = new Date(event.heldAt).getTime() < Date.now();
  const isClosed = event.status === 'closed' || isPastEvent;
  const remaining = event.capacity != null ? event.capacity - event.reservedCount : null;
  const canReview = !!myReservation && ['reserved', 'attended'].includes(myReservation.status) && isPastEvent;
  const reviews = event.reviews ?? [];

  return (
    <div
      className="min-h-screen bg-white"
      style={{ paddingBottom: `calc(12rem + ${lineBrowserBottomPad}px + env(safe-area-inset-bottom))` }}
    >
      {/* header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => router.push(`/liff/${tenantId}`)} className="text-gray-600 p-1 -ml-1 shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <h1 className="text-[16px] font-bold text-gray-900 flex-1 truncate">{event.title}</h1>
      </div>
      {isOffline && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 text-center">
          現在サーバーに接続できません。以前に読み込んだ情報を表示しています。
        </div>
      )}

      {/* overview */}
      <div className="px-4 py-4">
        <section className="mx-auto flex max-w-3xl items-start gap-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className={`relative aspect-[4/5] w-[42%] min-w-32 max-w-[280px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#06C755]/20 to-[#06C755]/5 ${event.imageUrl ? '' : 'hidden'}`}>
            {event.imageUrl ? (
              <Image
                src={imgUrl(event.imageUrl, API_URL)!}
                alt={event.title}
                fill
                sizes="(max-width: 640px) 42vw, 280px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-xs font-bold tracking-[0.18em] text-[#06C755]">COMIU</span>
              </div>
            )}
            {(isFull || isClosed) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-800">
                  {isClosed ? '受付終了' : '満席'}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 py-0.5">
            <h2 className="text-[19px] font-bold leading-snug text-gray-900">
              {event.title}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {remaining !== null && remaining <= 5 && remaining > 0 && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">残り{remaining}席</span>
              )}
              {isFull && !isClosed && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-500">満席</span>
              )}
            </div>
            <div className="mt-3 grid gap-2 rounded-2xl bg-gray-50 p-3 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-gray-400"><CalendarIcon /></span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-400">日時</p>
                  <p className="font-medium text-gray-800">{formatDate(event.heldAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-gray-400"><PinIcon /></span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-400">場所</p>
                  {event.locationUrl ? (
                    <a href={event.locationUrl} target="_blank" rel="noopener noreferrer" className="break-words font-medium text-[#06C755] underline">
                      {event.location}
                    </a>
                  ) : (
                    <p className="break-words font-medium text-gray-800">{event.location}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-gray-400"><UsersIcon /></span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-400">定員</p>
                  <p className="font-medium text-gray-800">
                    {event.capacity ? `${event.reservedCount}/${event.capacity}名・残り${Math.max(0, remaining ?? 0)}名` : '定員なし'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-gray-400"><TicketIcon /></span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-400">参加費</p>
                  <p className="font-bold text-gray-900">
                    {event.priceMale != null && event.priceFemale != null
                      ? `男性 ¥${event.priceMale.toLocaleString()} / 女性 ¥${event.priceFemale.toLocaleString()}`
                      : event.price === 0
                        ? '無料'
                        : `¥${event.price.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </div>
            {event.description && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <h3 className="mb-2 text-sm font-bold text-gray-900">イベント詳細</h3>
                <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                  <Linkified text={event.description} />
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="hidden">
      {/* hero image */}
      {event.imageUrl ? (
        <div className="relative">
          <Image src={imgUrl(event.imageUrl, API_URL)!} alt={event.title} width={1200} height={1500} className="w-full aspect-[4/5] object-cover" unoptimized />
          {(isFull || isClosed) && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white/90 text-gray-800 text-sm font-bold px-4 py-1.5 rounded-full">
                {isClosed ? '受付終了' : '満席'}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[4/5] w-full bg-gradient-to-br from-[#06C755]/20 to-[#06C755]/5 flex items-center justify-center">
          <span className="text-5xl">🎉</span>
        </div>
      )}

      </div>

      {/* title + quick badges */}
      <div className="hidden">
        <h2 className="text-[18px] font-bold text-gray-900 leading-snug mb-3">{event.title}</h2>
        <div className="flex flex-wrap gap-2">
          {event.priceMale != null && event.priceFemale != null ? (
            <>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">男性 ¥{event.priceMale.toLocaleString()}</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">女性 ¥{event.priceFemale.toLocaleString()}</span>
            </>
          ) : (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${event.price === 0 ? 'bg-green-50 text-[#06C755]' : 'bg-gray-100 text-gray-600'}`}>
              {event.price === 0 ? '無料' : `¥${event.price.toLocaleString()}`}
            </span>
          )}
          {remaining !== null && remaining <= 5 && remaining > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">残り{remaining}席</span>
          )}
          {isFull && !isClosed && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-500">満席</span>
          )}
          {myReservation && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#06C755]/10 text-[#06C755]">
              {STATUS_LABEL[myReservation.status] ?? myReservation.status}
              {myReservation.status === 'waitlisted' && myReservation.waitlistOrder && `（${myReservation.waitlistOrder}番目）`}
            </span>
          )}
        </div>
      </div>

      {/* info rows */}
      <div className="hidden">
        <div className="hidden">
        <InfoRow icon={<CalendarIcon />}>
          <p className="text-sm font-medium text-gray-900">{formatDate(event.heldAt)}</p>
        </InfoRow>
        <InfoRow icon={<PinIcon />}>
          {event.locationUrl ? (
            <a href={event.locationUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#06C755] underline">
              {event.location}
            </a>
          ) : (
            <p className="text-sm font-medium text-gray-900">{event.location}</p>
          )}
        </InfoRow>
        <InfoRow icon={<UsersIcon />}>
          <p className="text-sm font-medium text-gray-900">
            {event.capacity
              ? `定員 ${event.capacity}人・残り ${Math.max(0, remaining ?? 0)} 席`
              : '定員なし'}
          </p>
          {event.reservedCount > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{event.reservedCount}人が予約済み</p>
          )}
        </InfoRow>
        </div>
        <InfoRow icon={<TicketIcon />}>
          {event.priceMale != null && event.priceFemale != null ? (
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-gray-900">
                男性 ¥{event.priceMale.toLocaleString()} / 女性 ¥{event.priceFemale.toLocaleString()}
              </p>
            </div>
          ) : (
            <p className={`text-sm font-bold ${event.price === 0 ? 'text-[#06C755]' : 'text-gray-900'}`}>
              {event.price === 0 ? '参加無料' : `¥${event.price.toLocaleString()}`}
            </p>
          )}
          {event.paymentRequired && <p className="text-xs text-gray-400 mt-0.5">事前決済が必要です</p>}
        </InfoRow>
        {event.description && (
          <InfoRow icon={<TextIcon />}>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              <Linkified text={event.description} />
            </p>
          </InfoRow>
        )}
      </div>

      {myReservation && (
        <div className="px-4 mt-5">
          <FriendInviteCard
            tenantId={tenantId}
            eventId={eventId}
            title={event.title}
            heldAt={event.heldAt}
            location={event.location}
          />
        </div>
      )}

      {(reviews.length > 0 || canReview) && (
        <section className="px-4 mt-5 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">参加者の声</h2>
            <p className="text-xs text-gray-400 mt-0.5">初めて参加する人の参考になる一言を掲載しています</p>
          </div>

          {reviews.length > 0 && (
            <div className="space-y-2">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{review.content}</p>
                  <p className="mt-2 text-[11px] text-gray-400">
                    {review.memberName ?? '参加者'}{review.memberGrade ? ` / ${review.memberGrade}` : ''}
                  </p>
                </article>
              ))}
            </div>
          )}

          {canReview && (
            <form onSubmit={handleSubmitReview} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
              <div>
                <p className="text-sm font-bold text-gray-900">感想を書く</p>
                <p className="text-xs text-gray-400 mt-0.5">掲載する場合は主催者が確認します</p>
              </div>
              <textarea
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                maxLength={300}
                rows={4}
                placeholder="例）一人参加でしたが、20代が多くて話しやすかったです。初心者でも楽しめました。"
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-gray-400">{reviewContent.trim().length}/300</span>
                <button
                  type="submit"
                  disabled={reviewContent.trim().length < 5 || submittingReview}
                  className="rounded-xl bg-[#06C755] px-4 py-2 text-sm font-bold text-white disabled:opacity-40 active:bg-[#05a847]"
                >
                  {submittingReview ? '送信中...' : myReview ? '更新する' : '送信する'}
                </button>
              </div>
              {myReview && (
                <p className="text-[11px] text-gray-400">
                  {myReview.isPublished ? 'この感想は公開中です。更新すると再確認待ちになります。' : '送信済みです。主催者の確認後に公開されます。'}
                </p>
              )}
            </form>
          )}
        </section>
      )}

      {/* bottom action bar — sits above LiffBottomNav */}
      <div
        className="fixed left-0 right-0 z-40 bg-white border-t border-gray-100 px-4 py-3"
        style={{ bottom: `calc(56px + ${lineBrowserBottomPad}px + env(safe-area-inset-bottom))` }}
      >
        {myReservation ? (
          <div className="space-y-2">
            <p className="text-center text-sm font-semibold text-[#06C755]">
              {STATUS_LABEL[myReservation.status] ?? myReservation.status}
              {myReservation.status === 'waitlisted' && myReservation.waitlistOrder && (
                <span className="text-gray-400 font-normal ml-1">（{myReservation.waitlistOrder}番目）</span>
              )}
            </p>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full border border-red-200 text-red-400 py-3 rounded-2xl text-sm font-medium active:bg-red-50 disabled:opacity-50"
            >
              {cancelling ? 'キャンセル中...' : '予約をキャンセルする'}
            </button>
          </div>
        ) : isClosed ? (
          <button disabled className="w-full bg-gray-100 text-gray-400 py-3 rounded-2xl text-sm font-medium">受付終了</button>
        ) : isFull && event.paymentRequired ? (
          <button disabled className="w-full bg-gray-100 text-gray-400 py-3 rounded-2xl text-sm font-medium">満席</button>
        ) : isFull ? (
          <button
            onClick={() => router.push(`/liff/${tenantId}/events/${eventId}/reserve?waitlist=1`)}
            className="w-full bg-amber-400 text-white py-3 rounded-2xl font-bold active:bg-amber-500"
          >
            キャンセル待ちに登録する
          </button>
        ) : (
          <button
            onClick={() => router.push(`/liff/${tenantId}/events/${eventId}/reserve`)}
            className="w-full bg-[#06C755] text-white py-3 rounded-2xl font-bold active:bg-[#05a847]"
          >
            予約する
          </button>
        )}
      </div>

      <LiffBottomNav tenantId={tenantId} />
    </div>
  );
}
