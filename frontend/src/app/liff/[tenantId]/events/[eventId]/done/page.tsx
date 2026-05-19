'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { api, formatDate, LiffEvent } from '@/lib/api';
import { initLiff } from '@/lib/liff';
import { FriendInviteCard } from '@/components/liff/FriendInviteCard';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comiu.vercel.app';

function ShareEventCard({ tenantCode, eventId, title }: { tenantCode: string; eventId: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}/e/${tenantCode}/${eventId}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="w-full max-w-sm bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-bold text-gray-900 mb-1">公開ページをシェア</p>
      <p className="text-xs text-gray-500 mb-3">LINEに登録していない友達にもURLで共有できます</p>
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs font-mono text-gray-600">
          {url}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-lg bg-[#06C755] px-4 py-2 text-xs font-bold text-white hover:bg-[#05a847] active:bg-[#05a847]"
        >
          {copied ? 'コピー済み ✓' : 'コピー'}
        </button>
      </div>
    </section>
  );
}

function DonePageInner() {
  const { tenantId, eventId } = useParams<{ tenantId: string; eventId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get('status');
  const order = searchParams.get('order');

  const [event, setEvent] = useState<LiffEvent | null>(null);
  const [tenantCode, setTenantCode] = useState<string | null>(null);

  useEffect(() => {
    initLiff();
    api.liff.event(tenantId, eventId).then((ev) => {
      setEvent(ev);
    }).catch(console.error);
    // fetch tenant code from public endpoint
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://comiu.up.railway.app'}/api/public/events/${eventId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d?.tenantCode && setTenantCode(d.tenantCode))
      .catch(() => {});
  }, [tenantId, eventId]);

  const isWaitlist = status === 'waitlisted';

  function handleClose() {
    router.push(`/liff/${tenantId}`);
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 text-center">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-6 ${isWaitlist ? 'bg-yellow-100' : 'bg-[#06C755]/10'}`}>
        {isWaitlist ? '⏳' : '✓'}
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">
        {isWaitlist ? `キャンセル待ち\n${order}番目に登録しました` : 'ご予約ありがとうございます！'}
      </h1>
      {!isWaitlist && <p className="text-sm text-gray-500 mb-6">予約確認メッセージをLINEで送りました</p>}

      {event && (
        <div className="w-full max-w-sm mt-2 mb-8 space-y-3">
          <div className="bg-white/85 rounded-2xl border border-gray-100 shadow-sm p-5 text-left space-y-2">
            <p className="font-semibold text-gray-900 text-sm">{event.title}</p>
            <p className="text-xs text-gray-500">📅 {formatDate(event.heldAt)}</p>
            <p className="text-xs text-gray-500">📍 {event.location}</p>
          </div>
          <FriendInviteCard
            tenantId={tenantId}
            eventId={eventId}
            title={event.title}
            heldAt={event.heldAt}
            location={event.location}
          />
          {tenantCode && (
            <ShareEventCard tenantCode={tenantCode} eventId={eventId} title={event.title} />
          )}
        </div>
      )}

      <button
        onClick={handleClose}
        className="w-full max-w-sm bg-[#06C755] text-white py-4 rounded-2xl font-bold text-base active:bg-[#05a847] transition-colors shadow-sm"
      >
        イベント一覧に戻る
      </button>
    </div>
  );
}

export default function DonePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#06C755] text-sm">読み込み中...</div>
      </div>
    }>
      <DonePageInner />
    </Suspense>
  );
}
