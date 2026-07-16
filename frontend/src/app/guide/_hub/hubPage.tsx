import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { AreaHubSetting } from '@/lib/api';

import { API_URL, SITE_URL } from '@/lib/config';
import { TOKYO_WARDS, WARD_SUBAREAS, buildCategoryAreaPath } from '@/lib/lpTags';

const REVALIDATE_SECONDS = 60;

type OfficialArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  category?: string | null;
  areaTags?: string[];
  ogImageUrl?: string | null;
  publishedAt?: string | null;
};

type PublicCircle = {
  id: string;
  code: string | null;
  name: string;
  description?: string | null;
  tags?: string[];
  typeTags?: string[];
  // Search tags (初心者大歓迎 etc.) live on Event, not Tenant - this is the union of tags from
  // the tenant's events that qualified it for the current category+area, sent by the backend.
  eventTags?: string[];
  lineDisplayName?: string | null;
  linePictureUrl?: string | null;
  updatedAt: string;
};

type PortalBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  tenant: {
    code?: string | null;
    name: string;
  };
};

type RelatedArticle = {
  id: string;
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  href: string;
  matchesBoth: boolean;
  publishedAt?: string | null;
};

type AreaCount = { area: string; count: number };

const TOKYO_GROUP = new Set<string>([...TOKYO_WARDS, ...Object.values(WARD_SUBAREAS).flat()]);

function prefectureGroupOf(area: string): Set<string> {
  return TOKYO_GROUP.has(area) ? TOKYO_GROUP : new Set([area]);
}

async function fetchArticlesByCategory(category: string): Promise<OfficialArticle[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles?limit=120&category=${encodeURIComponent(category)}`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchArticlesByArea(area: string): Promise<OfficialArticle[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles?limit=120&area=${encodeURIComponent(area)}`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchCircles(category: string, area: string | undefined, limit: number): Promise<PublicCircle[]> {
  try {
    const params = new URLSearchParams({ activityTag: category, limit: String(limit) });
    if (area) params.set('area', area);
    const res = await fetch(`${API_URL}/api/public/tenants?${params.toString()}`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchBlogPostsByCategory(category: string, limit: number, maxPerTenant = 2): Promise<PortalBlogPost[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/blog?tags=${encodeURIComponent(category)}&limit=30`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return [];
    const posts: PortalBlogPost[] = await res.json();
    const countByTenant = new Map<string, number>();
    const result: PortalBlogPost[] = [];
    for (const post of posts) {
      const tenantKey = post.tenant.code ?? post.tenant.name;
      const count = countByTenant.get(tenantKey) ?? 0;
      if (count >= maxPerTenant) continue;
      countByTenant.set(tenantKey, count + 1);
      result.push(post);
      if (result.length >= limit) break;
    }
    return result;
  } catch {
    return [];
  }
}

async function fetchAreaHubSetting(category: string, area: string): Promise<AreaHubSetting | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/area-hub-settings?category=${encodeURIComponent(category)}&area=${encodeURIComponent(area)}`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchAreaCounts(category: string): Promise<AreaCount[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/area-tag-counts?category=${encodeURIComponent(category)}`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function resolveNearbyAreas(category: string, area: string, configured: string[]): Promise<string[]> {
  if (configured.length > 0) return configured.slice(0, 5);
  if (!area) return [];
  const counts = await fetchAreaCounts(category);
  const group = prefectureGroupOf(area);
  return counts
    .filter((c) => c.area !== area && group.has(c.area))
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area, 'ja'))
    .slice(0, 5)
    .map((c) => c.area);
}

function dedupeArticles(...lists: OfficialArticle[][]): OfficialArticle[] {
  const byId = new Map<string, OfficialArticle>();
  for (const list of lists) {
    for (const article of list) byId.set(article.id, article);
  }
  return Array.from(byId.values());
}

function buildOfficialRelated(
  officialArticles: OfficialArticle[],
  category: string,
  area: string,
  limit: number,
): RelatedArticle[] {
  return officialArticles
    .map((a) => ({
      id: `official-${a.id}`,
      title: a.title,
      excerpt: a.excerpt,
      imageUrl: a.ogImageUrl ?? null,
      href: `/guide/${a.slug}`,
      matchesBoth: !!area && a.category === category && (a.areaTags ?? []).includes(area),
      publishedAt: a.publishedAt ?? null,
    }))
    .sort((a, b) => {
      if (a.matchesBoth !== b.matchesBoth) return a.matchesBoth ? -1 : 1;
      const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return bTime - aTime;
    })
    .slice(0, limit);
}

function buildTeamRelated(blogPosts: PortalBlogPost[], limit: number): RelatedArticle[] {
  return blogPosts
    .map((p) => ({
      id: `blog-${p.id}`,
      title: p.title,
      excerpt: p.excerpt,
      imageUrl: p.coverImageUrl ?? null,
      href: p.tenant.code ? `/clubs/${p.tenant.code}/blog/${p.slug}` : '#',
      matchesBoth: false,
      publishedAt: p.publishedAt ?? null,
    }))
    .slice(0, limit);
}

type FaqItem = { question: string; answer: string };

// Tag literals mirror lpTags.ts's SEARCH_TAGS / TENANT_TYPE_TAGS - kept in sync manually,
// same pattern as the other duplicated tag lists in this codebase.
type FaqCandidate = {
  // Core topics are always shown (with a "掲載準備中" fallback when count is 0); the
  // remaining topics only appear when there's real matching data to back them up.
  alwaysEligible: boolean;
  count: (circles: PublicCircle[]) => number;
  question: (category: string, areaLabel: string) => string;
  answerWithData: (areaLabel: string, count: number) => string;
  answerNoData?: (areaLabel: string) => string;
};

const FAQ_CANDIDATES: FaqCandidate[] = [
  {
    alwaysEligible: true,
    count: (circles) => circles.filter((c) => (c.eventTags ?? []).includes('初心者大歓迎')).length,
    question: (category, areaLabel) => `${areaLabel}で初心者でも参加できる${category}サークルはありますか？`,
    answerWithData: (areaLabel, count) => `現在、${areaLabel}エリアでは初心者歓迎の団体を${count}件掲載しています。団体ごとに参加者のレベルや活動内容が異なるため、詳細ページを確認して参加先を選んでください。`,
    answerNoData: (areaLabel) => `現在、${areaLabel}エリアで初心者歓迎を明記している団体は掲載準備中です。新しい団体が登録されると自動で反映されます。`,
  },
  {
    alwaysEligible: true,
    count: (circles) => circles.filter((c) => (c.eventTags ?? []).includes('1人参加歓迎')).length,
    question: (category, areaLabel) => `${areaLabel}で1人参加できる${category}活動はありますか？`,
    answerWithData: (areaLabel, count) => `現在、${areaLabel}エリアでは1人参加歓迎の団体を${count}件掲載しています。初参加者向けの案内や交流の雰囲気は、各団体ページで確認できます。`,
    answerNoData: (areaLabel) => `現在、${areaLabel}エリアで1人参加歓迎を明記している団体は掲載準備中です。`,
  },
  {
    alwaysEligible: true,
    count: (circles) => circles.filter((c) => (c.typeTags ?? []).includes('社会人サークル')).length,
    question: (category, areaLabel) => `${areaLabel}で社会人が参加できる${category}サークルはありますか？`,
    answerWithData: (areaLabel, count) => `現在、${areaLabel}エリアでは社会人向けの団体を${count}件掲載しています。対象年齢や開催曜日は団体ごとに異なるため、詳細ページを確認してください。`,
    answerNoData: (areaLabel) => `現在、${areaLabel}エリアで社会人向けを明記している団体は掲載準備中です。`,
  },
  {
    alwaysEligible: true,
    // "大学生向け" = 学生団体・インカレサークルのどちらも大学生向けの団体タイプなので合算する
    count: (circles) => circles.filter((c) => (c.typeTags ?? []).some((t) => t === '学生団体' || t === 'インカレサークル')).length,
    question: (category, areaLabel) => `${areaLabel}で大学生が参加できる${category}サークルはありますか？`,
    answerWithData: (areaLabel, count) => `現在、${areaLabel}エリアでは大学生向けの団体を${count}件掲載しています。大学生限定か、社会人との合同参加かは団体ごとに異なります。`,
    answerNoData: (areaLabel) => `現在、${areaLabel}エリアで大学生向けを明記している団体は掲載準備中です。`,
  },
  {
    alwaysEligible: false,
    count: (circles) => circles.filter((c) => (c.eventTags ?? []).includes('経験者大歓迎')).length,
    question: (category, areaLabel) => `${areaLabel}で経験者が参加できる${category}サークルはありますか？`,
    answerWithData: (areaLabel, count) => `現在、${areaLabel}エリアでは経験者歓迎の団体を${count}件掲載しています。レベルや活動頻度は団体ごとに異なるため、詳細ページを確認してください。`,
  },
  {
    alwaysEligible: false,
    count: (circles) => circles.filter((c) => (c.eventTags ?? []).includes('20代歓迎')).length,
    question: (category, areaLabel) => `${areaLabel}で20代が参加しやすい${category}サークルはありますか？`,
    answerWithData: (areaLabel, count) => `現在、${areaLabel}エリアでは20代歓迎の団体を${count}件掲載しています。参加者の年齢層は団体ページで確認できます。`,
  },
  {
    alwaysEligible: false,
    count: (circles) => circles.filter((c) => (c.eventTags ?? []).includes('30代歓迎')).length,
    question: (category, areaLabel) => `${areaLabel}で30代が参加しやすい${category}サークルはありますか？`,
    answerWithData: (areaLabel, count) => `現在、${areaLabel}エリアでは30代歓迎の団体を${count}件掲載しています。参加者の年齢層は団体ページで確認できます。`,
  },
];

function buildFaqItems(category: string, area: string, circles: PublicCircle[]): FaqItem[] {
  const areaLabel = area || '東京';

  const eligible = FAQ_CANDIDATES
    .map((candidate) => ({ candidate, count: candidate.count(circles) }))
    .filter(({ candidate, count }) => candidate.alwaysEligible || count > 0);

  // Prefer questions backed by real data; ties keep their original priority order (stable sort).
  const sorted = [...eligible].sort((a, b) => (a.count > 0 ? 0 : 1) - (b.count > 0 ? 0 : 1));

  return sorted.slice(0, 4).map(({ candidate, count }) => ({
    question: candidate.question(category, areaLabel),
    answer: count > 0 ? candidate.answerWithData(areaLabel, count) : candidate.answerNoData!(areaLabel),
  }));
}

function CircleCard({ circle, area }: { circle: PublicCircle; area: string }) {
  const displayName = circle.lineDisplayName ?? circle.name;
  const href = circle.code ? `/clubs/${circle.code}` : `/liff/${circle.id}`;
  const audience = (circle.typeTags ?? []).join('・');
  return (
    <Link href={href} className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] w-full bg-gray-100">
        {circle.linePictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={circle.linePictureUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#06C755] to-[#047a35]">
            <span className="text-2xl font-bold text-white">{displayName.slice(0, 1)}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-base font-bold text-gray-950">{displayName}</p>
        {circle.description && <p className="mt-1 line-clamp-2 flex-1 text-xs leading-5 text-gray-500">{circle.description}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {area && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">{area}</span>}
          {audience && <span className="rounded-full bg-[#06C755]/10 px-2 py-0.5 text-[11px] font-bold text-[#06C755]">{audience}</span>}
        </div>
      </div>
    </Link>
  );
}

function RelatedArticleCard({ item }: { item: RelatedArticle }) {
  return (
    <Link href={item.href} className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-lg font-bold leading-7">{item.title}</h3>
        {item.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-7 text-gray-500">{item.excerpt}</p>}
        <p className="mt-5 text-xs font-bold text-gray-400">記事を読む</p>
      </div>
    </Link>
  );
}

async function loadHubData(category: string, area: string) {
  const setting = await fetchAreaHubSetting(category, area);
  const [circlesRaw, articlesByCategory, articlesByArea, blogPosts] = await Promise.all([
    fetchCircles(category, area || undefined, 30),
    fetchArticlesByCategory(category),
    area ? fetchArticlesByArea(area) : Promise.resolve([]),
    fetchBlogPostsByCategory(category, 10, 2),
  ]);
  const circles = [...circlesRaw].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const officialArticles = dedupeArticles(articlesByCategory, articlesByArea);
  // For "does this specific area page have real local relevance" (used for notFound/noindex),
  // a category-wide article that merely exists somewhere isn't enough - it must actually be
  // tagged for this area (or, on the category-only page, just match the category).
  const hasAreaRelevantArticle = area ? articlesByArea.length > 0 : articlesByCategory.length > 0;
  return { setting, circles, officialArticles, hasAreaRelevantArticle, blogPosts };
}

export async function buildHubMetadata(category: string, area: string): Promise<Metadata> {
  const { setting, circles, hasAreaRelevantArticle } = await loadHubData(category, area);

  const title = setting?.seoTitle || (area
    ? `${area}の${category}サークル一覧｜初心者・社会人向け活動を検索`
    : `${category}のサークル・イベント情報`);
  const description = setting?.seoDescription || (area
    ? `${area}で参加者を募集している${category}サークルや活動を紹介。初心者歓迎、1人参加、社会人・大学生向けなど、地域や参加条件から比較できます。`
    : `${category}に関する記事と、COMIUに実際に登録されている団体をまとめて紹介しています。`);
  const url = `${SITE_URL}${buildCategoryAreaPath(category, area || undefined)}`;

  const hasContent = circles.length > 0 || hasAreaRelevantArticle;
  const indexable = setting?.indexable ?? hasContent;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: indexable ? undefined : { index: false, follow: false },
    openGraph: { title: `${title} | COMIU`, description, url, type: 'website', locale: 'ja_JP' },
  };
}

export async function HubPage({ category, area }: { category: string; area: string }) {
  const { setting, circles, officialArticles, blogPosts } = await loadHubData(category, area);
  if (circles.length === 0 && officialArticles.length === 0 && blogPosts.length === 0) notFound();

  const relatedLimit = setting?.relatedArticleLimit ?? 3;
  const officialRelated = buildOfficialRelated(officialArticles, category, area, relatedLimit);
  const teamRelated = buildTeamRelated(blogPosts, relatedLimit);
  const faqEnabled = setting?.faqEnabled ?? true;
  const faqItems = faqEnabled ? buildFaqItems(category, area, circles) : [];
  const nearbyAreas = await resolveNearbyAreas(category, area, setting?.nearbyAreas ?? []);

  const h1 = area ? `${area}の${category}サークル・活動一覧` : `${category}のサークル・イベント情報`;
  const description = setting?.description || (area
    ? `${area}で活動している${category}サークルや、参加者を募集している活動を紹介します。初心者向け、社会人向け、大学生向けなど、自分に合う団体を比較しながら探せます。`
    : `${category}に関する記事と、COMIUに実際に登録されている団体をまとめて紹介しています。`);
  const countLabel = area
    ? (circles.length > 0 ? `${area}で現在${circles.length}団体を掲載しています。` : '現在、掲載団体を準備中です。')
    : (circles.length > 0 ? `現在${circles.length}団体を掲載しています。` : '現在、掲載団体を準備中です。');

  const categoryHref = buildCategoryAreaPath(category);
  const hubUrl = `${SITE_URL}${buildCategoryAreaPath(category, area || undefined)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${hubUrl}#webpage`,
        url: hubUrl,
        name: h1,
        inLanguage: 'ja',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'COMIU', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: category, item: `${SITE_URL}${categoryHref}` },
          ...(area ? [{ '@type': 'ListItem', position: 3, name: area, item: hubUrl }] : []),
        ],
      },
      ...(faqItems.length > 0 ? [{
        '@type': 'FAQPage',
        '@id': `${hubUrl}#faq`,
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
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <Image src="/icon.png" alt="" width={32} height={32} className="rounded-lg" />
              COMIU
            </Link>
            <Link href="/guide" className="ml-auto text-sm font-bold text-gray-500 hover:text-gray-900">記事一覧</Link>
          </div>
        </header>

        <nav className="mx-auto max-w-6xl px-5 pt-4 text-xs text-gray-400">
          <Link href="/guide" className="hover:text-gray-600">ホーム</Link>
          <span className="mx-1.5">→</span>
          <Link href={categoryHref} className="hover:text-gray-600">{category}</Link>
          {area && (
            <>
              <span className="mx-1.5">→</span>
              <span className="text-gray-600">{area}</span>
            </>
          )}
        </nav>

        <section className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-10">
            <p className="text-sm font-bold text-[#06C755]">CATEGORY</p>
            <h1 className="mt-3 text-3xl font-bold">{h1}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-500">{description}</p>
            <p className="mt-4 text-sm font-bold text-gray-700">{countLabel}</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-8">
          <h2 className="text-lg font-bold text-gray-950">{area ? `${area}で、活動実績のある${category}団体` : `${category}の団体`}</h2>
          {circles.length === 0 ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white px-5 py-14 text-center text-sm text-gray-400">
              現在、掲載団体を準備中です。
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {circles.map((circle) => <CircleCard key={circle.id} circle={circle} area={area} />)}
            </div>
          )}
        </section>

        {officialRelated.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 py-8">
            <h2 className="text-lg font-bold text-gray-950">COMIUの{category}記事</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {officialRelated.map((item) => <RelatedArticleCard key={item.id} item={item} />)}
            </div>
          </section>
        )}

        {teamRelated.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 py-8">
            <h2 className="text-lg font-bold text-gray-950">団体の{category}記事</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teamRelated.map((item) => <RelatedArticleCard key={item.id} item={item} />)}
            </div>
          </section>
        )}

        {faqItems.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 py-8">
            <h2 className="text-lg font-bold text-gray-950">よくある質問</h2>
            <div className="mt-4 space-y-3">
              {faqItems.map((item) => (
                <div key={item.question} className="rounded-xl border border-gray-200 bg-white p-5">
                  <p className="font-bold text-gray-900">Q. {item.question}</p>
                  <p className="mt-2 text-sm leading-7 text-gray-600">A. {item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {nearbyAreas.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 py-8">
            <h2 className="text-lg font-bold text-gray-950">近隣地域から探す</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {nearbyAreas.map((nearbyArea) => (
                <Link
                  key={nearbyArea}
                  href={buildCategoryAreaPath(category, nearbyArea)}
                  className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-[#06C755]/10 hover:text-[#06C755]"
                >
                  {nearbyArea}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-5 pb-10">
          <div className="rounded-xl border border-[#06C755]/20 bg-[#06C755]/5 px-6 py-6">
            <p className="text-base font-bold text-gray-950">サークル・イベントの参加者を増やしませんか？</p>
            <p className="mt-2 text-sm leading-7 text-gray-600">
              COMIUなら、団体専用のWEBサイトを無料で作成できます。
              <br />
              活動予定や募集情報を掲載して、地域やジャンルから新しい参加者を集められます。
            </p>
            <Link href="/organizers" className="mt-4 inline-flex rounded-lg bg-[#06C755] px-5 py-3 text-sm font-bold text-white hover:opacity-90">
              無料で団体サイトを作成
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
