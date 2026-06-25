import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { API_URL, SITE_URL } from '@/lib/config';
import CosmicCursor from './CosmicCursor';

export const revalidate = 60;

type OfficialArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  category?: string | null;
};

const title = '団体・サークルのWEBサイトを無料作成 | COMIU';
const description =
  'COMIUは、団体やサークルのSEOに強いWEBサイト作成、ポータル掲載、予約カレンダー、公式LINE APIのリマインド連絡をまとめて使える主催者向けサービスです。';

const orbitFeatures = [
  { code: 'WEB', title: '無料WEBサイト', note: '団体の活動拠点' },
  { code: 'SEO', title: 'ポータル掲載', note: '検索から出会う' },
  { code: 'LINE', title: 'リマインド', note: '前日に届く' },
  { code: 'BOOK', title: '予約カレンダー', note: 'ボタンで参加' },
];

const constellationNodes = [
  { title: '公開サイト', top: '17%', left: '12%' },
  { title: '活動ブログ', top: '34%', left: '40%' },
  { title: 'イベント', top: '22%', left: '70%' },
  { title: '予約', top: '64%', left: '78%' },
  { title: 'LINE', top: '76%', left: '26%' },
];

const signalLogs = ['公開', '発見', '予約', 'リマインド'];

const calendarTypes = ['日程カレンダー', 'カード', 'スレッド'];

async function fetchArticles(): Promise<OfficialArticle[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles?limit=3`, { next: { revalidate } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
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

export default async function OrganizersPage() {
  const articles = await fetchArticles();

  return (
    <main className="cosmic-page cosmic-cursor-area min-h-screen overflow-hidden bg-[#020613] text-white">
      <CosmicCursor />
      <GalaxyBackdrop />

      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-[#020613]/72 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-white">
            <Image src="/icon.png" alt="" width={32} height={32} className="rounded-lg" />
            COMIU
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-sm font-bold text-white/68">
            <Link href="/guide" className="hover:text-white">記事</Link>
            <Link href="/pricing" className="hover:text-white">料金</Link>
            <Link href="/login" className="hidden hover:text-white sm:inline">ログイン</Link>
            <Link href="/register" className="rounded-full bg-[#06C755] px-4 py-2 text-white shadow-[0_0_24px_rgba(6,199,85,0.28)] hover:bg-[#05a847]">
              無料作成
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative min-h-screen px-5 pt-20">
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative z-10">
            <div className="hero-copy-warp max-w-3xl">
              <p className="w-fit rounded-full border border-[#83F3A4]/40 bg-[#83F3A4]/10 px-3 py-1.5 text-xs font-bold text-[#83F3A4]">
                次世代型のソーシャルメディア
              </p>
              <h1 className="mt-6 text-5xl font-bold leading-tight sm:text-7xl">
                団体の活動を、
                <span className="block text-[#83F3A4]">ひとつの惑星へ。</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg font-bold leading-8 text-white/76">
                WEBサイト、集客、予約、LINE連絡まで。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="rounded-lg bg-[#06C755] px-5 py-3 text-sm font-bold text-white shadow-[0_0_36px_rgba(6,199,85,0.35)] hover:bg-[#05a847]">
                  無料でWEBサイトを作る
                </Link>
                <Link href="/clubs/18285255/gakuori" className="rounded-lg border border-white/25 bg-white/8 px-5 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/14">
                  公開サイトを見る
                </Link>
              </div>
            </div>
          </div>

          <PlanetScene />
        </div>
      </section>

      <section className="relative px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-[#83F3A4]">COMIU GALAXY</p>
              <h2 className="mt-2 text-3xl font-bold leading-tight sm:text-5xl">
                募集の導線が、軌道に乗る。
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-white/55">
              ページを作る。見つかる。予約が入る。前日に届く。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {orbitFeatures.map((feature, index) => (
              <article key={feature.code} className="galaxy-panel min-h-44 p-5" style={{ animationDelay: `${index * 0.12}s` }}>
                <p className="text-xs font-bold text-[#83F3A4]">{feature.code}</p>
                <h3 className="mt-8 text-xl font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm text-white/55">{feature.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-5 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold text-[#83F3A4]">PORTAL MAP</p>
            <h2 className="mt-2 text-3xl font-bold leading-tight sm:text-5xl">
              活動が、星座みたいにつながる。
            </h2>
            <div className="mt-8 flex flex-wrap gap-2">
              {['公開サイト', 'ブログ', 'イベント', '予約', 'LINE'].map((item) => (
                <span key={item} className="rounded-full border border-white/12 bg-white/7 px-4 py-2 text-sm font-bold text-white/76">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <ConstellationMap />
        </div>
      </section>

      <section className="relative px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-[#83F3A4]">RESERVATION ORBIT</p>
              <h2 className="mt-2 text-3xl font-bold leading-tight sm:text-5xl">
                予約画面も、活動の世界観へ。
              </h2>
            </div>
            <Link href="/register" className="w-fit rounded-lg border border-[#83F3A4]/45 bg-[#83F3A4]/10 px-5 py-3 text-sm font-bold text-[#83F3A4] hover:bg-[#83F3A4]/18">
              作成する
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {calendarTypes.map((type) => (
              <article key={type} className="galaxy-panel p-5">
                <CalendarPreview name={type} />
                <h3 className="mt-5 text-xl font-bold">{type}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-5 py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="galaxy-terminal">
            {signalLogs.map((log, index) => (
              <div key={log} className="flex items-center gap-4 border-b border-white/8 px-5 py-4 last:border-b-0">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#83F3A4]/12 text-xs font-bold text-[#83F3A4]">
                  {index + 1}
                </span>
                <p className="text-lg font-bold">{log}</p>
                <span className="ml-auto h-2 w-20 rounded-full bg-[#83F3A4]/45" />
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-bold text-[#83F3A4]">LINE SIGNAL</p>
            <h2 className="mt-2 text-3xl font-bold leading-tight sm:text-5xl">
              開催前に、ちゃんと届く。
            </h2>
          </div>
        </div>
      </section>

      {articles.length > 0 && (
        <section className="relative px-5 py-20">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-bold text-[#83F3A4]">ARTICLE STOCK</p>
            <h2 className="mt-2 text-3xl font-bold leading-tight sm:text-5xl">
              記事も、入口になる。
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {articles.map((article) => (
                <Link key={article.id} href={`/guide/${article.slug}`} className="galaxy-panel p-5 transition hover:-translate-y-1">
                  {article.category && <p className="text-xs font-bold text-[#83F3A4]">{article.category}</p>}
                  <h3 className="mt-5 line-clamp-2 text-lg font-bold leading-7">{article.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="relative px-5 pb-20 pt-16">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-bold text-[#83F3A4]">READY</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            ひとつの団体から、銀河は広がる。
          </h2>
          <div className="mt-8 flex justify-center">
            <Link href="/register" className="rounded-lg bg-[#06C755] px-6 py-4 text-sm font-bold text-white shadow-[0_0_42px_rgba(6,199,85,0.42)] hover:bg-[#05a847]">
              無料ではじめる
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function GalaxyBackdrop() {
  return (
    <div className="galaxy-backdrop" aria-hidden="true">
      {Array.from({ length: 96 }).map((_, index) => {
        const x = (index * 47) % 100;
        const y = (index * 73) % 100;
        return (
          <span
            key={index}
            className="galaxy-star"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              animationDelay: `${(index % 24) * -0.16}s`,
              animationDuration: `${3.2 + (index % 8) * 0.24}s`,
            }}
          />
        );
      })}
    </div>
  );
}

function PlanetScene() {
  return (
    <div className="planet-scene" aria-hidden="true">
      <div className="planet-orbit planet-orbit-a">
        {orbitFeatures.map((feature, index) => (
          <span key={feature.code} className={`orbit-satellite orbit-satellite-${index + 1}`}>
            {feature.code}
          </span>
        ))}
      </div>
      <div className="planet-orbit planet-orbit-b" />
      <div className="comiu-planet">
        <div className="planet-city">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="planet-caption">
        <span>COMIU</span>
        <strong>ACTIVITY PLANET</strong>
      </div>
    </div>
  );
}

function ConstellationMap() {
  return (
    <div className="constellation-map">
      <svg viewBox="0 0 620 360" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M82 66 C180 42 216 128 248 122 S383 48 434 80 S493 178 486 224 S246 322 160 274" fill="none" stroke="rgba(131,243,164,0.42)" strokeWidth="2" />
        <path d="M248 122 C296 168 334 184 486 224" fill="none" stroke="rgba(89,181,255,0.26)" strokeWidth="1.5" />
      </svg>
      {constellationNodes.map((node) => (
        <div
          key={node.title}
          className="constellation-node"
          style={{ top: node.top, left: node.left } as CSSProperties}
        >
          <span />
          <p>{node.title}</p>
        </div>
      ))}
    </div>
  );
}

function CalendarPreview({ name }: { name: string }) {
  if (name === '日程カレンダー') {
    return (
      <div className="calendar-orbit">
        <div className="mb-3 flex items-center justify-between text-xs font-bold text-white/60">
          <span>JULY</span>
          <span className="h-2 w-10 rounded-full bg-[#83F3A4]" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 14 }).map((_, index) => (
            <span key={index} className={`grid aspect-square place-items-center rounded-md text-xs font-bold ${index === 6 || index === 11 ? 'bg-[#06C755] text-white' : 'bg-white/8 text-white/45'}`}>
              {index + 1}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (name === 'カード') {
    return (
      <div className="calendar-orbit overflow-hidden p-0">
        <div className="h-24 bg-[radial-gradient(circle_at_30%_20%,rgba(131,243,164,0.86),transparent_30%),linear-gradient(120deg,#0B1220,#113F4A_52%,#06C755)]" />
        <div className="space-y-2 p-4">
          <div className="h-3 w-4/5 rounded-full bg-white/80" />
          <div className="h-2 w-3/5 rounded-full bg-white/22" />
          <div className="flex gap-2 pt-1">
            <span className="h-5 w-5 rounded-full bg-[#83F3A4]/70" />
            <span className="h-5 w-5 rounded-full bg-sky-300/70" />
            <span className="h-5 w-5 rounded-full bg-fuchsia-300/70" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-orbit space-y-2">
      {[17, 24, 31].map((day, index) => (
        <div key={day} className="flex items-center gap-3 rounded-lg bg-white/8 p-3">
          <p className="text-sm font-bold text-white">7/{day}</p>
          <div className="min-w-0 flex-1">
            <div className="h-2 w-4/5 rounded-full bg-white/32" />
            <div className="mt-2 h-2 w-2/5 rounded-full bg-white/16" />
          </div>
          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${index === 2 ? 'bg-white/16 text-white/55' : 'bg-[#06C755] text-white'}`}>
            {index === 2 ? '満席' : '受付中'}
          </span>
        </div>
      ))}
    </div>
  );
}
