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

          <PublicSitePreview />
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

function PublicSitePreview() {
  return (
    <div className="mx-auto w-full max-w-[360px] rounded-[2rem] border border-gray-200 bg-gray-950 p-2 shadow-2xl">
      <div className="overflow-hidden rounded-[1.5rem] bg-[#d73333] text-[#18181b]">
        <div className="relative h-44 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(215,51,51,0.08)), linear-gradient(120deg, #263446 0%, #6f8a7a 32%, #d8c56d 58%, #2f3f38 100%)',
            }}
          />
          <div className="absolute inset-x-0 top-10 flex justify-center gap-1 opacity-75">
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} className={`h-7 w-2 rounded-full ${i % 3 === 0 ? 'bg-gray-900' : i % 3 === 1 ? 'bg-white' : 'bg-[#06C755]'}`} />
            ))}
          </div>
          <div className="absolute bottom-4 left-5">
            <p className="font-serif text-4xl leading-none text-black">GAKUORI</p>
            <p className="mt-2 text-xs text-black/70">失われた青春を取り戻せ</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 px-3 py-3">
          {['団体詳細', '活動ブログ', '予約する', 'お問い合わせ'].map((label) => (
            <span key={label} className="rounded-md border-2 border-white/90 bg-white/20 px-3 py-2 text-center text-xs font-bold text-black shadow-sm">
              {label}
            </span>
          ))}
        </div>

        <div className="space-y-4 px-3 pb-5">
          <section className="rounded-xl border border-white/60 bg-white/25 p-4">
            <div className="flex gap-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                <Image src="/icon.png" alt="" width={54} height={54} className="rounded-md" />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-sm font-bold">学生×オリンピック</p>
                <p className="mt-2 text-xs leading-5">"失われた青春を取り戻せ"</p>
                <p className="mt-2 text-xs leading-5">スローガンに掲げ活動中。</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border-2 border-pink-500/80 px-4 py-3 text-center text-xs font-bold text-pink-600">
              Instagramでフォロー
            </div>
          </section>

          <section className="rounded-xl bg-white/25 p-4">
            <p className="text-sm font-bold">予約する</p>
            <div className="mt-3 overflow-hidden rounded-xl bg-white shadow-sm">
              <div
                className="h-24"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.18)), linear-gradient(120deg, #172334, #4f6e60 45%, #c7b66a)',
                }}
              />
              <div className="space-y-2 p-3">
                <p className="line-clamp-2 text-sm font-bold leading-5">初心者でも楽しめるイベントを開催！</p>
                <p className="text-xs font-bold text-gray-700">6/25(木) 20:00</p>
                <p className="text-xs text-gray-400">吉祥寺付近で開催予定！</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
