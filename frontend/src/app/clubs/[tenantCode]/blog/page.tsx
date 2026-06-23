import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { API_URL, SITE_URL } from '@/lib/config';
import type { BlogPostSummary } from '@/lib/api';

export const revalidate = 60;

async function fetchPosts(tenantCode: string): Promise<{ posts: BlogPostSummary[]; tenantName: string } | null> {
  try {
    const [postsRes, tenantRes] = await Promise.all([
      fetch(`${API_URL}/api/public/tenants/${tenantCode}/blog`, { next: { revalidate } }),
      fetch(`${API_URL}/api/public/tenants/${tenantCode}/pages/home`, { next: { revalidate } }),
    ]);
    if (!postsRes.ok) return null;
    const posts = await postsRes.json();
    const tenantName = tenantRes.ok ? (await tenantRes.json())?.tenant?.lineDisplayName ?? (await tenantRes.json())?.tenant?.name ?? tenantCode : tenantCode;
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
                className="block rounded-xl border border-gray-200 bg-white px-5 py-4 hover:shadow-md transition"
              >
                <p className="text-xs text-gray-400 mb-1">{formatDate(post.publishedAt)}</p>
                <p className="text-base font-bold text-gray-900">{post.title}</p>
                {post.excerpt && <p className="mt-1 text-sm leading-6 text-gray-500 line-clamp-2">{post.excerpt}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
