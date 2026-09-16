'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, formatDate, StaffViewEventList } from '@/lib/api';
import { EventStatusBadge } from '@/components/ui/StatusBadge';

const POLL_INTERVAL_MS = 15000;

export default function StaffViewListPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<StaffViewEventList | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api.public.staffViewEvents(token)
        .then((res) => { if (!cancelled) setData(res); })
        .catch(() => { if (!cancelled) setNotFound(true); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#06C755] text-sm">読み込み中...</div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-lg font-bold text-gray-900">このリンクは無効です</p>
        <p className="text-sm text-gray-500">共有が停止されたか、リンクが正しくない可能性があります。</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-[#06C755] text-white px-4 py-5">
        <p className="text-xs opacity-80">運営用・閲覧専用</p>
        <h1 className="text-base font-bold mt-1">{data.tenantName}の予約ページ一覧</h1>
      </div>

      <div className="px-4 py-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-semibold text-gray-500">全{data.events.length}件</p>
          <span className="text-[11px] text-gray-400">自動更新中</span>
        </div>
        <div className="space-y-2">
          {data.events.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">イベントがありません</div>
          ) : (
            data.events.map((event) => (
              <Link
                key={event.id}
                href={`/staff/${token}/events/${event.id}`}
                className="block rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm active:opacity-80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <EventStatusBadge status={event.status} />
                      <p className="text-sm font-bold text-gray-900 truncate">{event.title}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">{formatDate(event.heldAt)}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{event.locationHint || event.location}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-gray-500">
                    <p className="font-bold text-gray-800">{event.total}人{event.capacity != null ? ` / ${event.capacity}` : ''}</p>
                    <p className="mt-0.5">男{event.male}・女{event.female}</p>
                    {event.waitlisted > 0 && <p className="mt-0.5 text-amber-600">キャン待{event.waitlisted}</p>}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
