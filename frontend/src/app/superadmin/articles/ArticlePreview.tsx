'use client';

import { useEffect, useState } from 'react';
import { api, API_URL, PublicEvent } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { DEFAULT_EVENT_IMAGE } from '@/lib/defaultImages';
import { ACTIVITY_TAG_EVENT_CATEGORY } from '@/lib/lpTags';
import { Block } from './BlockEditor';

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
}

function priceLabel(event: PublicEvent) {
  if (event.priceMale != null && event.priceFemale != null) {
    return `¥${Math.min(event.priceMale, event.priceFemale).toLocaleString()}〜`;
  }
  return event.price === 0 ? '無料' : `¥${event.price.toLocaleString()}`;
}

function EventsBlockPreview({ category }: { category: string }) {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const eventCategory = ACTIVITY_TAG_EVENT_CATEGORY[category];

  useEffect(() => {
    if (!eventCategory) { setEvents([]); return; }
    let active = true;
    api.public.events(eventCategory).then((list) => { if (active) setEvents(list.slice(0, 6)); }).catch(() => { if (active) setEvents([]); });
    return () => { active = false; };
  }, [eventCategory]);

  if (!category) {
    return <p className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">カテゴリを選択すると、該当イベントのプレビューが表示されます。</p>;
  }
  if (!eventCategory) {
    return <p className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">「{category}」は活動種目カテゴリではないため、対象イベントがありません。</p>;
  }
  if (events.length === 0) {
    return <p className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">「{category}」に一致する公開中のイベントが見つかりませんでした。</p>;
  }
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {events.map((event) => {
        const img = imgUrl(event.imageUrl, API_URL) ?? DEFAULT_EVENT_IMAGE;
        return (
          <div key={event.id} className="w-28 shrink-0 overflow-hidden rounded-xl relative bg-white">
            <div className="relative" style={{ aspectRatio: '4/5' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={event.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
                <p className="mb-1 line-clamp-2 text-[11px] font-bold leading-snug text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>{event.title}</p>
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[9px] text-white/80">{fmtDate(event.heldAt)}</span>
                  <span className="shrink-0 text-[9px] font-semibold text-white/95">{priceLabel(event)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BlockView({ block, category }: { block: Block; category: string }) {
  if (block.type === 'h2') {
    return <h2 className="pt-6 text-2xl font-bold text-gray-950">{block.text || '見出し'}</h2>;
  }
  if (block.type === 'h3') {
    return <h3 className="pt-4 text-lg font-bold text-gray-950">{block.text || '小見出し'}</h3>;
  }
  if (block.type === 'list') {
    return <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm">{block.text || 'リスト項目'}</p>;
  }
  if (block.type === 'image') {
    if (!block.imageUrl) return null;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={block.imageUrl} alt={block.text} className="my-6 w-full rounded-xl border border-gray-100 object-cover" />;
  }
  if (block.type === 'cta') {
    return (
      <div className="rounded-xl border border-[#06C755]/20 bg-[#06C755]/5 px-6 py-6">
        <span className="inline-flex rounded-lg bg-[#06C755] px-5 py-3 text-sm font-bold text-white">
          {block.text || 'COMIUを見る'}
        </span>
      </div>
    );
  }
  if (block.type === 'events') {
    return <EventsBlockPreview category={category} />;
  }
  return <p>{block.text || ' '}</p>;
}

export default function ArticlePreview({
  title,
  category,
  areaTags,
  targetKeyword,
  excerpt,
  blocks,
}: {
  title: string;
  category: string;
  areaTags: string[];
  targetKeyword: string;
  excerpt: string;
  blocks: Block[];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-9">
      <div className="flex flex-wrap items-center gap-2">
        {category && <span className="rounded-full bg-[#06C755]/10 px-3 py-1 text-xs font-bold text-[#06C755]">{category}</span>}
        {areaTags.map((area) => (
          <span key={area} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{area}</span>
        ))}
        {targetKeyword && <span className="text-xs text-gray-400">{targetKeyword}</span>}
      </div>
      <h1 className="mt-4 text-3xl font-bold leading-tight text-gray-950">{title || '（タイトル未入力）'}</h1>
      {excerpt && <p className="mt-4 text-sm leading-7 text-gray-500">{excerpt}</p>}
      <div className="my-8 h-px bg-gray-100" />
      <div className="space-y-4 text-[15px] leading-8 text-gray-700">
        {blocks.length === 0 ? (
          <p className="text-sm text-gray-300">ブロックを追加すると、ここにプレビューが表示されます。</p>
        ) : (
          blocks.map((block) => <BlockView key={block.id} block={block} category={category} />)
        )}
      </div>
    </div>
  );
}
