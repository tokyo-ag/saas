'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, formatDate, LiffEvent } from '@/lib/api';

export default function DonePage() {
  const { tenantId, eventId } = useParams<{ tenantId: string; eventId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get('status');
  const order = searchParams.get('order');

  const [event, setEvent] = useState<LiffEvent | null>(null);

  useEffect(() => {
    apiFetch<LiffEvent>(`/liff/${tenantId}/events/${eventId}`).then(setEvent).catch(console.error);
  }, [tenantId, eventId]);

  const isWaitlist = status === 'waitlisted';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-6">{isWaitlist ? '⏳' : '✅'}</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">
        {isWaitlist
          ? `キャンセル待ち${order}番目に登録しました`
          : 'ご予約ありがとうございます！'}
      </h1>

      {event && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 w-full max-w-sm mt-4 text-left space-y-2">
          <p className="font-semibold text-gray-900">{event.title}</p>
          <p className="text-sm text-gray-600">📅 {formatDate(event.heldAt)}</p>
          <p className="text-sm text-gray-600">📍 {event.location}</p>
        </div>
      )}

      <button
        onClick={() => router.push(`/liff/${tenantId}`)}
        className="mt-8 bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium active:bg-indigo-700"
      >
        イベント一覧に戻る
      </button>
    </div>
  );
}
