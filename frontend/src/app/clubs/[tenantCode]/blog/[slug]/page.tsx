import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { API_URL, SITE_URL, IMAGE_BASE_URL } from '@/lib/config';
import { imgUrl } from '@/lib/imgUrl';
import { DEFAULT_EVENT_IMAGE } from '@/lib/defaultImages';
import type { BlogPost, BlogPostSummary, LiffEvent } from '@/lib/api';
import { EventCardMini, RelatedArticleCard, buildOfficialRelated, type OfficialArticle, type RelatedArticle } from '@/app/guide/_hub/hubPage';

export const revalidate = 60;

async function fetchPost(tenantCode: string, slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}/blog/${slug}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const RELATED_LIMIT = 6;

async function fetchSameTenantPosts(tenantCode: string, excludeId: string): Promise<BlogPostSummary[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}/blog`, { next: { revalidate } });
    if (!res.ok) return [];
    const posts: BlogPostSummary[] = await res.json();
    return posts.filter((p) => p.id !== excludeId).slice(0, RELATED_LIMIT);
  } catch {
    return [];
  }
}

async function fetchOfficialArticles(): Promise<OfficialArticle[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles?limit=${RELATED_LIMIT}`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchTenantHome(tenantCode: string): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}`, { next: { revalidate } });
    if (!res.ok) return `/clubs/${tenantCode}`;
    const tenant: { pages?: Array<{ slug: string }> } = await res.json();
    const primarySlug = tenant.pages?.[0]?.slug;
    return primarySlug ? `/clubs/${tenantCode}/${primarySlug}` : `/clubs/${tenantCode}`;
  } catch {
    return `/clubs/${tenantCode}`;
  }
}

async function fetchUpcomingEvents(tenantCode: string): Promise<LiffEvent[]> {
  try {
    const res = await fetch(`${API_URL}/api/liff/${tenantCode}/events`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function firstImageFromBody(body: string): string | null {
  const match = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return match?.[1] ?? null;
}

// The one image a post can have is promoted to the eyecatch slot at the top of the article,
// so it's dropped from its original spot in the body to avoid showing it twice.
function stripFirstImageLine(body: string): string {
  return body
    .split('\n')
    .filter((line) => !IMAGE_RE.test(line.trim()))
    .join('\n');
}

function cleanDescription(text: string): string {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/[*_~`>|\\]/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantCode: string; slug: string }>;
}): Promise<Metadata> {
  const { tenantCode, slug } = await params;
  const post = await fetchPost(tenantCode, slug);
  if (!post) return {};
  const tenantName = post.tenant?.lineDisplayName ?? post.tenant?.name ?? tenantCode;
  const description = post.excerpt ?? cleanDescription(post.body);
  const image =
    firstImageFromBody(post.body) ??
    imgUrl(post.tenant?.linePictureUrl ?? post.tenant?.iconUrl, IMAGE_BASE_URL) ??
    `${SITE_URL}/opengraph-image`;
  return {
    title: `${post.title} | ${tenantName}`,
    description,
    alternates: { canonical: `${SITE_URL}/clubs/${tenantCode}/blog/${slug}` },
    openGraph: {
      title: `${post.title} | ${tenantName}`,
      description,
      type: 'article',
      publishedTime: post.publishedAt ?? undefined,
      url: `${SITE_URL}/clubs/${tenantCode}/blog/${slug}`,
      locale: 'ja_JP',
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | ${tenantName}`,
      description,
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

function estimateReadingMinutes(body: string): number {
  return Math.max(1, Math.ceil(body.length / 500));
}

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;

function linkifyText(text: string, keyPrefix: string) {
  const parts = text.split(/(https?:\/\/[^\s\])}"'」』]+)/g);
  return parts.flatMap((part, i) => {
    if (!/^https?:\/\//.test(part)) return [part];
    const m = part.match(/^(.*?)([.,!?！?。、]*)$/);
    const url = m ? m[1] : part;
    const trailing = m ? m[2] : '';
    return [
      <a key={`${keyPrefix}-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="underline">{url}</a>,
      trailing,
    ];
  });
}

// AIが生成した原稿にありがちな「**太字**」を見出し/強調として解釈できるようにする
function renderInline(text: string, keyPrefix: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return segments.flatMap((seg, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(seg);
    if (m) return <strong key={`${keyPrefix}-b-${i}`}>{linkifyText(m[1], `${keyPrefix}-b-${i}`)}</strong>;
    return linkifyText(seg, `${keyPrefix}-${i}`);
  });
}

const HEADING_LINE_RE = /^(#{1,6})\s+(.+)$/;
const BOLD_ONLY_LINE_RE = /^\*\*([^*]+)\*\*$/;
const BULLET_LINE_RE = /^(?:[-*]\s+|・\s*)(.+)$/;
const ORDERED_LINE_RE = /^\d+(?:[.)]\s+|．\s*)(.+)$/;
const QUOTE_LINE_RE = /^>\s?(.+)$/;
const DIVIDER_LINE_RE = /^(-{3,}|\*{3,}|_{3,})$/;
const QUESTION_LINE_RE = /^Q[:.：。]\s*(.+)$/i;
const ANSWER_LINE_RE = /^A[:.：。]\s*(.+)$/i;
const CALLOUT_LINE_RE = /^!\s?(.+)$/;
const TABLE_ROW_RE = /^\|(.+)\|$/;
const TABLE_SEPARATOR_ROW_RE = /^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?$/;

function parseTableRow(line: string): string[] {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

// マークダウン記号なしで「短い行＝見出し／箇条書き」として書かれた原稿
// （句読点で終わらない短い行が、それだけで見出しや項目を意味しているケース）も
// 装飾できるようにするための簡易判定。通常の文は句点などで終わることがほとんどなので、
// 「句読点で終わらない」「短い」の2条件で見出し・箇条書きらしさを推定する。
const TERMINAL_PUNCTUATION_RE = /[。！？!?…]$/;
const NAKED_HEADING_MAX_LENGTH = 30;
const NAKED_LIST_ITEM_MAX_LENGTH = 40;

function looksLikeNakedHeading(line: string): boolean {
  return line.length > 0 && line.length <= NAKED_HEADING_MAX_LENGTH && !TERMINAL_PUNCTUATION_RE.test(line);
}

function looksLikeNakedListItem(line: string): boolean {
  return line.length > 0 && line.length <= NAKED_LIST_ITEM_MAX_LENGTH && !TERMINAL_PUNCTUATION_RE.test(line);
}

type BodyGroup =
  | { type: 'image'; alt: string; url: string }
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'divider' }
  | { type: 'faq'; items: { q: string; a: string }[] }
  | { type: 'callout'; text: string }
  | { type: 'table'; rows: string[][] };

// 見出し・画像・リスト・引用・区切り線だけを区切りとして扱い、それ以外の
// 連続する行は（空行を挟むまで）ひとつの段落としてまとめる。1文ごとに
// 改行された原稿でも、見た目上バラバラの段落に分かれてしまわないようにするため。
function groupBody(body: string): BodyGroup[] {
  const groups: BodyGroup[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let quoteLines: string[] = [];
  let faqItems: { q: string; a: string }[] = [];
  let pendingQuestion: string | null = null;
  let calloutLines: string[] = [];
  let tableRows: string[][] = [];

  function flushParagraph() {
    if (paragraphLines.length === 0) return;
    if (paragraphLines.length === 1 && looksLikeNakedHeading(paragraphLines[0])) {
      groups.push({ type: 'heading', level: 2, text: paragraphLines[0] });
    } else if (paragraphLines.length >= 2 && paragraphLines.every(looksLikeNakedListItem)) {
      groups.push({ type: 'list', ordered: false, items: [...paragraphLines] });
    } else {
      groups.push({ type: 'paragraph', text: paragraphLines.join(' ') });
    }
    paragraphLines = [];
  }
  function flushList() {
    if (listItems.length === 0) return;
    groups.push({ type: 'list', ordered: listOrdered, items: listItems });
    listItems = [];
  }
  function flushQuote() {
    if (quoteLines.length === 0) return;
    groups.push({ type: 'quote', text: quoteLines.join(' ') });
    quoteLines = [];
  }
  // 回答が来ないまま次の質問や別の内容に切り替わった場合、質問を消さず段落として残す
  function flushPendingQuestion() {
    if (pendingQuestion === null) return;
    groups.push({ type: 'paragraph', text: `Q. ${pendingQuestion}` });
    pendingQuestion = null;
  }
  function flushFaqItems() {
    if (faqItems.length === 0) return;
    groups.push({ type: 'faq', items: faqItems });
    faqItems = [];
  }
  function flushFaq() {
    flushPendingQuestion();
    flushFaqItems();
  }
  function flushCallout() {
    if (calloutLines.length === 0) return;
    groups.push({ type: 'callout', text: calloutLines.join(' ') });
    calloutLines = [];
  }
  function flushTable() {
    if (tableRows.length === 0) return;
    groups.push({ type: 'table', rows: tableRows });
    tableRows = [];
  }
  // 空行はQ&Aの組同士の区切りとしてもよく使われるため、空行だけではFAQをまとめ終わらせない
  function flushSoft() {
    flushParagraph();
    flushList();
    flushQuote();
    flushCallout();
    flushTable();
  }
  function flushAll() {
    flushSoft();
    flushFaq();
  }

  for (const rawLine of body.split('\n')) {
    const trimmed = rawLine.trim();
    if (trimmed === '') {
      flushSoft();
      continue;
    }

    const img = IMAGE_RE.exec(trimmed);
    if (img) {
      flushAll();
      groups.push({ type: 'image', alt: img[1], url: img[2] });
      continue;
    }

    if (DIVIDER_LINE_RE.test(trimmed)) {
      flushAll();
      groups.push({ type: 'divider' });
      continue;
    }

    const heading = HEADING_LINE_RE.exec(trimmed);
    if (heading) {
      flushAll();
      groups.push({ type: 'heading', level: heading[1].length <= 2 ? 2 : 3, text: heading[2] });
      continue;
    }

    const boldOnly = BOLD_ONLY_LINE_RE.exec(trimmed);
    if (boldOnly) {
      flushAll();
      groups.push({ type: 'heading', level: 2, text: boldOnly[1] });
      continue;
    }

    const tableRow = TABLE_ROW_RE.exec(trimmed);
    if (tableRow) {
      flushParagraph();
      flushList();
      flushQuote();
      flushFaq();
      flushCallout();
      if (!TABLE_SEPARATOR_ROW_RE.test(trimmed)) tableRows.push(parseTableRow(tableRow[1]));
      continue;
    }

    const callout = CALLOUT_LINE_RE.exec(trimmed);
    if (callout) {
      flushParagraph();
      flushList();
      flushQuote();
      flushFaq();
      flushTable();
      calloutLines.push(callout[1]);
      continue;
    }

    const question = QUESTION_LINE_RE.exec(trimmed);
    if (question) {
      flushParagraph();
      flushList();
      flushQuote();
      flushCallout();
      flushTable();
      flushPendingQuestion();
      pendingQuestion = question[1];
      continue;
    }

    const answer = ANSWER_LINE_RE.exec(trimmed);
    if (answer && pendingQuestion !== null) {
      flushParagraph();
      flushList();
      flushQuote();
      flushCallout();
      flushTable();
      faqItems.push({ q: pendingQuestion, a: answer[1] });
      pendingQuestion = null;
      continue;
    }

    const bullet = BULLET_LINE_RE.exec(trimmed);
    if (bullet) {
      flushParagraph();
      flushQuote();
      flushFaq();
      flushCallout();
      flushTable();
      if (listItems.length > 0 && listOrdered) flushList();
      listOrdered = false;
      listItems.push(bullet[1]);
      continue;
    }

    const ordered = ORDERED_LINE_RE.exec(trimmed);
    if (ordered) {
      flushParagraph();
      flushQuote();
      flushFaq();
      flushCallout();
      flushTable();
      if (listItems.length > 0 && !listOrdered) flushList();
      listOrdered = true;
      listItems.push(ordered[1]);
      continue;
    }

    const quote = QUOTE_LINE_RE.exec(trimmed);
    if (quote) {
      flushParagraph();
      flushList();
      flushFaq();
      flushCallout();
      flushTable();
      quoteLines.push(quote[1]);
      continue;
    }

    flushList();
    flushQuote();
    flushFaq();
    flushCallout();
    flushTable();
    paragraphLines.push(trimmed);
  }
  flushAll();
  return groups;
}

function BodyRenderer({ body }: { body: string }) {
  const groups = groupBody(body);
  return (
    <div className="space-y-4 text-sm leading-8 text-gray-700">
      {groups.map((group, i) => {
        if (group.type === 'image') {
          return (
            <div key={i} className="relative my-2 w-full overflow-hidden rounded-lg" style={{ minHeight: 200 }}>
              <Image
                src={group.url}
                alt={group.alt}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 640px"
              />
            </div>
          );
        }

        if (group.type === 'heading') {
          const content = renderInline(group.text, `h-${i}`);
          return group.level === 2
            ? <h2 key={i} className="mt-8 border-l-4 border-[#06C755] pl-3 text-lg font-bold leading-snug text-gray-950">{content}</h2>
            : <h3 key={i} className="mt-6 text-base font-bold text-gray-950">{content}</h3>;
        }

        if (group.type === 'divider') {
          return <hr key={i} className="my-6 border-gray-200" />;
        }

        if (group.type === 'quote') {
          return (
            <blockquote key={i} className="rounded-lg border-l-4 border-[#06C755] bg-[#06C755]/5 py-3 pl-4 pr-3 text-gray-700">
              {renderInline(group.text, `q-${i}`)}
            </blockquote>
          );
        }

        if (group.type === 'list') {
          return group.ordered ? (
            <ol key={i} className="list-decimal space-y-1.5 pl-5 marker:font-bold marker:text-[#06C755]">
              {group.items.map((item, j) => <li key={j}>{renderInline(item, `li-${i}-${j}`)}</li>)}
            </ol>
          ) : (
            <ul key={i} className="space-y-1.5">
              {group.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-[3px] shrink-0 text-[#06C755]">●</span>
                  <span>{renderInline(item, `li-${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (group.type === 'faq') {
          return (
            <div key={i} className="my-2 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {group.items.map((item, j) => (
                <div key={j} className="p-4">
                  <div className="flex items-start gap-2 font-bold text-gray-900">
                    <span className="mt-0.5 shrink-0 rounded-full bg-[#06C755] px-2 text-xs font-bold leading-6 text-white">Q</span>
                    <span>{renderInline(item.q, `faq-q-${i}-${j}`)}</span>
                  </div>
                  <div className="mt-2 flex items-start gap-2 text-gray-600">
                    <span className="mt-0.5 shrink-0 rounded-full border border-[#06C755] px-2 text-xs font-bold leading-6 text-[#06C755]">A</span>
                    <span>{renderInline(item.a, `faq-a-${i}-${j}`)}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        }

        if (group.type === 'callout') {
          return (
            <div key={i} className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 py-3 pl-3 pr-3 text-amber-900">
              <span className="shrink-0">💡</span>
              <span>{renderInline(group.text, `callout-${i}`)}</span>
            </div>
          );
        }

        if (group.type === 'table') {
          const [header, ...rows] = group.rows;
          return (
            <div key={i} className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {header.map((cell, ci) => (
                      <th key={ci} className="border-b border-gray-200 px-3 py-2 font-bold text-gray-900">{renderInline(cell, `th-${i}-${ci}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 1 ? 'bg-gray-50/50' : undefined}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="border-b border-gray-100 px-3 py-2 text-gray-700">{renderInline(cell, `td-${i}-${ri}-${ci}`)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return <p key={i}>{renderInline(group.text, `line-${i}`)}</p>;
      })}
    </div>
  );
}

function RelatedArticleSection({ heading, items }: { heading: string; items: RelatedArticle[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-gray-950">{heading}</h2>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => <RelatedArticleCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

function UpcomingEventsSection({ tenantCode, tenantName, events }: { tenantCode: string; tenantName: string; events: LiffEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-gray-950">{`すぐ参加できる${tenantName}の活動`}</h2>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {events.map((event) => (
          <EventCardMini key={event.id} event={{ ...event, tenantCode }} />
        ))}
      </div>
    </section>
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ tenantCode: string; slug: string }>;
}) {
  const { tenantCode, slug } = await params;
  const post = await fetchPost(tenantCode, slug);
  if (!post) notFound();

  const tenantName = post.tenant?.lineDisplayName ?? post.tenant?.name ?? tenantCode;
  const tenantIconUrl = imgUrl(post.tenant?.linePictureUrl ?? post.tenant?.iconUrl, IMAGE_BASE_URL);
  const description = post.excerpt ?? cleanDescription(post.body);
  const eyecatchImage =
    firstImageFromBody(post.body) ??
    tenantIconUrl ??
    DEFAULT_EVENT_IMAGE;
  const bodyWithoutEyecatch = stripFirstImageLine(post.body);

  const [sameTenantPosts, officialArticles, tenantHomeHref, upcomingEvents] = await Promise.all([
    fetchSameTenantPosts(tenantCode, post.id),
    fetchOfficialArticles(),
    fetchTenantHome(tenantCode),
    fetchUpcomingEvents(tenantCode),
  ]);
  const sameTenantItems: RelatedArticle[] = sameTenantPosts.map((p) => ({
    id: p.id,
    title: p.title,
    excerpt: p.excerpt,
    imageUrl: p.coverImageUrl ?? null,
    href: `/clubs/${tenantCode}/blog/${p.slug}`,
    matchesBoth: false,
    publishedAt: p.publishedAt ?? null,
  }));
  const comiuRelatedItems: RelatedArticle[] = buildOfficialRelated(officialArticles, '', '', RELATED_LIMIT);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: tenantName },
    publisher: { '@type': 'Organization', name: tenantName },
    url: `${SITE_URL}/clubs/${tenantCode}/blog/${slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <main
        className="min-h-screen pb-32"
        style={{
          backgroundColor: '#F7F8FA',
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(6,199,85,0.05) 0px, rgba(6,199,85,0.05) 1px, transparent 1px, transparent 26px)',
        }}
      >
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="mb-6 flex items-center gap-3">
            <Link href={`/clubs/${tenantCode}/blog`} className="text-sm text-[#06C755] hover:underline">
              ← ブログ一覧
            </Link>
          </div>
          <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#06C755] to-emerald-300" />
            <div className="px-6 py-8">
              <div className="mb-3 flex items-center gap-2">
                {tenantIconUrl && (
                  <Image src={tenantIconUrl} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" unoptimized />
                )}
                <Link href={tenantHomeHref} className="text-sm font-bold text-[#06C755] hover:underline">
                  {tenantName}
                </Link>
              </div>
              <p className="mb-2 flex items-center gap-2 text-xs text-gray-400">
                <span>{formatDate(post.publishedAt)}</span>
                <span className="text-gray-300">・</span>
                <span>約{estimateReadingMinutes(post.body)}分で読めます</span>
              </p>
              <h1 className="mb-3 text-3xl font-bold leading-tight tracking-tight text-gray-900">{post.title}</h1>
              <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-lg bg-gray-100">
                <Image src={eyecatchImage} alt={post.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 640px" />
              </div>
              <BodyRenderer body={bodyWithoutEyecatch} />
            </div>
          </article>

          {upcomingEvents.length > 0 && <hr className="my-8 border-gray-200" />}
          <UpcomingEventsSection tenantCode={tenantCode} tenantName={tenantName} events={upcomingEvents} />

          {sameTenantItems.length > 0 && <hr className="my-8 border-gray-200" />}
          <RelatedArticleSection heading={`${tenantName}の関連記事`} items={sameTenantItems} />

          {comiuRelatedItems.length > 0 && <hr className="my-8 border-gray-200" />}
          <RelatedArticleSection heading="COMIUおすすめ記事" items={comiuRelatedItems} />

          <div className="mt-8 text-center">
            <Link
              href={`/clubs/${tenantCode}/blog`}
              className="inline-block rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
              ← 一覧に戻る
            </Link>
          </div>
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Link
            href={tenantHomeHref}
            className="block rounded-full bg-[#06C755] px-8 py-4 text-center text-base font-bold text-white hover:bg-[#05a847]"
          >
            {tenantName}の団体ページを見る
          </Link>
        </div>
      </div>
    </>
  );
}
