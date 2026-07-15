import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { API_URL, SITE_URL } from '@/lib/config';
import { ACTIVITY_TAG_EVENT_CATEGORY } from '@/lib/lpTags';

export const revalidate = 60;

type OfficialArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  body: string;
  category?: string | null;
  areaTags?: string[];
  isPillar?: boolean;
  pillarSlug?: string | null;
  targetKeyword?: string | null;
  ctaTitle?: string | null;
  ctaDescription?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ogImageUrl?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
};

type OfficialArticleSummary = Omit<OfficialArticle, 'body'>;

type PublicArticleEvent = {
  id: string;
  tenantCode?: string | null;
  title: string;
  heldAt: string;
  price: number;
  priceMale?: number | null;
  priceFemale?: number | null;
  imageUrl?: string | null;
};

type PublicArticleTenant = {
  id: string;
  code?: string | null;
  name: string;
  lineDisplayName?: string | null;
  linePictureUrl?: string | null;
};

async function fetchArticle(slug: string): Promise<OfficialArticle | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles/${slug}`, { next: { revalidate } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchArticleSummaries(): Promise<OfficialArticleSummary[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles?limit=120`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchCategoryEvents(category?: string | null, tag?: string): Promise<PublicArticleEvent[]> {
  const eventCategory = category ? ACTIVITY_TAG_EVENT_CATEGORY[category] : undefined;
  if (!eventCategory) return [];
  try {
    const params = new URLSearchParams({ category: eventCategory });
    if (tag) params.set('tag', tag);
    const res = await fetch(`${API_URL}/api/public/events?${params.toString()}`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function extractEventsTags(body: string): (string | undefined)[] {
  const tags = new Set<string | undefined>();
  for (const raw of body.split('\n')) {
    const match = EVENTS_RE.exec(raw.trim());
    if (match) tags.add(match[2] || undefined);
  }
  return Array.from(tags);
}

async function fetchCircles(category?: string | null): Promise<PublicArticleTenant[]> {
  if (!category) return [];
  try {
    const res = await fetch(`${API_URL}/api/public/tenants?activityTag=${encodeURIComponent(category)}`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
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

function EventsBlock({ events, heading }: { events: PublicArticleEvent[]; heading: string }) {
  if (events.length === 0) return null;
  return (
    <div className="my-6">
      {heading && <h2 className="mb-3 text-lg font-bold text-gray-950">{heading}</h2>}
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {events.map((event) => <EventCardMini key={event.id} event={event} />)}
      </div>
    </div>
  );
}

function CircleCardMini({ tenant, index }: { tenant: PublicArticleTenant; index: number }) {
  const displayName = tenant.lineDisplayName ?? tenant.name;
  const href = tenant.code ? `/clubs/${tenant.code}` : `/liff/${tenant.id}`;
  return (
    <Link href={href} className="relative flex w-36 shrink-0 flex-col items-center gap-2 rounded-xl bg-white p-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
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
    </Link>
  );
}

function CirclesBlock({ tenants, heading }: { tenants: PublicArticleTenant[]; heading: string }) {
  if (tenants.length === 0) return null;
  return (
    <div className="my-6">
      {heading && <h2 className="mb-3 text-lg font-bold text-gray-950">{heading}</h2>}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tenants.map((tenant, index) => <CircleCardMini key={tenant.id} tenant={tenant} index={index} />)}
      </div>
    </div>
  );
}

function CtaBlock({ label, href }: { label: string; href: string }) {
  return (
    <div className="my-6 rounded-xl border border-[#06C755]/20 bg-[#06C755]/5 px-6 py-6">
      <Link href={href || '/organizers'} className="inline-flex rounded-lg bg-[#06C755] px-5 py-3 text-sm font-bold text-white hover:opacity-90">
        {label || 'COMIUを見る'}
      </Link>
    </div>
  );
}

function plainMarkdown(text: string) {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/[*_~`>|\\]/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ogImageFor(article: Pick<OfficialArticle, 'ogImageUrl'>) {
  return article.ogImageUrl || `${SITE_URL}/opengraph-image`;
}

function extractFaqItems(body: string) {
  const items: { question: string; answer: string }[] = [];
  const lines = body.split('\n');
  let inFaq = false;
  let current: { question: string; answerLines: string[] } | null = null;

  const pushCurrent = () => {
    if (!current) return;
    const answer = plainMarkdown(current.answerLines.join(' '));
    if (current.question && answer) items.push({ question: current.question, answer });
    current = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (/^##\s+よくある質問/.test(line)) {
      inFaq = true;
      continue;
    }
    if (!inFaq) continue;
    if (line.startsWith('## ')) {
      pushCurrent();
      break;
    }
    if (line.startsWith('### ')) {
      pushCurrent();
      current = { question: plainMarkdown(line.replace(/^###\s+/, '')), answerLines: [] };
      continue;
    }
    if (current && line) current.answerLines.push(line);
  }

  pushCurrent();
  return items.slice(0, 8);
}

function relatedScore(article: OfficialArticleSummary, current: OfficialArticle) {
  if (article.slug === current.slug) return -1;
  let score = 0;
  const currentCluster = current.isPillar ? current.slug : current.pillarSlug;
  const articleCluster = article.isPillar ? article.slug : article.pillarSlug;
  if (currentCluster && articleCluster && currentCluster === articleCluster) score += 20;
  if (article.category && article.category === current.category) score += 6;
  const areaOverlap = (article.areaTags ?? []).some((tag) => (current.areaTags ?? []).includes(tag));
  if (areaOverlap) score += 4;
  const haystack = `${article.title} ${article.excerpt ?? ''} ${article.targetKeyword ?? ''}`.toLowerCase();
  const terms = `${current.targetKeyword ?? ''} ${current.title}`
    .toLowerCase()
    .split(/[\s・、。/｜|]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
  for (const term of new Set(terms)) {
    if (haystack.includes(term)) score += 1;
  }
  return score;
}

function pickRelatedArticles(articles: OfficialArticleSummary[], current: OfficialArticle) {
  return articles
    .map((article, index) => ({ article, index, score: relatedScore(article, current) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 4)
    .map((item) => item.article);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) return {};
  const description = article.excerpt ?? undefined;
  const image = ogImageFor(article);
  return {
    title: article.title,
    description,
    alternates: { canonical: `${SITE_URL}/guide/${slug}` },
    openGraph: {
      title: `${article.title} | COMIU`,
      description,
      type: 'article',
      url: `${SITE_URL}/guide/${slug}`,
      locale: 'ja_JP',
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt ?? undefined,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${article.title} | COMIU`,
      description,
      images: [image],
    },
  };
}

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const LINKED_IMAGE_RE = /^\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)$/;
const IMAGE_TEXT_RE_V3 = /^\{\{imagetext:([^|]*)\|([^|]*)\|(small|medium|large)\|(small|medium|large)\|(.*)\}\}$/;
const IMAGE_TEXT_RE_V2 = /^\{\{imagetext:([^|]*)\|([^|]*)\|(small|medium|large)\|(.*)\}\}$/;
const IMAGE_TEXT_RE_V1 = /^\{\{imagetext:([^|]*)\|([^|]*)\|(.*)\}\}$/;
const TEXT_IMAGE_RE = /^\{\{textimage:([^|]*)\|([^|]*)\|(small|medium|large)\|(small|medium|large)\|(.*)\}\}$/;
const IMAGE_SIZE_CLASS: Record<string, string> = {
  small: 'max-w-14 max-h-14 sm:max-w-[80px] sm:max-h-[80px]',
  medium: 'max-w-20 max-h-20 sm:max-w-[128px] sm:max-h-[128px]',
  large: 'max-w-28 max-h-28 sm:max-w-[200px] sm:max-h-[200px]',
};
const TEXT_SIZE_CLASS: Record<string, string> = {
  small: 'text-[13px] sm:text-sm',
  medium: 'text-[15px] sm:text-base',
  large: 'text-lg sm:text-xl',
};
const CTA_RE = /^\{\{cta:(.*)\|(.*)\}\}$/;
const EVENTS_RE = /^\{\{events(?::([^|}]*)(?:\|(.*))?)?\}\}$/;
const CIRCLES_RE = /^\{\{circles(?::(.*))?\}\}$/;
const TABLE_RE = /^\{\{table:(.+)\}\}$/;

function decodeTable(encoded: string): string[][] {
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (Array.isArray(parsed) && parsed.every((row) => Array.isArray(row))) return parsed;
  } catch {
    // fall through to default
  }
  return [];
}

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
      <Link key={key++} href={match[2]} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#06C755] hover:underline">
        {match[1]}
      </Link>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function CheckBullet() {
  return (
    <svg width="24" height="24" viewBox="0 0 20 20" fill="none" className="mt-[1px] shrink-0">
      <circle cx="10" cy="10" r="10" fill="#06C755" fillOpacity="0.15" />
      <path d="M6 10.2l2.6 2.6L14 7.2" stroke="#06C755" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type ListStyle = 'check' | 'bullet' | 'number';

function ListMarker({ listStyle, index }: { listStyle: ListStyle; index: number }) {
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

const LIST_LINE_RE = /^-(b|n)? (.*)$/;

function BodyRenderer({ body, eventsByTag, circles }: { body: string; eventsByTag: Map<string, PublicArticleEvent[]>; circles: PublicArticleTenant[] }) {
  const lines = body.split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      nodes.push(
        <p key={`p-${i}`} className="mb-6 whitespace-pre-wrap text-[15px] leading-[1.75] text-[#333333] sm:text-base">
          {paragraphBuffer.join('\n')}
        </p>,
      );
      paragraphBuffer = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      flushParagraph();
      i++;
      continue;
    }

    const list = LIST_LINE_RE.exec(line);
    if (list) {
      flushParagraph();
      const group: { text: string; listStyle: ListStyle }[] = [];
      while (i < lines.length) {
        const itemMatch = LIST_LINE_RE.exec(lines[i].trim());
        if (!itemMatch) break;
        const listStyle: ListStyle = itemMatch[1] === 'b' ? 'bullet' : itemMatch[1] === 'n' ? 'number' : 'check';
        group.push({ text: itemMatch[2], listStyle });
        i++;
      }
      nodes.push(
        <ul key={i} className="my-4 space-y-2">
          {group.map((item, itemIndex) => (
            <li key={itemIndex} className="flex items-center gap-2.5 pl-1 text-[15px] font-bold leading-[1.75] text-[#333333] sm:text-base">
              <ListMarker listStyle={item.listStyle} index={itemIndex + 1} />
              <span className="whitespace-pre-wrap">{item.text}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    const events = EVENTS_RE.exec(line);
    if (events) {
      flushParagraph();
      const eventsTag = events[2] || undefined;
      nodes.push(<EventsBlock key={i} events={eventsByTag.get(eventsTag ?? '') ?? []} heading={events[1] ?? ''} />);
      i++;
      continue;
    }
    const circlesMatch = CIRCLES_RE.exec(line);
    if (circlesMatch) {
      flushParagraph();
      nodes.push(<CirclesBlock key={i} tenants={circles} heading={circlesMatch[1] ?? ''} />);
      i++;
      continue;
    }
    const cta = CTA_RE.exec(line);
    if (cta) {
      flushParagraph();
      nodes.push(<CtaBlock key={i} label={cta[1]} href={cta[2]} />);
      i++;
      continue;
    }
    const table = TABLE_RE.exec(line);
    if (table) {
      flushParagraph();
      const rows = decodeTable(table[1]);
      if (rows.length > 0) {
        const [header, ...body] = rows;
        nodes.push(
          <div key={i} className="my-6">
            {header.length > 2 && (
              <p className="mb-1 text-[11px] text-gray-400 sm:hidden">← 横にスクロールできます →</p>
            )}
            <div className="max-h-96 overflow-auto rounded-md border border-gray-200">
              <table className="w-full border-collapse text-xs sm:text-sm" style={{ minWidth: Math.max(480, header.length * 150) }}>
              <thead>
                <tr>
                  {header.map((cell, ci) => (
                    <th key={ci} className="sticky top-0 z-10 max-w-[200px] min-w-[110px] border border-gray-200 bg-[#e6f9ee] p-0 text-left align-top font-bold text-gray-950">
                      <div className="overflow-x-auto whitespace-nowrap px-3 py-2.5 leading-relaxed">{renderCellContent(cell)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 1 ? 'bg-gray-50' : ''}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="max-w-[240px] min-w-[110px] border border-gray-200 p-0 align-top text-[#333333]">
                        <div className="line-clamp-2 whitespace-normal break-words px-3 py-2.5 leading-snug">{renderCellContent(cell)}</div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>,
        );
      }
      i++;
      continue;
    }
    const imageTextV3 = IMAGE_TEXT_RE_V3.exec(line);
    const imageTextV2 = IMAGE_TEXT_RE_V2.exec(line);
    const imageTextV1 = IMAGE_TEXT_RE_V1.exec(line);
    const textImage = TEXT_IMAGE_RE.exec(line);
    if (imageTextV3 || imageTextV2 || imageTextV1 || textImage) {
      flushParagraph();
      const [url, href, imgSize, txtSize, encodedText] = textImage
        ? [textImage[1], textImage[2], textImage[3], textImage[4], textImage[5]]
        : imageTextV3
        ? [imageTextV3[1], imageTextV3[2], imageTextV3[3], imageTextV3[4], imageTextV3[5]]
        : imageTextV2
        ? [imageTextV2[1], imageTextV2[2], imageTextV2[3], 'medium', imageTextV2[4]]
        : [imageTextV1![1], imageTextV1![2], 'medium', 'medium', imageTextV1![3]];
      const sizeClass = IMAGE_SIZE_CLASS[imgSize] ?? IMAGE_SIZE_CLASS.medium;
      const textClass = TEXT_SIZE_CLASS[txtSize] ?? TEXT_SIZE_CLASS.medium;
      const imgEl = url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className={`shrink-0 rounded-xl object-contain ${sizeClass}`} />
      );
      const imgNode = href ? <Link href={href}>{imgEl}</Link> : imgEl;
      const textNode = <p className={`whitespace-pre-wrap leading-[1.75] text-[#333333] ${textClass}`}>{encodedText.replace(/\\n/g, '\n')}</p>;
      nodes.push(
        <div key={i} className="my-6 flex flex-row items-start gap-3 sm:gap-4">
          {textImage ? (
            <>
              {textNode}
              {imgNode}
            </>
          ) : (
            <>
              {imgNode}
              {textNode}
            </>
          )}
        </div>,
      );
      i++;
      continue;
    }
    const linkedImage = LINKED_IMAGE_RE.exec(line);
    if (linkedImage) {
      flushParagraph();
      nodes.push(
        <div key={i} className="my-6 text-center">
          <Link href={linkedImage[3]}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={linkedImage[2]} alt={linkedImage[1]} className="mx-auto max-w-full rounded-xl border border-gray-100" />
          </Link>
        </div>,
      );
      i++;
      continue;
    }
    const image = IMAGE_RE.exec(line);
    if (image) {
      flushParagraph();
      nodes.push(
        <div key={i} className="my-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image[2]} alt={image[1]} className="mx-auto max-w-full rounded-xl border border-gray-100" />
        </div>,
      );
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      flushParagraph();
      nodes.push(<h3 key={i} className="pt-4 text-lg font-bold text-gray-950">{line.replace(/^### /, '')}</h3>);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      nodes.push(
        <h2 key={i} className="my-6 border-l-[5px] border-[#06C755] py-1 pl-4 text-xl font-bold text-gray-950 sm:text-2xl">
          {line.replace(/^## /, '')}
        </h2>,
      );
      i++;
      continue;
    }
    paragraphBuffer.push(line);
    i++;
  }
  flushParagraph();
  return <div>{nodes}</div>;
}

export default async function GuideArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, articleSummaries] = await Promise.all([
    fetchArticle(slug),
    fetchArticleSummaries(),
  ]);
  if (!article) notFound();
  const eventsTags = extractEventsTags(article.body);
  const hasCirclesBlock = /\{\{circles/.test(article.body);
  const [eventsByTagEntries, circles] = await Promise.all([
    Promise.all(eventsTags.map(async (tag) => [tag ?? '', await fetchCategoryEvents(article.category, tag)] as const)),
    hasCirclesBlock ? fetchCircles(article.category) : Promise.resolve([]),
  ]);
  const eventsByTag = new Map<string, PublicArticleEvent[]>(eventsByTagEntries);
  const hasInlineCta = /\{\{cta:/.test(article.body);

  const articleUrl = `${SITE_URL}/guide/${slug}`;
  const articleImage = ogImageFor(article);
  const faqItems = extractFaqItems(article.body);
  const relatedArticles = pickRelatedArticles(articleSummaries, article);
  const articleDescription = article.excerpt;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}#website`,
        url: SITE_URL,
        name: 'COMIU',
        inLanguage: 'ja',
      },
      {
        '@type': 'WebPage',
        '@id': `${articleUrl}#webpage`,
        url: articleUrl,
        name: article.title,
        description: articleDescription,
        inLanguage: 'ja',
        isPartOf: { '@id': `${SITE_URL}#website` },
        breadcrumb: { '@id': `${articleUrl}#breadcrumb` },
        mainEntity: { '@id': `${articleUrl}#article` },
      },
      {
        '@type': 'Article',
        '@id': `${articleUrl}#article`,
        headline: article.title,
        description: articleDescription,
        image: articleImage,
        datePublished: article.publishedAt ?? undefined,
        dateModified: article.updatedAt ?? article.publishedAt ?? undefined,
        inLanguage: 'ja',
        mainEntityOfPage: { '@id': `${articleUrl}#webpage` },
        articleSection: article.category ?? undefined,
        keywords: article.targetKeyword ?? undefined,
        author: { '@type': 'Organization', name: 'COMIU' },
        publisher: { '@type': 'Organization', name: 'COMIU', logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.png` } },
        url: articleUrl,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${articleUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'COMIU', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'ガイド', item: `${SITE_URL}/guide` },
          { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
        ],
      },
      ...(faqItems.length > 0 ? [{
        '@type': 'FAQPage',
        '@id': `${articleUrl}#faq`,
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }] : []),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <main className="min-h-screen bg-[#F7F8FA] text-gray-900">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center gap-4 px-5 py-4">
            <Link href="/organizers" className="flex items-center gap-2 font-bold">
              <Image src="/icon.png" alt="" width={32} height={32} className="rounded-lg" />
              COMIU
            </Link>
            <Link href="/guide" className="ml-auto text-sm font-bold text-gray-500 hover:text-gray-900">記事一覧</Link>
          </div>
        </header>

        <article className="mx-auto max-w-3xl px-3 py-10 sm:px-5">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 shadow-sm sm:px-9">
            <div className="flex flex-wrap items-center gap-2">
              {article.category && (
                <Link href={`/guide/tag/${encodeURIComponent(article.category)}`} className="rounded-full bg-[#06C755]/10 px-3 py-1 text-xs font-bold text-[#06C755] hover:bg-[#06C755]/20">
                  {article.category}
                </Link>
              )}
              {(article.areaTags ?? []).map((area) => (
                <Link key={area} href={`/guide/area/${encodeURIComponent(area)}`} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 hover:bg-gray-200">
                  {area}
                </Link>
              ))}
              {article.targetKeyword && <span className="text-xs text-gray-400">{article.targetKeyword}</span>}
            </div>
            <h1 className="mt-4 text-2xl font-bold leading-tight text-gray-950 sm:text-3xl">{article.title}</h1>
            <div className="my-8 h-px bg-gray-100" />
            <BodyRenderer body={article.body} eventsByTag={eventsByTag} circles={circles} />
          </div>

          {!hasInlineCta && (
            <div className="mt-6 rounded-xl border border-[#06C755]/20 bg-[#06C755]/5 px-6 py-6">
              <p className="text-sm font-bold text-gray-950">{article.ctaTitle || 'COMIUで主催者向けWEBサイトと予約管理をまとめる'}</p>
              <p className="mt-2 text-sm leading-7 text-gray-600">
                {article.ctaDescription || '団体紹介、記事導線、予約画面、参加者管理をひとつにつなげられます。'}
              </p>
              <Link href={article.ctaHref || '/organizers'} className="mt-4 inline-flex rounded-lg bg-[#06C755] px-5 py-3 text-sm font-bold text-white hover:opacity-90">
                {article.ctaLabel || 'COMIUを見る'}
              </Link>
            </div>
          )}

          {relatedArticles.length > 0 && (
            <section className="mt-6 rounded-xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-950">関連する記事</h2>
              <div className="mt-4 grid gap-3">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    href={`/guide/${related.slug}`}
                    className="rounded-lg border border-gray-100 p-4 transition hover:border-[#06C755]/40 hover:bg-[#06C755]/5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {related.category && <span className="rounded-full bg-[#06C755]/10 px-2 py-0.5 text-[11px] font-bold text-[#06C755]">{related.category}</span>}
                      {related.targetKeyword && <span className="text-[11px] text-gray-400">{related.targetKeyword}</span>}
                    </div>
                    <p className="mt-2 text-sm font-bold leading-6 text-gray-950">{related.title}</p>
                    {related.excerpt && <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{related.excerpt}</p>}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
    </>
  );
}
