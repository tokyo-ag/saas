import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
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

function firstImageFromBody(body: string): string | null {
  const match = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return match?.[1] ?? null;
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
  const image = firstImageFromBody(post.body);
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
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: `${post.title} | ${tenantName}`,
      description,
      ...(image ? { images: [image] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;

function linkifyText(text: string, keyPrefix: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => (
    /^https?:\/\//.test(part) ? (
      <a key={`${keyPrefix}-${i}`} href={part} target="_blank" rel="noopener noreferrer" className="underline">{part}</a>
    ) : part
  ));
}

function BodyRenderer({ body }: { body: string }) {
  const parts = body.split('\n');
  return (
    <div className="space-y-2 text-sm leading-8 text-gray-700">
      {parts.map((line, i) => {
        const m = IMAGE_RE.exec(line.trim());
        if (m) {
          return (
            <div key={i} className="relative my-2 w-full overflow-hidden rounded-lg" style={{ minHeight: 200 }}>
              <Image
                src={m[2]}
                alt={m[1]}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 640px"
              />
            </div>
          );
        }
        return line ? <p key={i}>{linkifyText(line, `line-${i}`)}</p> : <br key={i} />;
      })}
    </div>
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
  const description = post.excerpt ?? cleanDescription(post.body);

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
      <main className="min-h-screen bg-[#F7F8FA]">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="mb-6 flex items-center gap-3">
            <Link href={`/clubs/${tenantCode}/blog`} className="text-sm text-[#06C755] hover:underline">
              ← ブログ一覧
            </Link>
          </div>
          <article className="rounded-xl border border-gray-200 bg-white px-6 py-8">
            <p className="mb-2 text-xs text-gray-400">{formatDate(post.publishedAt)}</p>
            <h1 className="mb-3 text-2xl font-bold leading-tight text-gray-900">{post.title}</h1>
            {post.tags && post.tags.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-1.5">
                {post.tags.map(tag => (
                  <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">{tag}</span>
                ))}
              </div>
            )}
            <BodyRenderer body={post.body} />
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
