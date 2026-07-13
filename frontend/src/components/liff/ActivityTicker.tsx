'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type ActivityItem = { id: string; name: string; eventTitle: string; reservedAt: string };

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

export function ActivityTicker({ tenantId, accentColor }: { tenantId: string; accentColor: string }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    api.liff.activity(tenantId).then(setItems).catch(() => setItems([]));
  }, [tenantId]);

  if (!items || items.length === 0) return null;

  const loop = [...items, ...items];

  return (
    <div className="overflow-hidden border-b border-gray-100 bg-white py-2">
      <div className="flex w-max animate-ticker gap-8 px-4">
        {loop.map((item, i) => (
          <span key={`${item.id}-${i}`} className="flex shrink-0 items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
            <span className="font-bold" style={{ color: accentColor }}>NEW</span>
            <span className="font-medium text-gray-900">{item.name}さん</span>
            が「{item.eventTitle}」に予約しました
            <span className="text-gray-400">（{relativeTime(item.reservedAt)}）</span>
          </span>
        ))}
      </div>
    </div>
  );
}
