'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { api, formatDate, LiffEvent } from '@/lib/api';
import { initLiff } from '@/lib/liff';
import { FriendInviteCard } from '@/components/liff/FriendInviteCard';

function DonePageInner() {
  const { tenantId, eventId } = useParams<{ tenantId: string; eventId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get('status');
  const order = searchParams.get('order');

  const [event, setEvent] = useState<LiffEvent | null>(null);

  useEffect(() => {
    initLiff();
    api.liff.event(tenantId, eventId).then(setEvent).catch(console.error);
  }, [tenantId, eventId]);

  const isWaitlist = status === 'waitlisted';

  function handleClose() {
    router.push(`/liff/${tenantId}`);
  }

  return (
    <div className="min-h-screen bg-[var(--cp-5)] flex flex-col items-center justify-center px-6 text-center">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-6 ${isWaitlist ? 'bg-yellow-100' : 'bg-[var(--cp-10)]'}`}>
        {isWaitlist ? '⏳' : '✓'}
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">
        {isWaitlist ? `キャンセル待ち\n${order}番目に登録しました` : 'ご予約ありがとうございます！'}
      </h1>
      {!isWaitlist && <p className="text-sm text-gray-500 mb-6">予約確認メッセージをLINEで送りました</p>}

      {event && (
        <div className="w-full max-w-sm mt-2 mb-8 space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left space-y-2">
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
        </div>
      )}

      <button
        onClick={handleClose}
        className="w-full max-w-sm bg-[var(--cp)] text-white py-4 rounded-2xl font-bold text-base active:bg-[var(--cp-h)] transition-colors shadow-sm"
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
        <div className="text-[var(--cp)] text-sm">読み込み中...</div>
      </div>
    }>
      <DonePageInner />
    </Suspense>
  );
}
