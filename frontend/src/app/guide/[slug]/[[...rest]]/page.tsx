import type { Metadata } from 'next';
import { isValidElement, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { API_URL, SITE_URL } from '@/lib/config';
import { ACTIVITY_TAG_EVENT_CATEGORY, ALL_LOCATION_TAGS, AREA_SLUG_TO_JAPANESE, CATEGORY_SLUG_TO_JAPANESE, WARD_SUBAREAS, buildCategoryAreaPath } from '@/lib/lpTags';
import { HubPage, buildHubMetadata, fetchBlogPostsByCategory, buildTeamRelated, RelatedArticleCard } from '../../_hub/hubPage';
import EventsAreaFilter from '../EventsAreaFilter';
import EventsTagFilter from '../EventsTagFilter';
import CircleCardReveal from '../CircleCardReveal';
import PublicFooter from '@/components/public/PublicFooter';
import { DEFAULT_EVENT_IMAGE } from '@/lib/defaultImages';
import { buildAutoSeoDescription, buildSeoProfileFromTenant } from '@/lib/tenantSeo';

export const revalidate = 60;

// This route doubles as both the article-detail page (/guide/[slug]) and, for the 5 activity
// categories, the path-based category(+area) hub page (/guide/[categorySlug]/[ward]/[subarea]).
// Next.js can't have two differently-named dynamic segments as siblings under /guide/, so both
// live in this one optional-catch-all file instead of separate routes.
type HubResolution =
  | { kind: 'hub'; category: string; area: string }
  | { kind: 'invalid' }
  | { kind: 'article' };

function resolveRoute(slug: string, rest?: string[]): HubResolution {
  const category = CATEGORY_SLUG_TO_JAPANESE[slug];
  if (!category) {
    if (rest && rest.length > 0) return { kind: 'invalid' };
    return { kind: 'article' };
  }
  const segments = rest ?? [];
  if (segments.length === 0) return { kind: 'hub', category, area: '' };
  if (segments.length === 1) {
    const area = AREA_SLUG_TO_JAPANESE[segments[0]];
    if (!area) return { kind: 'invalid' };
    // Sub-areas (千川 etc.) only exist nested under their ward - no standalone /guide/x/senkawa.
    const isSubarea = Object.values(WARD_SUBAREAS).some((subs) => (subs as readonly string[]).includes(area));
    if (isSubarea) return { kind: 'invalid' };
    return { kind: 'hub', category, area };
  }
  if (segments.length === 2) {
    const ward = AREA_SLUG_TO_JAPANESE[segments[0]];
    const subarea = AREA_SLUG_TO_JAPANESE[segments[1]];
    if (!ward || !subarea) return { kind: 'invalid' };
    const validSubareas = WARD_SUBAREAS[ward];
    if (!validSubareas || !validSubareas.includes(subarea)) return { kind: 'invalid' };
    return { kind: 'hub', category, area: subarea };
  }
  return { kind: 'invalid' };
}

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

async function fetchCategoryEvents(category?: string | null, tag?: string, typeTags?: string[]): Promise<PublicArticleEvent[]> {
  // typeTags (団体種別) broadens the fetch to every category for matching tenants, ignoring
  // this article's own category entirely.
  const hasTypeTags = (typeTags ?? []).length > 0;
  const eventCategory = category ? ACTIVITY_TAG_EVENT_CATEGORY[category] : undefined;
  if (!hasTypeTags && !eventCategory) return [];
  try {
    const params = new URLSearchParams();
    if (!hasTypeTags && eventCategory) params.set('category', eventCategory);
    if (tag) params.set('tag', tag);
    if (hasTypeTags) params.set('typeTags', (typeTags ?? []).join(','));
    const res = await fetch(`${API_URL}/api/public/events?${params.toString()}`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// Ranks areas by how many upcoming events of this category they host, mirroring the "イベント"
// column on the superadmin area-hubs summary table - used to link to the most active area hubs
// from the bottom of an article, without needing a per-area fetch for each candidate.
async function fetchAreaEventCounts(category?: string | null): Promise<{ area: string; count: number }[]> {
  const events = await fetchCategoryEvents(category);
  const locationSet = new Set<string>(ALL_LOCATION_TAGS);
  const counts = new Map<string, number>();
  for (const event of events) {
    for (const tag of event.tags ?? []) {
      if (!locationSet.has(tag)) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);
}

type EventsFetchKey = { tag?: string; typeTags: string[] };

function eventsFetchKeyString(key: EventsFetchKey): string {
  return JSON.stringify([key.tag ?? '', key.typeTags]);
}

// Each {{events}} marker needs its own fetch keyed by tag+typeTags - except blocks with the
// tag-tab filter enabled, which always need the unfiltered category-wide list (tags[4]) so every
// tag among that category's events can be offered as a tab, regardless of the block's own picker.
function extractEventsFetchKeys(body: string): EventsFetchKey[] {
  const seen = new Map<string, EventsFetchKey>();
  for (const raw of body.split('\n')) {
    const match = EVENTS_RE.exec(raw.trim());
    if (!match) continue;
    const key: EventsFetchKey = {
      tag: match[4] === 'true' ? undefined : (match[2] || undefined),
      typeTags: match[5] ? match[5].split(',').filter(Boolean) : [],
    };
    seen.set(eventsFetchKeyString(key), key);
  }
  return Array.from(seen.values());
}

// The article's circles blocks all share one fetched list (matching how multiple {{circles}}
// markers already reuse the same category-filtered array) - so typeTags is read from whichever
// circles marker specifies it first.
function extractCirclesTypeTags(body: string): string[] {
  for (const raw of body.split('\n')) {
    const match = CIRCLES_RE.exec(raw.trim());
    if (match) return match[2] ? match[2].split(',').filter(Boolean) : [];
  }
  return [];
}

async function fetchCircles(category?: string | null, typeTags?: string[]): Promise<PublicArticleTenant[]> {
  const hasTypeTags = (typeTags ?? []).length > 0;
  if (!hasTypeTags && !category) return [];
  try {
    const params = new URLSearchParams();
    if (!hasTypeTags && category) params.set('activityTag', category);
    if (hasTypeTags) params.set('typeTags', (typeTags ?? []).join(','));
    const res = await fetch(`${API_URL}/api/public/tenants?${params.toString()}`, { next: { revalidate } });
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

function EventsBlock({
  events,
  heading,
  showFilterTag,
  areaSearchEnabled,
}: {
  events: PublicArticleEvent[];
  heading: string;
  showFilterTag?: boolean;
  areaSearchEnabled?: boolean;
}) {
  if (events.length === 0) return null;
  return (
    <div className="my-6">
      {heading && <h2 className="mb-3 text-lg font-bold text-gray-950">{heading}</h2>}
      {showFilterTag ? (
        <EventsTagFilter events={events} />
      ) : areaSearchEnabled ? (
        <EventsAreaFilter events={events} />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {events.map((event) => <EventCardMini key={event.id} event={event} />)}
        </div>
      )}
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
    const faqBlock = FAQ_RE.exec(line);
    if (faqBlock) {
      for (const { q, a } of decodeFaq(faqBlock[1])) {
        const question = plainMarkdown(q);
        const answer = plainMarkdown(a);
        if (question && answer) items.push({ question, answer });
      }
      continue;
    }
    if (/^##\s+よくある質問/.test(line)) {
      inFaq = true;
      continue;
    }
    if (!inFaq) continue;
    if (line.startsWith('## ')) {
      pushCurrent();
      inFaq = false;
      continue;
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; rest?: string[] }>;
}): Promise<Metadata> {
  const { slug, rest } = await params;
  const resolution = resolveRoute(slug, rest);
  if (resolution.kind === 'hub') return buildHubMetadata(resolution.category, resolution.area);
  if (resolution.kind === 'invalid') return {};

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
const EVENTS_RE = /^\{\{events(?::([^|}]*)(?:\|([^|}]*)(?:\|(true|false)(?:\|(true|false)(?:\|([^}]*))?)?)?)?)?\}\}$/;
const CIRCLES_RE = /^\{\{circles(?::([^|}]*)(?:\|([^}]*))?)?\}\}$/;
const TABLE_RE = /^\{\{table:(.+)\}\}$/;
const CARD_SLIDER_RE = /^\{\{cardslider:(.+)\}\}$/;
const FAQ_RE = /^\{\{faq:(.+)\}\}$/;
const OWN_CIRCLE_RE = /^\{\{owncircle(?::([^}]*))?\}\}$/;
const EXTERNAL_CIRCLE_RE = /^\{\{extcircle:([^|]*)\|([^|]*)\|([^|]*)\|(.*)\}\}$/;

function decodeTable(encoded: string): string[][] {
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (Array.isArray(parsed) && parsed.every((row) => Array.isArray(row))) return parsed;
  } catch {
    // fall through to default
  }
  return [];
}

type CardItem = { imageUrl: string; name: string; description: string; href: string; imageSize?: 'small' | 'medium' | 'large' };
const CARD_IMAGE_SIZE_CLASS: Record<string, string> = {
  small: 'w-1/3',
  medium: 'w-2/3',
  large: 'w-full',
};

function decodeCardItems(encoded: string): CardItem[] {
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through to default
  }
  return [];
}

type FaqPair = { q: string; a: string };

function decodeFaq(encoded: string): FaqPair[] {
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through to default
  }
  return [];
}

function FaqBlock({ items }: { items: FaqPair[] }) {
  const valid = items.filter((item) => item.q && item.a);
  if (valid.length === 0) return null;
  return (
    <div className="my-6 space-y-3">
      {valid.map((item, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="font-bold text-gray-900">Q. {item.q}</p>
          <p className="mt-2 text-sm leading-7 text-gray-600">A. {item.a}</p>
        </div>
      ))}
    </div>
  );
}

type OwnCircleTenant = {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  href: string;
};

// {{owncircle:code}} embeds a live-fetched COMIU-registered circle, unlike the manually-typed
// cardSlider/imageText blocks used for external (non-COMIU) circles - so its name/image/link stay
// accurate even after the organizer edits their own public page.
async function fetchOwnCircle(code: string): Promise<OwnCircleTenant | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${encodeURIComponent(code)}`, { next: { revalidate } });
    if (!res.ok) return null;
    const tenant = await res.json();
    const slug = tenant.pages?.[0]?.slug;
    const name: string = tenant.name || tenant.lineDisplayName;
    // Most tenants haven't filled in the plain "description" field, so fall back to whatever
    // actually renders as this tenant's real SEO meta description (manual seoDescription, or
    // the same auto-generated text clubs/[tenantCode]/[slug]/page.tsx uses) instead of showing
    // nothing.
    const description: string =
      tenant.description || tenant.pages?.[0]?.seoDescription || buildAutoSeoDescription(name, buildSeoProfileFromTenant(tenant));
    return {
      // Prefer the tenant's proper name over lineDisplayName - this block represents the team
      // in official editorial copy, where the LINE OA's casually-cased chat display name (e.g.
      // "gakuori") isn't the intended public brand casing.
      name,
      description,
      imageUrl: tenant.linePictureUrl,
      href: slug ? `/clubs/${tenant.code}/${slug}` : `/clubs/${tenant.code}`,
    };
  } catch {
    return null;
  }
}

function extractOwnCircleCodes(body: string): string[] {
  const codes = new Set<string>();
  for (const raw of body.split('\n')) {
    const match = OWN_CIRCLE_RE.exec(raw.trim());
    if (match?.[1]) codes.add(match[1]);
  }
  return Array.from(codes);
}

function OwnCircleBlock({ tenant }: { tenant: OwnCircleTenant | null | undefined }) {
  if (!tenant) return null;
  return (
    <Link href={tenant.href} className="my-6 flex gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {tenant.imageUrl ? (
        <Image src={tenant.imageUrl} alt="" width={80} height={80} unoptimized className="h-20 w-20 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#06C755] to-[#047a35]">
          <span className="text-xl font-bold text-white">{tenant.name.slice(0, 1)}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-950">{tenant.name}</p>
        {tenant.description && <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{tenant.description}</p>}
        <p className="mt-2 text-xs font-bold text-[#06C755]">団体ページを見る →</p>
      </div>
    </Link>
  );
}

// Introduces a circle not registered on COMIU (imageUrl/name/description/href are hand-entered
// by the article author, unlike OwnCircleBlock's live-fetched data) - same card visual as
// OwnCircleBlock for consistency when the two are mixed in the same numbered list.
function ExternalCircleBlock({ imageUrl, name, description, href }: { imageUrl?: string; name?: string; description?: string; href?: string }) {
  if (!name) return null;
  const content = (
    <>
      <Image src={imageUrl || DEFAULT_EVENT_IMAGE} alt="" width={80} height={80} unoptimized className="h-20 w-20 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-950">{name}</p>
        {description && <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{description}</p>}
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} target="_blank" rel="noopener noreferrer" className="my-6 flex gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        {content}
      </Link>
    );
  }
  return <div className="my-6 flex gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">{content}</div>;
}

function CardSliderBlock({ items }: { items: CardItem[] }) {
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
              // eslint-disable-next-line @next/next/no-img-element
              (() => {
                // The size class + mx-auto go on the wrapping element (not the <img>) so the
                // <img>'s own width can just be 100% of that already-sized box - a percentage
                // width directly on the <img> here would need to resolve against a flex item
                // whose own size depends on the <img>, a circular case browsers resolve by
                // just ignoring the intended centering.
                const img = <img src={item.imageUrl} alt={item.name} className="block h-auto w-full" />;
                const sizeClass = CARD_IMAGE_SIZE_CLASS[item.imageSize ?? 'medium'];
                return (
                  <div className="pt-4">
                    {item.href ? (
                      <Link href={item.href} className={`mx-auto block ${sizeClass}`}>{img}</Link>
                    ) : (
                      <div className={`mx-auto ${sizeClass}`}>{img}</div>
                    )}
                  </div>
                );
              })()
            )}
            <div className="flex flex-1 flex-col p-4">
              {item.name && <p className="text-center text-base font-bold text-gray-950">{item.name}</p>}
              {item.description && (
                <p className="mt-2 flex-1 text-[15px] leading-[1.75] text-[#333333]">{item.description}</p>
              )}
              {item.href && (
                <Link href={item.href} className="mt-3 inline-flex text-sm font-bold text-[#06C755] hover:underline">
                  {item.name}の活動を見る →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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

function BodyRenderer({
  body,
  eventsByTag,
  circles,
  category,
  ownCirclesByCode,
}: {
  body: string;
  eventsByTag: Map<string, PublicArticleEvent[]>;
  circles: PublicArticleTenant[];
  category?: string | null;
  ownCirclesByCode: Map<string, OwnCircleTenant | null>;
}) {
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
      const showFilterTag = events[4] === 'true';
      const fetchKey = showFilterTag ? undefined : eventsTag;
      const eventsTypeTags = events[5] ? events[5].split(',').filter(Boolean) : [];
      nodes.push(
        <EventsBlock
          key={i}
          events={eventsByTag.get(eventsFetchKeyString({ tag: fetchKey, typeTags: eventsTypeTags })) ?? []}
          heading={events[1] ?? ''}
          showFilterTag={showFilterTag}
          areaSearchEnabled={events[3] === 'true'}
        />,
      );
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
                      <div className="overflow-x-auto whitespace-nowrap px-3 py-2.5 leading-relaxed [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">{renderCellContent(cell)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 1 ? 'bg-gray-50' : ''}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="max-w-[240px] min-w-[110px] border border-gray-200 p-0 align-top text-[#333333]">
                        <div className="overflow-x-auto whitespace-nowrap px-3 py-2.5 leading-relaxed [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">{renderCellContent(cell)}</div>
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
    const cardSlider = CARD_SLIDER_RE.exec(line);
    if (cardSlider) {
      flushParagraph();
      nodes.push(<CardSliderBlock key={i} items={decodeCardItems(cardSlider[1])} />);
      i++;
      continue;
    }
    const faq = FAQ_RE.exec(line);
    if (faq) {
      flushParagraph();
      nodes.push(<FaqBlock key={i} items={decodeFaq(faq[1])} />);
      i++;
      continue;
    }
    const ownCircle = OWN_CIRCLE_RE.exec(line);
    if (ownCircle) {
      flushParagraph();
      const code = ownCircle[1];
      nodes.push(<OwnCircleBlock key={i} tenant={code ? ownCirclesByCode.get(code) : null} />);
      i++;
      continue;
    }
    const externalCircle = EXTERNAL_CIRCLE_RE.exec(line);
    if (externalCircle) {
      flushParagraph();
      nodes.push(
        <ExternalCircleBlock
          key={i}
          imageUrl={externalCircle[1] || undefined}
          href={externalCircle[2] || undefined}
          name={externalCircle[3] || undefined}
          description={externalCircle[4].replace(/\\n/g, '\n') || undefined}
        />,
      );
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
  return <div>{groupExtraCircleCards(nodes)}</div>;
}

// Keeps the first CIRCLE_CARD_VISIBLE_LIMIT own/external circle-card blocks visible as-is; any
// beyond that are collected (in place) into a CircleCardReveal group per contiguous run, so a
// long recommendation list doesn't overwhelm the page while still keeping every card in the
// HTML for SEO (CircleCardReveal renders every item, just visually collapsed until revealed).
const CIRCLE_CARD_VISIBLE_LIMIT = 5;

function isCircleCardNode(node: ReactNode): boolean {
  return isValidElement(node) && (node.type === OwnCircleBlock || node.type === ExternalCircleBlock);
}

function groupExtraCircleCards(nodes: ReactNode[]): ReactNode[] {
  const result: ReactNode[] = [];
  let visibleCount = 0;
  let collapsed: ReactNode[] = [];
  const flushCollapsed = () => {
    if (collapsed.length > 0) {
      result.push(<CircleCardReveal key={`more-${result.length}`} items={collapsed} />);
      collapsed = [];
    }
  };
  for (const node of nodes) {
    if (isCircleCardNode(node)) {
      visibleCount++;
      if (visibleCount <= CIRCLE_CARD_VISIBLE_LIMIT) {
        result.push(node);
      } else {
        collapsed.push(node);
      }
    } else {
      flushCollapsed();
      result.push(node);
    }
  }
  flushCollapsed();
  return result;
}

export default async function GuideArticlePage({
  params,
}: {
  params: Promise<{ slug: string; rest?: string[] }>;
}) {
  const { slug, rest } = await params;
  const resolution = resolveRoute(slug, rest);
  if (resolution.kind === 'invalid') notFound();
  if (resolution.kind === 'hub') return <HubPage category={resolution.category} area={resolution.area} />;

  const article = await fetchArticle(slug);
  if (!article) notFound();
  const eventsFetchKeys = extractEventsFetchKeys(article.body);
  const hasCirclesBlock = /\{\{circles/.test(article.body);
  const circlesTypeTags = hasCirclesBlock ? extractCirclesTypeTags(article.body) : [];
  const ownCircleCodes = extractOwnCircleCodes(article.body);
  const [eventsByTagEntries, circles, ownCircleEntries] = await Promise.all([
    Promise.all(eventsFetchKeys.map(async (key) => [eventsFetchKeyString(key), await fetchCategoryEvents(article.category, key.tag, key.typeTags)] as const)),
    hasCirclesBlock ? fetchCircles(article.category, circlesTypeTags) : Promise.resolve([]),
    Promise.all(ownCircleCodes.map(async (code) => [code, await fetchOwnCircle(code)] as const)),
  ]);
  const eventsByTag = new Map<string, PublicArticleEvent[]>(eventsByTagEntries);
  const ownCirclesByCode = new Map<string, OwnCircleTenant | null>(ownCircleEntries);
  const hasInlineCta = /\{\{cta:/.test(article.body);

  const articleUrl = `${SITE_URL}/guide/${slug}`;
  const articleImage = ogImageFor(article);
  const faqItems = extractFaqItems(article.body);
  const articleDescription = article.excerpt;

  const isHubCategory = !!(article.category && ACTIVITY_TAG_EVENT_CATEGORY[article.category]);
  const [blogPostsForCategory, areaEventCounts] = isHubCategory
    ? await Promise.all([
        fetchBlogPostsByCategory(article.category!, 10, 2),
        fetchAreaEventCounts(article.category),
      ])
    : [[], []];
  const teamRelatedByCategory = isHubCategory ? buildTeamRelated(blogPostsForCategory, 10) : [];
  const topAreasForCategory = areaEventCounts.slice(0, 8);
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
            <Link href="/" className="flex items-center gap-2 font-bold">
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
                <Link href={buildCategoryAreaPath(article.category)} className="rounded-full bg-[#06C755]/10 px-3 py-1 text-xs font-bold text-[#06C755] hover:bg-[#06C755]/20">
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
            <BodyRenderer body={article.body} eventsByTag={eventsByTag} circles={circles} category={article.category} ownCirclesByCode={ownCirclesByCode} />
          </div>

          {teamRelatedByCategory.length > 0 && (
            <section className="mt-6 rounded-xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-950">{`団体の${article.category}記事`}</h2>
              <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {teamRelatedByCategory.map((item) => <RelatedArticleCard key={item.id} item={item} />)}
              </div>
            </section>
          )}

          {topAreasForCategory.length > 0 && (
            <section className="mt-6 rounded-xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-950">{`${article.category}の活動が多い地域`}</h2>
              <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {topAreasForCategory.map(({ area, count }) => (
                  <Link
                    key={area}
                    href={buildCategoryAreaPath(article.category!, area)}
                    className="flex w-56 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-64"
                  >
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="line-clamp-2 text-sm font-bold leading-5">{`${area}の${article.category}`}</h3>
                      <p className="mt-2 text-xs leading-5 text-gray-500">{`現在${count}件のイベントを開催中`}</p>
                      <p className="mt-3 text-[11px] font-bold text-gray-400">エリアの情報を見る</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

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
        </article>
      </main>
      <PublicFooter />
    </>
  );
}
