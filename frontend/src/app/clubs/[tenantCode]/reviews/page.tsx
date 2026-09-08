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

async function fetchReviews(tenantCode: string): Promise<{ reviews: TenantReview[]; tenantName: string; homeHref: string; tenantIcon: string | null; liffId: string | null } | null> {
  try {
    const [reviewsRes, tenantRes] = await Promise.all([
      fetch(`${API_URL}/api/public/tenants/${tenantCode}/reviews`, { next: { revalidate } }),
      fetch(`${API_URL}/api/public/tenants/${tenantCode}`, { next: { revalidate } }),
    ]);
    if (!reviewsRes.ok) return null;
    const reviews = await reviewsRes.json();
    const tenant = tenantRes.ok ? ((await tenantRes.json()) as ReviewsTenantInfo) : null;
    const tenantName = tenant?.name ?? tenant?.lineDisplayName ?? tenantCode;
    const primarySlug = tenant?.pages?.[0]?.slug;
    const homeHref = primarySlug ? `/clubs/${tenantCode}/${primarySlug}` : `/clubs/${tenantCode}`;
    const tenantIcon = imgUrl(tenant?.linePictureUrl ?? tenant?.iconUrl, IMAGE_BASE_URL);
    return { reviews, tenantName, homeHref, tenantIcon, liffId: tenant?.liffId ?? null };
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
  const data = await fetchReviews(tenantCode);
  const tenantName = data?.tenantName ?? tenantCode;
  const title = `${tenantName}の口コミ・評判 | COMIU`;
  const description = `${tenantName}に実際に参加したメンバーのリアルな口コミ・感想を掲載。入会や参加を検討している方はぜひ参考にしてください。`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/clubs/${tenantCode}/reviews` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}/clubs/${tenantCode}/reviews`,
      locale: 'ja_JP',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: { index: true, follow: true },
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
  const data = await fetchReviews(tenantCode);
  if (!data) notFound();
  const { reviews, tenantName, homeHref, tenantIcon, liffId } = data;
  const reviewPath = `/liff/${tenantCode}/review`;
  const reviewHref = buildLiffUrl(reviewPath, { liffId, endpointPath: '/' }) ?? reviewPath;

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <Link href={homeHref} className="text-sm text-[#06C755] hover:underline">
            ← {tenantName}
          </Link>
        </div>
        <div className="mb-6 flex items-center gap-3">
          {tenantIcon && (
            <Image src={tenantIcon} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-cover" />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{tenantName}の口コミ・評判</h1>
        </div>
        <p className="mb-6 text-sm leading-relaxed text-gray-500">
          実際に参加したメンバーの感想です。運営が確認したうえで掲載しています。
        </p>
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
        <SmartLiffButton
          href={reviewHref}
          directHref={`${SITE_URL}${reviewPath}`}
          className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-[#06C755] hover:underline"
        >
          感想を書く →
        </SmartLiffButton>
      </div>
    </main>
  );
}
