'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/config';
import { SEARCH_TAGS } from '@/lib/lpTags';

type PublicArticleEvent = {
  id: string;
  tenantCode?: string | null;
  title: string;
  heldAt: string;
  price: number;
  priceMale?: number | null;
  priceFemale?: number | null;
  imageUrl?: string | null;
  tags?: string[];
};

const SEARCH_TAG_SET = new Set<string>(SEARCH_TAGS);

function computeEventTags(events: PublicArticleEvent[]): string[] {
  const countByTag = new Map<string, number>();
  for (const event of events) {
    for (const tag of event.tags ?? []) {
      if (SEARCH_TAG_SET.has(tag)) countByTag.set(tag, (countByTag.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(countByTag.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'))
    .map(([tag]) => tag);
}

function imgSrc(url: string | null | undefined) {
  if (!url) return '/defaults/events/default.webp';
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

function eventPriceLabel(event: PublicArticleEvent) {
  if (event.priceMale != null && event.priceFemale != null) {
    return `¥${Math.min(event.priceMale, event.priceFemale).toLocaleString()}〜`;
  }
  return event.price === 0 ? '無料' : `¥${event.price.toLocaleString()}`;
}

function eventDateLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
}

function EventCardMini({ event }: { event: PublicArticleEvent }) {
  const href = event.tenantCode ? `/e/${event.tenantCode}/${event.id}` : '/';
  return (
    <Link href={href} className="relative w-28 shrink-0 overflow-hidden rounded-xl bg-white" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="relative" style={{ aspectRatio: '4/5' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc(event.imageUrl)} alt={event.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
          <p className="mb-1 line-clamp-2 text-[11px] font-bold leading-snug text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>{event.title}</p>
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[9px] text-white/80">{eventDateLabel(event.heldAt)}</span>
            <span className="shrink-0 text-[9px] font-semibold text-white/95">{eventPriceLabel(event)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function EventsTagFilter({ events }: { events: PublicArticleEvent[] }) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const tags = computeEventTags(events);

  useEffect(() => {
    setSelectedTag(null);
  }, [events]);

  const shownEvents = selectedTag ? events.filter((e) => (e.tags ?? []).includes(selectedTag)) : events;

  return (
    <>
      {tags.length >= 1 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${!selectedTag ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            すべて
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${selectedTag === tag ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shownEvents.map((event) => <EventCardMini key={event.id} event={event} />)}
      </div>
    </>
  );
}
