import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { API_URL, IMAGE_BASE_URL, SITE_URL } from '@/lib/config';
import type { TenantReview } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { TenantReviewComposer } from '@/components/public/TenantReviewComposer';

export const revalidate = 60;

type ReviewsTenantInfo = {
  name?: string | null;
  description?: string | null;
  reviewsSeoDescription?: string | null;
  lineDisplayName?: string | null;
  linePictureUrl?: string | null;
  iconUrl?: string | null;
  liffId?: string | null;
  pages?: Array<{ slug: string }>;
};

// ページ上の表示用：改行はそのまま残し、行内の余分な空白だけ整える。
function shortDescription(description: string | null | undefined): string {
  if (!description) return '';
  return description
    .trim()
    .split('\n')
    .map((line) => line.trim().replace(/[ \t]+/g, ' '))
    .join('\n')
    .slice(0, 300);
}

// meta description用：改行を含め1行に平坦化する。
function flattenForMeta(description: string | null | undefined): string {
  if (!description) return '';
  return description.trim().replace(/\s+/g, ' ').slice(0, 150);
}

// 口コミページ専用のSEO文言があれば優先し、無ければ団体の紹介文にフォールバックする。
function reviewsIntroText(tenant: ReviewsTenantInfo): string {
  return shortDescription(tenant.reviewsSeoDescription) || shortDescription(tenant.description);
}

function reviewsMetaDescriptionSource(tenant: ReviewsTenantInfo): string {
  return flattenForMeta(tenant.reviewsSeoDescription) || flattenForMeta(tenant.description);
}

type TenantPageStyle = {
  accentColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
};

async function fetchTenant(tenantCode: string): Promise<ReviewsTenantInfo | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchReviews(tenantCode: string): Promise<TenantReview[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}/reviews`, {
      next: { revalidate },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchPageStyle(tenantCode: string, slug: string): Promise<TenantPageStyle | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}/pages/${slug}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantCode: string }>;
}): Promise<Metadata> {
  const { tenantCode } = await params;
  const tenant = await fetchTenant(tenantCode);
  if (!tenant) {
    return { title: '団体が見つかりません', robots: { index: false, follow: false } };
  }
  const name = tenant.lineDisplayName || tenant.name || tenantCode;
  const title = `${name}の口コミ・評判 | COMIU`;
  const bio = reviewsMetaDescriptionSource(tenant);
  const description = bio
    ? `${bio}／${name}に実際に参加したメンバーのリアルな口コミ・感想を掲載。入会や参加を検討している方はぜひ参考にしてください。`
    : `${name}に実際に参加したメンバーのリアルな口コミ・感想を掲載。入会や参加を検討している方はぜひ参考にしてください。`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/clubs/${tenantCode}/reviews` },
    openGraph: { title, description, url: `${SITE_URL}/clubs/${tenantCode}/reviews` },
  };
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

function breadcrumbJsonLd(tenantCode: string, tenantName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: tenantName, item: `${SITE_URL}/clubs/${tenantCode}` },
      { '@type': 'ListItem', position: 3, name: '口コミ・評判', item: `${SITE_URL}/clubs/${tenantCode}/reviews` },
    ],
  };
}

export default async function ReviewsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantCode: string }>;
  searchParams: Promise<{ reviewed?: string }>;
}) {
  const { tenantCode } = await params;
  const { reviewed } = await searchParams;
  const tenant = await fetchTenant(tenantCode);
  if (!tenant) notFound();

  const slug = tenant.pages?.[0]?.slug;
  const [reviews, page] = await Promise.all([
    fetchReviews(tenantCode),
    slug ? fetchPageStyle(tenantCode, slug) : Promise.resolve(null),
  ]);

  const accentColor = page?.accentColor || '#06C755';
  const backgroundColor = page?.backgroundColor || '#F7F8FA';
  const textColor = page?.textColor || '#111827';
  const name = tenant.lineDisplayName || tenant.name || tenantCode;
  const icon = imgUrl(tenant.linePictureUrl ?? tenant.iconUrl, IMAGE_BASE_URL);

  return (
    <div style={{ backgroundColor, minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(tenantCode, name)) }}
      />
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          {icon && (
            <Link href={`/clubs/${tenantCode}`} className="shrink-0">
              <Image src={icon} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
            </Link>
          )}
          <div className="min-w-0">
            <Link href={`/clubs/${tenantCode}`} className="block truncate text-lg font-bold" style={{ color: textColor }}>
              {name}
            </Link>
            {slug && (
              <Link href={`/clubs/${tenantCode}/${slug}`} className="block text-xs underline" style={{ color: accentColor }}>
                団体ページを見る
              </Link>
            )}
          </div>
        </div>

        <h1 className="mb-2 text-sm font-bold" style={{ color: textColor }}>{name}の口コミ・評判</h1>

        {reviewsIntroText(tenant) && (
          <p className="mb-4 whitespace-pre-wrap text-xs leading-relaxed" style={{ color: textColor, opacity: 0.7 }}>
            {reviewsIntroText(tenant)}
          </p>
        )}

        {reviewed !== '1' && (
          <TenantReviewComposer tenantId={tenantCode} liffId={tenant.liffId} accentColor={accentColor} />
        )}

        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">まだ口コミはありません。参加した方の感想をお楽しみに。</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="flex gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4">
                {review.authorIconUrl ? (
                  <Image src={review.authorIconUrl} alt="" width={36} height={36} className="mt-0.5 h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-400">
                    {review.authorName.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-700">{review.authorName}</p>
                    <p className="text-xs text-gray-400">{formatDate(review.createdAt)}</p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{review.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
