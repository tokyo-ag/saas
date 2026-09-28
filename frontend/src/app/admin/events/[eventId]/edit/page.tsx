'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, Event } from '@/lib/api';
import EventForm from '@/components/admin/EventForm';

export default function EditEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.events.get(eventId)
      .then(setEvent)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <div className="text-gray-400 py-12 text-center">読み込み中...</div>;
  if (!event) return <div className="text-red-500 py-12 text-center">イベントが見つかりません</div>;
  if (event.collabReadOnly) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm font-medium text-gray-600">コラボ先から共有されたイベントは編集できません。</p>
        <Link href={`/admin/events/${eventId}`} className="mt-4 inline-block text-sm font-bold text-[#06C755]">詳細に戻る</Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">イベントを編集</h2>
      <EventForm initial={event} />
    </div>
  );
}
