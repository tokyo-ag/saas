import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { API_URL, SITE_URL } from '@/lib/config';
import type { BlogPost } from '@/lib/api';

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantCode: string; slug: string }>;
}): Promise<Metadata> {
  const { tenantCode, slug } = await params;
  const post = await fetchPost(tenantCode, slug);
  if (!post) return {};
  const tenantName = post.tenant?.lineDisplayName ?? post.tenant?.name ?? tenantCode;
  const description = post.excerpt ?? post.body.replace(/\n+/g, ' ').slice(0, 150);
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
    },
    robots: { index: true, follow: true },
  };
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? post.body.slice(0, 150),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: tenantName },
    publisher: { '@type': 'Organization', name: tenantName },
    url: `${SITE_URL}/clubs/${tenantCode}/blog/${slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <main className="min-h-screen bg-[#F7F8FA]">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="mb-6 flex items-center gap-3">
            <Link href={`/clubs/${tenantCode}/blog`} className="text-sm text-[#06C755] hover:underline">
              ← ブログ一覧
            </Link>
          </div>
          <article className="rounded-xl border border-gray-200 bg-white px-6 py-8">
            <p className="mb-2 text-xs text-gray-400">{formatDate(post.publishedAt)}</p>
            <h1 className="mb-6 text-2xl font-bold leading-tight text-gray-900">{post.title}</h1>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-8 text-gray-700">
              {post.body}
            </div>
          </article>
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
    </>
  );
}
