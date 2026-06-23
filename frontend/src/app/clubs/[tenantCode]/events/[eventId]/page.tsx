'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, API_URL, formatDate, LiffEvent, LiffReservation, setLiffToken } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { getLineToken, getLineUser, startLineLogin } from '@/lib/lineLogin';

const LINE_CHANNEL_ID = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID ?? '';

const STATUS_LABEL: Record<string, string> = {
  reserved: '予約済み',
  waitlisted: 'キャンセル待ち',
  waiting_payment: '支払待ち',
};

const URL_SPLIT = /(https?:\/\/[^\s　、。！？」』】〕]+)/g;

function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_SPLIT);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('http') ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#06C755] underline break-all">{part}</a>
        ) : part
      )}
    </>
  );
}

function CalendarIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}
function PinIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
}
function UsersIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function TicketIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /></svg>;
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function PublicEventDetailPage() {
  const { tenantCode, eventId } = useParams<{ tenantCode: string; eventId: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<LiffEvent | null>(null);
  const [myReservation, setMyReservation] = useState<LiffReservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const reservePath = `/clubs/${tenantCode}/events/${eventId}/reserve`;

  useEffect(() => {
    api.public.recordView(eventId).catch(() => {});
    api.liff.event(tenantCode, eventId).then(setEvent).catch(() => {}).finally(() => setLoading(false));

    const token = getLineToken();
    if (token) {
      setLiffToken(token);
      const user = getLineUser();
      if (user) {
        api.liff.myReservation(tenantCode, eventId, user.userId).then(setMyReservation).catch(() => {});
      }
    }
  }, [tenantCode, eventId]);

  function handleReserveClick() {
    const token = getLineToken();
    if (token) {
      setLiffToken(token);
      router.push(reservePath);
    } else {
      const isWaitlist = event?.capacity != null && event.reservedCount >= event.capacity;
      startLineLogin(LINE_CHANNEL_ID, `${reservePath}${isWaitlist ? '?waitlist=1' : ''}`);
    }
  }

  async function handleCancel() {
    if (!myReservation) return;
    if (!confirm('予約をキャンセルしますか？')) return;
    setCancelling(true);
    try {
      await api.liff.cancel(tenantCode, myReservation.id);
      setMyReservation(null);
    } catch {
      alert('キャンセルに失敗しました');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <Link href={`/clubs/${tenantCode}/reserve`} className="text-gray-600 p-1 -ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </Link>
          <div className="h-4 w-40 bg-[#06C755]/20 rounded-full animate-pulse" />
        </div>
        <div className="aspect-[4/5] w-full bg-gray-200 animate-pulse" />
        <div className="px-4 py-5 space-y-4">
          <div className="h-5 bg-gray-200 rounded-full animate-pulse w-3/4" />
          <div className="h-3 bg-gray-200 rounded-full animate-pulse w-1/3" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <p className="text-gray-400 text-sm">イベントが見つかりません</p>
        <Link href={`/clubs/${tenantCode}/reserve`} className="text-[#06C755] text-sm font-medium">一覧に戻る</Link>
      </div>
    );
  }

  const isFull = event.capacity != null && event.reservedCount >= event.capacity;
  const isPastEvent = new Date(event.heldAt).getTime() < Date.now();
  const isClosed = event.status === 'closed' || isPastEvent;
  const remaining = event.capacity != null ? event.capacity - event.reservedCount : null;
  const reviews = (event as any).reviews ?? [];
  const heroImg = imgUrl(event.imageUrl, API_URL);

  return (
    <div className="min-h-screen bg-white pb-52">
      <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href={`/clubs/${tenantCode}/reserve`} className="text-gray-600 p-1 -ml-1 shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </Link>
        <h1 className="text-[16px] font-bold text-gray-900 flex-1 truncate">{event.title}</h1>
      </div>

      {heroImg ? (
        <div className="relative">
          <Image src={heroImg} alt={event.title} width={1200} height={1500} className="w-full aspect-[4/5] object-cover" unoptimized />
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

      <div className="px-4 pt-5 pb-2">
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
          {myReservation && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#06C755] text-white">
              {STATUS_LABEL[myReservation.status] ?? myReservation.status}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 pb-8">
        <div className="divide-y divide-gray-100 rounded-xl bg-white ring-1 ring-gray-100 shadow-sm px-4">
          <InfoRow icon={<CalendarIcon />}>
            <p className="text-sm font-medium text-gray-900">{formatDate(event.heldAt)}</p>
            {event.endAt && <p className="text-xs text-gray-400 mt-0.5">〜 {formatDate(event.endAt)}</p>}
          </InfoRow>
          <InfoRow icon={<PinIcon />}>
            {event.locationUrl ? (
              <a href={event.locationUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#06C755] underline">{event.location}</a>
            ) : (
              <p className="text-sm font-medium text-gray-900">{event.location}</p>
            )}
          </InfoRow>
          {event.capacity != null && (
            <InfoRow icon={<UsersIcon />}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{event.reservedCount} / {event.capacity}人</p>
                {remaining !== null && remaining <= 0 && <span className="text-xs text-red-500 font-medium">満席</span>}
              </div>
              {remaining !== null && remaining > 0 && (
                <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#06C755] h-1.5 rounded-full transition-all" style={{ width: `${(event.reservedCount / event.capacity) * 100}%` }} />
                </div>
              )}
            </InfoRow>
          )}
          {event.description && (
            <InfoRow icon={<TicketIcon />}>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed"><Linkified text={event.description} /></p>
            </InfoRow>
          )}
        </div>

        {reviews.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-bold text-gray-700 mb-3">参加者の感想</p>
            <div className="space-y-2">
              {reviews.map((r: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-sm text-gray-700 leading-relaxed">{r.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 固定フッター */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-100 px-4 py-3 pb-safe space-y-2">
        {myReservation ? (
          <>
            <div className="text-center text-sm font-bold text-[#06C755]">{STATUS_LABEL[myReservation.status] ?? '予約済み'}</div>
            {myReservation.status !== 'cancelled' && (
              <button onClick={handleCancel} disabled={cancelling}
                className="w-full border border-gray-200 text-gray-600 py-3 rounded-2xl text-sm font-medium disabled:opacity-50">
                {cancelling ? 'キャンセル中...' : '予約をキャンセル'}
              </button>
            )}
          </>
        ) : isClosed ? (
          <div className="text-center text-sm text-gray-400 py-2">受付は終了しました</div>
        ) : (
          <button onClick={handleReserveClick}
            className="w-full bg-[#06C755] text-white py-4 rounded-2xl font-bold text-base active:bg-[#05a847] transition-colors shadow-sm">
            {isFull ? 'キャンセル待ちに登録する' : 'LINEログインして予約する'}
          </button>
        )}
      </div>
    </div>
  );
}
