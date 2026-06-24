import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { API_URL, SITE_URL } from '@/lib/config';

export const revalidate = 60;

type OfficialSite = {
  heroTitle: string;
  heroLead: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

type OfficialArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  category?: string | null;
  targetKeyword?: string | null;
  publishedAt?: string | null;
};

const fallbackSite: OfficialSite = {
  heroTitle: 'サークル・イベント運営をLINEでかんたんに',
  heroLead: 'COMIUは、予約管理・参加者名簿・リマインド・問い合わせ対応をまとめて管理できる主催者向けWEBサービスです。',
  primaryCtaLabel: '無料ではじめる',
  primaryCtaHref: '/register',
  secondaryCtaLabel: '相談する',
  secondaryCtaHref: '/contact',
};

async function fetchOfficialSite(): Promise<OfficialSite> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-site`, { next: { revalidate } });
    if (!res.ok) return fallbackSite;
    return res.json();
  } catch {
    return fallbackSite;
  }
}

async function fetchArticles(): Promise<OfficialArticle[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles?limit=6`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const site = await fetchOfficialSite();
  const title = site.seoTitle || 'サークル・イベント運営者向けWEBサイト | COMIU';
  const description = site.seoDescription || site.heroLead;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/organizers` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/organizers`,
      type: 'website',
      locale: 'ja_JP',
      images: [{ url: `${SITE_URL}/icon.png`, width: 512, height: 512 }],
    },
    twitter: { card: 'summary', title, description },
  };
}

export default async function OrganizersPage() {
  const [site, articles] = await Promise.all([fetchOfficialSite(), fetchArticles()]);

  const features = [
    { title: '予約管理', text: '日程ごとの申込、定員、キャンセル待ちをまとめて管理できます。' },
    { title: 'LINE導線', text: '参加者はLINEから確認でき、主催者は連絡とリマインドを楽にできます。' },
    { title: '公開WEBサイト', text: '団体紹介、活動ブログ、予約画面をひとつの公開サイトにできます。' },
    { title: '参加者名簿', text: '予約者、参加履歴、問い合わせを団体ごとに整理できます。' },
  ];

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Image src="/icon.png" alt="" width={32} height={32} className="rounded-lg" />
            COMIU
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-sm font-bold text-gray-500">
            <Link href="/guide" className="hover:text-gray-900">記事</Link>
            <Link href="/pricing" className="hover:text-gray-900">料金</Link>
            <Link href="/login" className="hover:text-gray-900">ログイン</Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="text-sm font-bold text-[#06C755]">主催者向けWEBサイト</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-gray-950 sm:text-5xl">
              {site.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-gray-600">
              {site.heroLead}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={site.primaryCtaHref} className="rounded-lg bg-[#06C755] px-5 py-3 text-sm font-bold text-white shadow-sm hover:opacity-90">
                {site.primaryCtaLabel}
              </Link>
              <Link href={site.secondaryCtaHref} className="rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50">
                {site.secondaryCtaLabel}
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-[#F7F8FA] p-4 shadow-sm">
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <Image src="/icon.png" alt="" width={42} height={42} className="rounded-xl" />
                <div>
                  <p className="text-sm font-bold">公開WEBサイト</p>
                  <p className="text-xs text-gray-400">団体説明・予約・ブログをひとまとめ</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {['団体説明', '予約画面', '活動ブログ', 'お問い合わせ'].map((label) => (
                  <span key={label} className="rounded-lg border border-[#06C755]/30 bg-[#06C755]/5 px-3 py-2 text-center text-xs font-bold text-[#06C755]">
                    {label}
                  </span>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 w-5/6 rounded-full bg-gray-800" />
                <div className="h-2 w-2/3 rounded-full bg-gray-200" />
                <div className="h-2 w-3/4 rounded-full bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="text-2xl font-bold">主催者が毎回困るところを軽くする</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-gray-500">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#06C755]">公式記事</p>
              <h2 className="mt-2 text-2xl font-bold">サークル運営の入口を増やす記事</h2>
            </div>
            <Link href="/guide" className="shrink-0 rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              すべて見る
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {articles.length === 0 ? (
              <p className="rounded-lg bg-gray-50 px-4 py-8 text-sm text-gray-400 md:col-span-3">記事を公開するとここに表示されます。</p>
            ) : articles.slice(0, 3).map((article) => (
              <Link key={article.id} href={`/guide/${article.slug}`} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                {article.category && <p className="text-xs font-bold text-[#06C755]">{article.category}</p>}
                <h3 className="mt-2 line-clamp-2 font-bold leading-7">{article.title}</h3>
                {article.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-7 text-gray-500">{article.excerpt}</p>}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
