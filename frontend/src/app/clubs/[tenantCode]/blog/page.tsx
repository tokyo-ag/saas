import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { API_URL, IMAGE_BASE_URL, SITE_URL } from '@/lib/config';
import type { BlogPostSummary } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';

export const revalidate = 60;

async function fetchPosts(tenantCode: string): Promise<{ posts: BlogPostSummary[]; tenantName: string } | null> {
  try {
    const [postsRes, tenantRes] = await Promise.all([
      fetch(`${API_URL}/api/public/tenants/${tenantCode}/blog`, { next: { revalidate } }),
      fetch(`${API_URL}/api/public/tenants/${tenantCode}/pages/home`, { next: { revalidate } }),
    ]);
    if (!postsRes.ok) return null;
    const posts = await postsRes.json();
    const tenantPage = tenantRes.ok ? await tenantRes.json() : null;
    const tenantName = tenantPage?.tenant?.lineDisplayName ?? tenantPage?.tenant?.name ?? tenantCode;
    return { posts, tenantName };
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
  return {
    title: `ブログ | ${tenantCode}`,
    alternates: { canonical: `${SITE_URL}/clubs/${tenantCode}/blog` },
    robots: { index: true, follow: true },
  };
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function BlogListPage({
  params,
}: {
  params: Promise<{ tenantCode: string }>;
}) {
  const { tenantCode } = await params;
  const data = await fetchPosts(tenantCode);
  if (!data) notFound();
  const { posts, tenantName } = data;

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <Link href={`/clubs/${tenantCode}/home`} className="text-sm text-[#06C755] hover:underline">
            ← {tenantName}
          </Link>
        </div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">ブログ</h1>
        {posts.length === 0 ? (
          <p className="text-sm text-gray-400">まだ記事がありません。</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/clubs/${tenantCode}/blog/${post.slug}`}
                className="flex gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition hover:shadow-md"
              >
                {imgUrl(post.coverImageUrl, IMAGE_BASE_URL) && (
                  <img src={imgUrl(post.coverImageUrl, IMAGE_BASE_URL)!} alt="" className="h-20 w-24 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0">
                  <p className="mb-1 text-xs text-gray-400">{formatDate(post.publishedAt)}</p>
                  <p className="text-base font-bold text-gray-900">{post.title}</p>
                  {post.excerpt && <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{post.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
