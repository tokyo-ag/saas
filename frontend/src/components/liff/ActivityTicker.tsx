'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { isLightHexColor } from '@/lib/color';

type ActivityItem = { id: string; type: 'login' | 'reservation'; at: string };

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function formatActivity(item: ActivityItem): string {
  const d = new Date(item.at);
  const stamp = `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return item.type === 'login' ? `${stamp}ログイン！（NEW）` : `${stamp}に予約！`;
}

export function ActivityTicker({ tenantId, accentColor }: { tenantId: string; accentColor: string }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    api.liff.activity(tenantId).then(setItems).catch(() => setItems([]));
  }, [tenantId]);

  if (!items || items.length === 0) return null;

  const loop = [...items, ...items];
  // ticker背景が白固定のため、accentColorが白に近い（例:ボタン専用の白文字色）場合は
  // 読めなくなってしまう。その場合だけ読みやすい濃い色にフォールバックする。
  const textColor = isLightHexColor(accentColor) ? '#111827' : accentColor;

  return (
    <div className="overflow-hidden border-b border-gray-100 bg-white py-2">
      <div className="flex w-max animate-ticker gap-6 px-4">
        {loop.map((item, i) => (
          <span key={`${item.id}-${i}`} className="shrink-0 text-xs font-medium whitespace-nowrap" style={{ color: textColor }}>
            {formatActivity(item)}
          </span>
        ))}
      </div>
    </div>
  );
}
