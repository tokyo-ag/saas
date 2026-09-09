import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { API_URL, IMAGE_BASE_URL, SITE_URL, buildLiffUrl } from '@/lib/config';
import type { TenantReview } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { SmartLiffButton } from '@/components/public/SmartLiffButton';

export const revalidate = 60;

type ReviewsTenantInfo = {
  name?: string | null;
  lineDisplayName?: string | null;
  linePictureUrl?: string | null;
  iconUrl?: string | null;
  liffId?: string | null;
  pages?: Array<{ slug: string }>;
};

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
  const description = `${name}に実際に参加したメンバーのリアルな口コミ・感想を掲載。入会や参加を検討している方はぜひ参考にしてください。`;
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

export default async function ReviewsListPage({
  params,
}: {
  params: Promise<{ tenantCode: string }>;
}) {
  const { tenantCode } = await params;
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
  const reviewPath = `/liff/${tenantCode}/review`;
  const reviewHref = buildLiffUrl(reviewPath, { liffId: tenant.liffId, endpointPath: '/' }) ?? reviewPath;

  return (
    <div style={{ backgroundColor, minHeight: '100vh' }}>
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

        <h1 className="mb-4 text-sm font-bold" style={{ color: textColor }}>口コミ・評判</h1>

        <SmartLiffButton
          href={reviewHref}
          directHref={`${SITE_URL}${reviewPath}`}
          className="mb-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold"
          style={{ backgroundColor: accentColor, color: '#ffffff' }}
        >
          感想を書く
        </SmartLiffButton>

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
