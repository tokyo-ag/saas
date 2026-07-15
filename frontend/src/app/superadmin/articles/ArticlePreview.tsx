'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { api, API_URL, PublicEvent, PublicTenant } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { DEFAULT_EVENT_IMAGE } from '@/lib/defaultImages';
import { ACTIVITY_TAG_EVENT_CATEGORY } from '@/lib/lpTags';
import { Block, IMAGE_SIZE_CLASS, TEXT_SIZE_CLASS } from './BlockEditor';

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

function EventsBlockPreview({ category, heading, tag }: { category: string; heading: string; tag?: string }) {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const eventCategory = ACTIVITY_TAG_EVENT_CATEGORY[category];

  useEffect(() => {
    if (!eventCategory) { setEvents([]); return; }
    let active = true;
    api.public.events(eventCategory, tag).then((list) => { if (active) setEvents(list.slice(0, 6)); }).catch(() => { if (active) setEvents([]); });
    return () => { active = false; };
  }, [eventCategory, tag]);

  if (!category) {
    return <p className="my-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">カテゴリを選択すると、該当イベントのプレビューが表示されます。</p>;
  }
  if (!eventCategory) {
    return <p className="my-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">「{category}」は活動種目カテゴリではないため、対象イベントがありません。</p>;
  }
  if (events.length === 0) {
    return <p className="my-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">「{category}」{tag ? `・「${tag}」` : ''}に一致する公開中のイベントが見つかりませんでした。</p>;
  }
  return (
    <div className="my-6">
      {heading && <p className="mb-2 text-base font-bold text-gray-950">{heading}</p>}
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
    </div>
  );
}

function CirclesBlockPreview({ category, heading }: { category: string; heading: string }) {
  const [tenants, setTenants] = useState<PublicTenant[]>([]);

  useEffect(() => {
    if (!category) { setTenants([]); return; }
    let active = true;
    api.public.tenants(category).then((list) => { if (active) setTenants(list.slice(0, 8)); }).catch(() => { if (active) setTenants([]); });
    return () => { active = false; };
  }, [category]);

  if (!category) {
    return <p className="my-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">カテゴリを選択すると、該当団体のプレビューが表示されます。</p>;
  }
  if (tenants.length === 0) {
    return <p className="my-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-400">「{category}」に一致する団体が見つかりませんでした。</p>;
  }
  return (
    <div className="my-6">
      {heading && <p className="mb-2 text-base font-bold text-gray-950">{heading}</p>}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tenants.map((tenant, index) => {
          const displayName = tenant.lineDisplayName ?? tenant.name;
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
    return <EventsBlockPreview category={category} heading={block.text} tag={block.tag} />;
  }
  if (block.type === 'circles') {
    return <CirclesBlockPreview category={category} heading={block.text} />;
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
                  <div className="overflow-x-auto whitespace-nowrap px-3 py-2.5 leading-relaxed">{renderCellContent(cell)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r} className={r % 2 === 1 ? 'bg-gray-50' : ''}>
                {row.map((cell, c) => (
                  <td key={c} className="max-w-[240px] min-w-[110px] border border-gray-200 p-0 align-top text-[#333333]">
                    <div className="line-clamp-2 whitespace-normal break-words px-3 py-2.5 leading-snug">{renderCellContent(cell)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <ParagraphText text={block.text} />;
}

function renderBlocks(blocks: Block[], category: string) {
  const nodes: ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'list') {
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
    } else {
      nodes.push(<BlockView key={block.id} block={block} category={category} />);
      i++;
    }
  }
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
