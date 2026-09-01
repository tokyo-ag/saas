'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { api, API_URL, PublicEvent, PublicTenant } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { DEFAULT_EVENT_IMAGE, getDefaultEventImage } from '@/lib/defaultImages';
import { ACTIVITY_TAG_EVENT_CATEGORY, ALL_LOCATION_TAGS, SEARCH_TAGS } from '@/lib/lpTags';
import { Block, CARD_IMAGE_SIZE_CLASS, IMAGE_SIZE_CLASS, TEXT_SIZE_CLASS } from './BlockEditor';
import { buildAutoSeoDescription, buildSeoProfileFromTenant } from '@/lib/tenantSeo';

const CELL_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;

function renderCellContent(text: string): ReactNode {
  if (!text.includes('](')) return text;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  CELL_LINK_RE.lastIndex = 0;
  while ((match = CELL_LINK_RE.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#06C755] hover:underline">
        {match[1]}
      </a>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

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

const LOCATION_TAG_SET = new Set<string>(ALL_LOCATION_TAGS);
const SEARCH_TAG_SET = new Set<string>(SEARCH_TAGS);

function computeEventAreas(events: PublicEvent[]): string[] {
  const countByArea = new Map<string, number>();
  for (const event of events) {
    for (const eventTag of event.tags ?? []) {
      if (LOCATION_TAG_SET.has(eventTag)) countByArea.set(eventTag, (countByArea.get(eventTag) ?? 0) + 1);
    }
  }
  return Array.from(countByArea.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'))
    .map(([area]) => area);
}

function computeEventTags(events: PublicEvent[]): string[] {
  const countByTag = new Map<string, number>();
  for (const event of events) {
    for (const eventTag of event.tags ?? []) {
      if (SEARCH_TAG_SET.has(eventTag)) countByTag.set(eventTag, (countByTag.get(eventTag) ?? 0) + 1);
    }
  }
  return Array.from(countByTag.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'))
    .map(([tag]) => tag);
}

function EventCardMini({ event }: { event: PublicEvent }) {
  const img = imgUrl(event.imageUrl, API_URL) ?? getDefaultEventImage(event.category);
  return (
    <div className="w-28 shrink-0 overflow-hidden rounded-xl relative bg-white">
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
}

function EventsBlockPreview({ category, heading, filterTags, areaSearchEnabled, showFilterTag, typeTags }: { category: string; heading: string; filterTags?: string[]; areaSearchEnabled?: boolean; showFilterTag?: boolean; typeTags?: string[] }) {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const eventCategory = ACTIVITY_TAG_EVENT_CATEGORY[category];
  // showFilterTag turns this into an interactive tag-tab filter (like the area tabs) over every
  // tag present in the category's events, so the fetch must ignore the picked filter tags.
  // Multiple filterTags are ANDed together server-side (must match every selected tag).
  const fetchTag = showFilterTag ? undefined : (filterTags && filterTags.length > 0 ? filterTags.join(',') : undefined);
  const fetchTagLabel = filterTags && filterTags.length > 0 ? filterTags.join('・') : undefined;
  // typeTags (団体種別) broadens the fetch to every category for matching tenants, ignoring the
  // article's own category entirely.
  const hasTypeTags = (typeTags ?? []).length > 0;

  useEffect(() => {
    if (!hasTypeTags && !eventCategory) { setEvents([]); return; }
    let active = true;
    api.public.events(hasTypeTags ? undefined : eventCategory, fetchTag, typeTags).then((list) => { if (active) setEvents(list); }).catch(() => { if (active) setEvents([]); });
    return () => { active = false; };
  }, [eventCategory, fetchTag, hasTypeTags, typeTags]);

  useEffect(() => {
    setSelectedArea(null);
    setSelectedTag(null);
  }, [eventCategory, fetchTag]);

  if (!hasTypeTags && !category) {
    return <p className="my-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">カテゴリを選択すると、該当イベントのプレビューが表示されます。</p>;
  }
  if (!hasTypeTags && !eventCategory) {
    return <p className="my-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">「{category}」は活動種目カテゴリではないため、対象イベントがありません。</p>;
  }
  if (events.length === 0) {
    return <p className="my-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">{hasTypeTags ? (typeTags ?? []).join('・') : category}{fetchTagLabel ? `・「${fetchTagLabel}」` : ''}に一致する公開中のイベントが見つかりませんでした。</p>;
  }
  const areas = !showFilterTag && areaSearchEnabled ? computeEventAreas(events) : [];
  const tags = showFilterTag ? computeEventTags(events) : [];
  const filteredEvents = showFilterTag
    ? (selectedTag ? events.filter((e) => (e.tags ?? []).includes(selectedTag)) : events)
    : (selectedArea ? events.filter((e) => (e.tags ?? []).includes(selectedArea)) : events);
  const shownEvents = filteredEvents.slice(0, 6);
  return (
    <div className="my-6">
      {heading && <p className="mb-2 text-base font-bold text-gray-950">{heading}</p>}
      {tags.length >= 1 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${!selectedTag ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            すべて
          </button>
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTag(t)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${selectedTag === t ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {areas.length >= 1 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedArea(null)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${!selectedArea ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            すべて
          </button>
          {areas.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setSelectedArea(area)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${selectedArea === area ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {area}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {shownEvents.map((event) => <EventCardMini key={event.id} event={event} />)}
      </div>
    </div>
  );
}

function CirclesBlockPreview({ category, heading, typeTags }: { category: string; heading: string; typeTags?: string[] }) {
  const [tenants, setTenants] = useState<PublicTenant[]>([]);
  const hasTypeTags = (typeTags ?? []).length > 0;

  useEffect(() => {
    if (!hasTypeTags && !category) { setTenants([]); return; }
    let active = true;
    api.public.tenants(hasTypeTags ? undefined : category, typeTags).then((list) => { if (active) setTenants(list.slice(0, 8)); }).catch(() => { if (active) setTenants([]); });
    return () => { active = false; };
  }, [category, hasTypeTags, typeTags]);

  if (!hasTypeTags && !category) {
    return <p className="my-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">カテゴリを選択すると、該当団体のプレビューが表示されます。</p>;
  }
  if (tenants.length === 0) {
    return <p className="my-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">{hasTypeTags ? (typeTags ?? []).join('・') : category}に一致する団体が見つかりませんでした。</p>;
  }
  return (
    <div className="my-6">
      {heading && <p className="mb-2 text-base font-bold text-gray-950">{heading}</p>}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tenants.map((tenant, index) => {
          const displayName = tenant.name ?? tenant.lineDisplayName;
          return (
            <div key={tenant.id} className="relative flex w-36 shrink-0 flex-col items-center gap-2 rounded-xl bg-white p-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <span className="absolute left-3 top-2 text-xs font-bold text-[#06C755]">No.{index + 1}</span>
              {tenant.linePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.linePictureUrl} alt={displayName} className="mt-3 h-14 w-14 rounded-full border-2 border-gray-100 object-cover" />
              ) : (
                <div className="mt-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#06C755] to-[#047a35]">
                  <span className="text-lg font-bold text-white">{displayName.slice(0, 1)}</span>
                </div>
              )}
              <p className="line-clamp-2 text-center text-[12px] font-semibold leading-snug text-gray-800">{displayName}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OwnCircleBlockPreview({ tenantCode }: { tenantCode?: string }) {
  const [tenant, setTenant] = useState<PublicTenant | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setTenant(null);
    setNotFound(false);
    if (!tenantCode) return;
    let active = true;
    api.public.tenant(tenantCode)
      .then((t) => { if (active) setTenant(t); })
      .catch(() => { if (active) setNotFound(true); });
    return () => { active = false; };
  }, [tenantCode]);

  if (!tenantCode) {
    return <p className="my-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">埋め込む自社サークルを選択してください。</p>;
  }
  if (notFound) {
    return <p className="my-6 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-500">団体が見つかりませんでした（コード: {tenantCode}）。</p>;
  }
  if (!tenant) {
    return <p className="my-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">読み込み中...</p>;
  }
  // Prefer the tenant's proper name over lineDisplayName here (unlike CirclesBlockPreview) -
  // this block represents the team in official editorial copy, where the LINE OA's often
  // casually-cased chat display name (e.g. "gakuori") isn't the intended public brand casing.
  const displayName = tenant.name || tenant.lineDisplayName || '';
  // Always use the tenant's real SEO meta description here (manual seoDescription, or the same
  // auto-generated text clubs/[tenantCode]/[slug]/page.tsx uses) rather than the plain
  // "description" field, so every card in a list reads consistently instead of some showing a
  // casually-written description and others an SEO-style one.
  const description = tenant.pages?.[0]?.seoDescription || buildAutoSeoDescription(displayName, buildSeoProfileFromTenant(tenant));
  return (
    <div className="my-6 flex gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {tenant.linePictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tenant.linePictureUrl} alt={displayName} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#06C755] to-[#047a35]">
          <span className="text-xl font-bold text-white">{displayName.slice(0, 1)}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-950">{displayName}</p>
        {description && <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{description}</p>}
        <p className="mt-2 text-xs font-bold text-[#06C755]">団体ページを見る →</p>
      </div>
    </div>
  );
}

function ExternalCircleBlockPreview({ name, description, imageUrl }: { name?: string; description?: string; imageUrl?: string }) {
  if (!name) {
    return <p className="my-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">外部サークルの団体名を入力してください。</p>;
  }
  return (
    <div className="my-6 flex gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl || DEFAULT_EVENT_IMAGE} alt={name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-950">{name}</p>
        {description && <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{description}</p>}
      </div>
    </div>
  );
}

function CheckBullet() {
  return (
    <svg width="24" height="24" viewBox="0 0 20 20" fill="none" className="mt-[1px] shrink-0">
      <circle cx="10" cy="10" r="10" fill="#06C755" fillOpacity="0.15" />
      <path d="M6 10.2l2.6 2.6L14 7.2" stroke="#06C755" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ListMarker({ listStyle, index }: { listStyle?: Block['listStyle']; index: number }) {
  if (listStyle === 'bullet') {
    return <span className="w-[24px] shrink-0 text-center text-2xl leading-none text-[#06C755]">・</span>;
  }
  if (listStyle === 'number') {
    return (
      <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#06C755]/15 text-sm font-bold text-[#06C755]">
        {index}
      </span>
    );
  }
  return <CheckBullet />;
}

function ParagraphText({ text }: { text: string }) {
  return (
    <p className="mb-6 whitespace-pre-wrap text-[15px] leading-[1.75] text-[#333333] sm:text-base">
      {text || ' '}
    </p>
  );
}

function CardSliderBlockView({ items }: { items: NonNullable<Block['cardItems']> }) {
  if (items.length === 0) return null;
  return (
    <div className="my-6">
      <p className="mb-1.5 text-[11px] text-gray-400">→ 横にスワイプ</p>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex w-[62%] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm sm:w-[220px]"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
          >
            {item.imageUrl && (
              <a href={item.href || undefined} target="_blank" rel="noopener noreferrer" className="flex justify-center pt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={item.name} className={`h-auto ${CARD_IMAGE_SIZE_CLASS[item.imageSize ?? 'medium']}`} />
              </a>
            )}
            <div className="flex flex-1 flex-col p-4">
              {item.name && <p className="text-center text-base font-bold text-gray-950">{item.name}</p>}
              {item.description && (
                <p className="mt-2 flex-1 text-[15px] leading-[1.75] text-[#333333]">{item.description}</p>
              )}
              {item.href && (
                <a href={item.href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-bold text-[#06C755] hover:underline">
                  {item.name}の活動を見る →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockView({ block, category }: { block: Block; category: string }) {
  if (block.type === 'h2') {
    return (
      <h2 className="my-6 border-l-[5px] border-[#06C755] py-1 pl-4 text-2xl font-bold text-gray-950">
        {block.text || '見出し'}
      </h2>
    );
  }
  if (block.type === 'h3') {
    return <h3 className="pt-4 text-lg font-bold text-gray-950">{block.text || '小見出し'}</h3>;
  }
  if (block.type === 'image') {
    if (!block.imageUrl) return null;
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={block.imageUrl} alt={block.text} className="mx-auto max-w-full rounded-xl border border-gray-100" />
    );
    return <div className="my-6 text-center">{block.href ? <a href={block.href} target="_blank" rel="noopener noreferrer">{img}</a> : img}</div>;
  }
  if (block.type === 'imageText' || block.type === 'textImage') {
    const img = block.imageUrl && (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={block.imageUrl} alt="" className={`shrink-0 rounded-xl object-contain ${IMAGE_SIZE_CLASS[block.imageSize ?? 'medium']}`} />
    );
    const imgEl = block.href ? <a href={block.href} target="_blank" rel="noopener noreferrer">{img}</a> : img;
    const textEl = <p className={`whitespace-pre-wrap leading-[1.75] text-[#333333] ${TEXT_SIZE_CLASS[block.textSize ?? 'medium']}`}>{block.text || ' '}</p>;
    return (
      <div className="my-6 flex flex-row items-start gap-3 sm:gap-4">
        {block.type === 'imageText' ? (
          <>
            {imgEl}
            {textEl}
          </>
        ) : (
          <>
            {textEl}
            {imgEl}
          </>
        )}
      </div>
    );
  }
  if (block.type === 'cta') {
    return (
      <div className="my-6 rounded-xl border border-[#06C755]/20 bg-[#06C755]/5 px-6 py-6">
        <span className="inline-flex rounded-lg bg-[#06C755] px-5 py-3 text-sm font-bold text-white">
          {block.text || 'COMIUを見る'}
        </span>
      </div>
    );
  }
  if (block.type === 'events') {
    return <EventsBlockPreview category={category} heading={block.text} filterTags={block.tags} areaSearchEnabled={block.eventsAreaSearchEnabled} showFilterTag={block.eventsShowFilterTagEnabled} typeTags={block.eventsTypeTags} />;
  }
  if (block.type === 'circles') {
    return <CirclesBlockPreview category={category} heading={block.text} typeTags={block.circleTypeTags} />;
  }
  if (block.type === 'table') {
    const rows = block.tableRows ?? [];
    if (rows.length === 0) return null;
    const [header, ...body] = rows;
    return (
      <div className="my-6 max-h-96 overflow-auto rounded-md border border-gray-200">
        <table className="w-full border-collapse text-xs sm:text-sm" style={{ minWidth: Math.max(480, header.length * 150) }}>
          <thead>
            <tr>
              {header.map((cell, i) => (
                <th key={i} className="sticky top-0 z-10 max-w-[200px] min-w-[110px] border border-gray-200 bg-[#e6f9ee] p-0 text-left align-top font-bold text-gray-950">
                  <div className="overflow-x-auto whitespace-nowrap px-3 py-2.5 leading-relaxed [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">{renderCellContent(cell)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r} className={r % 2 === 1 ? 'bg-gray-50' : ''}>
                {row.map((cell, c) => (
                  <td key={c} className="max-w-[240px] min-w-[110px] border border-gray-200 p-0 align-top text-[#333333]">
                    <div className="overflow-x-auto whitespace-nowrap px-3 py-2.5 leading-relaxed [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">{renderCellContent(cell)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === 'cardSlider') {
    return <CardSliderBlockView items={block.cardItems ?? []} />;
  }
  if (block.type === 'ownCircle') {
    return <OwnCircleBlockPreview tenantCode={block.tenantCode} />;
  }
  if (block.type === 'externalCircle') {
    return <ExternalCircleBlockPreview name={block.name} description={block.text} imageUrl={block.imageUrl} />;
  }
  if (block.type === 'faq') {
    const items = (block.faqItems ?? []).filter((item) => item.q && item.a);
    if (items.length === 0) return null;
    return (
      <div className="my-6 space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="font-bold text-gray-900">Q. {item.q}</p>
            <p className="mt-2 text-sm leading-7 text-gray-600">A. {item.a}</p>
          </div>
        ))}
      </div>
    );
  }
  return <ParagraphText text={block.text} />;
}

const CIRCLE_CARD_VISIBLE_LIMIT = 5;
const CIRCLE_CARD_BATCH_SIZE = 5;

// Mirrors the public page's CircleCardReveal: batches of 5 revealed at a time with a slide/fade
// transition, so the editor preview shows the same "つづきを見る" behavior the reader will see.
// Every item stays mounted (just visually collapsed) to match the SEO-safe approach used live.
function CircleCardRevealPreview({ items }: { items: ReactNode[] }) {
  const [revealedBatches, setRevealedBatches] = useState(0);
  const batches: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += CIRCLE_CARD_BATCH_SIZE) batches.push(items.slice(i, i + CIRCLE_CARD_BATCH_SIZE));
  const remaining = items.length - revealedBatches * CIRCLE_CARD_BATCH_SIZE;

  return (
    <div>
      {batches.map((batch, bi) => {
        const isRevealed = bi < revealedBatches;
        return (
          <div
            key={bi}
            className={`grid overflow-hidden transition-all duration-500 ease-out ${
              isRevealed ? 'mt-0 max-h-[4000px] opacity-100' : 'max-h-0 -translate-y-2 opacity-0'
            }`}
          >
            {batch}
          </div>
        );
      })}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setRevealedBatches((v) => v + 1)}
          className="mx-auto my-4 flex items-center gap-1 rounded-full border border-[#06C755]/30 bg-[#06C755]/5 px-5 py-2 text-sm font-bold text-[#06C755] transition hover:bg-[#06C755]/10"
        >
          つづきを見る（あと{remaining}件）
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function renderBlocks(blocks: Block[], category: string) {
  const nodes: ReactNode[] = [];
  let circleCardCount = 0;
  let collapsed: ReactNode[] = [];
  const flushCollapsed = () => {
    if (collapsed.length > 0) {
      nodes.push(<CircleCardRevealPreview key={`more-${nodes.length}`} items={collapsed} />);
      collapsed = [];
    }
  };
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'list') {
      flushCollapsed();
      const group: Block[] = [];
      while (i < blocks.length && blocks[i].type === 'list') {
        group.push(blocks[i]);
        i++;
      }
      nodes.push(
        <ul key={group[0].id} className="my-4 space-y-2">
          {group.map((b, idx) => (
            <li key={b.id} className="flex items-center gap-2.5 pl-1 text-[15px] font-bold leading-[1.75] text-[#333333] sm:text-base">
              <ListMarker listStyle={b.listStyle} index={idx + 1} />
              <span className="whitespace-pre-wrap">{b.text || 'リスト項目'}</span>
            </li>
          ))}
        </ul>,
      );
    } else if (block.type === 'ownCircle' || block.type === 'externalCircle') {
      circleCardCount++;
      const node = <BlockView key={block.id} block={block} category={category} />;
      if (circleCardCount <= CIRCLE_CARD_VISIBLE_LIMIT) {
        nodes.push(node);
      } else {
        collapsed.push(node);
      }
      i++;
    } else {
      flushCollapsed();
      nodes.push(<BlockView key={block.id} block={block} category={category} />);
      i++;
    }
  }
  flushCollapsed();
  return nodes;
}

export default function ArticlePreview({
  title,
  category,
  areaTags,
  targetKeyword,
  blocks,
  ctaTitle,
  ctaDescription,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  category: string;
  areaTags: string[];
  targetKeyword: string;
  blocks: Block[];
  ctaTitle?: string;
  ctaDescription?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const hasInlineCta = blocks.some((b) => b.type === 'cta');
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
      <div className="my-8 h-px bg-gray-100" />
      <div>
        {blocks.length === 0 ? (
          <p className="text-sm text-gray-300">ブロックを追加すると、ここにプレビューが表示されます。</p>
        ) : (
          renderBlocks(blocks, category)
        )}
      </div>
      {!hasInlineCta && (
        <div className="mt-6 rounded-xl border border-[#06C755]/20 bg-[#06C755]/5 px-6 py-6">
          <p className="text-sm font-bold text-gray-950">{ctaTitle || 'COMIUで主催者向けWEBサイトと予約管理をまとめる'}</p>
          <p className="mt-2 text-sm leading-7 text-gray-600">
            {ctaDescription || '団体紹介、記事導線、予約画面、参加者管理をひとつにつなげられます。'}
          </p>
          <span className="mt-4 inline-flex rounded-lg bg-[#06C755] px-5 py-3 text-sm font-bold text-white">
            {ctaLabel || 'COMIUを見る'}
          </span>
        </div>
      )}
    </div>
  );
}
