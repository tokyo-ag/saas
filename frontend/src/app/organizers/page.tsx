import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { SITE_URL } from '@/lib/config';
import CosmicCursor from './CosmicCursor';
import WarpGimmicks from './WarpGimmicks';

export const revalidate = 60;

const title = '団体・サークルのWEBサイトを無料作成 | COMIU';
const description =
  'COMIUは、団体やサークルのSEOに強いWEBサイト作成、ポータル掲載、予約カレンダー、公式LINE APIのリマインド連絡をまとめて使える主催者向けサービスです。';

const warpLabels = ['WEBサイト無料', 'SEOポータル', 'LINEリマインド', '予約カレンダー'];
const flow = ['作る', '見つかる', '予約', '届く'];
const calendarTypes = ['日程カレンダー', 'カード', 'スレッド'];

const tunnelPaths = [
  'M-40 290 C160 100 400 380 760 174 C1040 12 1240 108 1400 -20',
  'M-20 650 C170 520 330 280 660 316 C960 350 1130 590 1380 410',
  'M40 -20 C230 130 410 170 620 152 C900 128 1090 30 1320 150',
  'M60 760 C260 614 420 526 620 512 C920 488 1030 688 1290 760',
  'M-80 104 C190 260 410 318 642 286 C880 252 1110 184 1380 252',
  'M120 -60 C280 170 494 236 696 224 C990 206 1080 70 1370 24',
  'M-60 438 C170 390 358 402 610 370 C880 335 1040 452 1380 530',
  'M20 24 C210 178 392 244 580 252 C850 264 1100 374 1340 690',
];

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

export default function OrganizersPage() {
  return (
    <main className="warp-page cosmic-cursor-area min-h-screen overflow-hidden text-white">
      <CosmicCursor />
      <WarpGimmicks />
      <WarpField />

      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-[#010208]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-white">
            <Image src="/icon.png" alt="" width={32} height={32} className="rounded-lg" />
            COMIU
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-sm font-bold text-white/68">
            <Link href="/guide" className="hover:text-white">記事</Link>
            <Link href="/pricing" className="hover:text-white">料金</Link>
            <Link href="/login" className="hidden hover:text-white sm:inline">ログイン</Link>
            <WarpCTAButton href="/register" className="rounded-full bg-[#06C755] px-4 py-2 text-white shadow-[0_0_28px_rgba(6,199,85,0.36)] hover:bg-[#05a847]">
              無料作成
            </WarpCTAButton>
          </nav>
        </div>
      </header>

      <section className="relative min-h-screen px-5 pt-20">
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 py-12 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="relative z-10">
            <div className="warp-copy max-w-3xl">
              <p className="w-fit rounded-full border border-[#7DD3FC]/44 bg-[#7DD3FC]/10 px-3 py-1.5 text-xs font-bold text-[#7DD3FC]">
                次世代型のソーシャルメディア
              </p>
              <h1 className="mt-6 text-5xl font-bold leading-[1.03] sm:text-7xl" data-warp-headline>
                団体運営を、
                <span className="block text-[#7DD3FC]">次の速度へ。</span>
              </h1>
              <p className="mt-6 text-lg font-bold leading-8 text-white/75">
                WEBサイト、集客、予約、LINE連絡まで。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <WarpCTAButton href="/register" className="rounded-lg bg-[#06C755] px-5 py-3 text-sm font-bold text-white shadow-[0_0_42px_rgba(6,199,85,0.42)] hover:bg-[#05a847]">
                  無料でWEBサイトを作る
                </WarpCTAButton>
                <Link href="/clubs/18285255/gakuori" className="rounded-lg border border-white/24 bg-white/8 px-5 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/14">
                  公開サイトを見る
                </Link>
              </div>
            </div>
          </div>

          <WarpCore />
        </div>
      </section>

      <section className="relative px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="warp-section-title">
            <p>ACCELERATION</p>
            <h2>公開した瞬間、導線が走り出す。</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {warpLabels.map((label, index) => (
              <article key={label} className="warp-panel p-5" style={{ animationDelay: `${index * 0.08}s` }}>
                <span className="text-xs font-bold text-[#7DD3FC]">0{index + 1}</span>
                <h3 className="mt-10 text-xl font-bold">{label}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-5 py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="warp-section-title text-left">
            <p>FLOW</p>
            <h2>募集から予約まで、ひとつの流れに。</h2>
          </div>
          <div className="warp-flow">
            {flow.map((item, index) => (
              <div key={item} className="warp-flow-node">
                <span>{index + 1}</span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="warp-section-title">
            <p>RESERVATION</p>
            <h2>予約画面は、活動に合わせて選べる。</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {calendarTypes.map((type) => (
              <article key={type} className="warp-panel p-5">
                <CalendarPreview name={type} />
                <h3 className="mt-5 text-xl font-bold">{type}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-5 pb-20 pt-16">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-bold text-[#7DD3FC]">READY</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            はじめた瞬間、運営は加速する。
          </h2>
          <div className="mt-8 flex justify-center">
            <WarpCTAButton href="/register" className="rounded-lg bg-[#06C755] px-6 py-4 text-sm font-bold text-white shadow-[0_0_46px_rgba(6,199,85,0.45)] hover:bg-[#05a847]">
              無料ではじめる
            </WarpCTAButton>
          </div>
        </div>
      </section>
    </main>
  );
}

// ② ワープ速度CTA ボタン（client component として分離）
function WarpCTAButton({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return (
    <a href={href} data-warp-cta="1" className={className}>
      {children}
    </a>
  );
}

function WarpField() {
  return (
    <div className="warp-field" aria-hidden="true">
      <div className="warp-vortex" />
      <svg className="warp-paths" viewBox="0 0 1360 760" preserveAspectRatio="none">
        {tunnelPaths.map((path, index) => (
          <path
            key={path}
            d={path}
            style={{
              animationDelay: `${index * -0.22}s`,
              animationDuration: `${1.6 + index * 0.09}s`,
            }}
          />
        ))}
      </svg>
      {Array.from({ length: 56 }).map((_, index) => (
        <span
          key={index}
          className="warp-spark"
          style={{
            left: `${(index * 41) % 100}%`,
            top: `${(index * 67) % 100}%`,
            animationDelay: `${(index % 20) * -0.12}s`,
            animationDuration: `${1.2 + (index % 8) * 0.09}s`,
          }}
        />
      ))}
    </div>
  );
}

function WarpCore() {
  return (
    <div className="warp-core-stage" aria-hidden="true">
      <div className="warp-core-rings">
        {Array.from({ length: 8 }).map((_, index) => (
          <span key={index} style={{ animationDelay: `${index * -0.45}s` } as CSSProperties} />
        ))}
      </div>
      <div className="warp-gate">
        <div className="warp-gate-hole" />
        {warpLabels.map((label, index) => (
          <span key={label} className={`warp-chip warp-chip-${index + 1}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function CalendarPreview({ name }: { name: string }) {
  if (name === '日程カレンダー') {
    return (
      <div className="warp-calendar">
        <div className="mb-3 flex items-center justify-between text-xs font-bold text-white/60">
          <span>JULY</span>
          <span className="h-2 w-10 rounded-full bg-[#7DD3FC]" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 14 }).map((_, index) => (
            <span key={index} className={`grid aspect-square place-items-center rounded-md text-xs font-bold ${index === 6 || index === 11 ? 'bg-[#3B82F6] text-white' : 'bg-white/8 text-white/45'}`}>
              {index + 1}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (name === 'カード') {
    return (
      <div className="warp-calendar overflow-hidden p-0">
        <div className="h-24 bg-[radial-gradient(circle_at_30%_20%,rgba(125,211,252,0.8),transparent_30%),linear-gradient(120deg,#0c1836,#1e3a8a_52%,#1d4ed8)]" />
        <div className="space-y-2 p-4">
          <div className="h-3 w-4/5 rounded-full bg-white/80" />
          <div className="h-2 w-3/5 rounded-full bg-white/22" />
          <div className="flex gap-2 pt-1">
            <span className="h-5 w-5 rounded-full bg-[#7DD3FC]/70" />
            <span className="h-5 w-5 rounded-full bg-violet-300/70" />
            <span className="h-5 w-5 rounded-full bg-sky-300/70" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="warp-calendar space-y-2">
      {[17, 24, 31].map((day, index) => (
        <div key={day} className="flex items-center gap-3 rounded-lg bg-white/8 p-3">
          <p className="text-sm font-bold text-white">7/{day}</p>
          <div className="min-w-0 flex-1">
            <div className="h-2 w-4/5 rounded-full bg-white/32" />
            <div className="mt-2 h-2 w-2/5 rounded-full bg-white/16" />
          </div>
          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${index === 2 ? 'bg-white/16 text-white/55' : 'bg-[#3B82F6] text-white'}`}>
            {index === 2 ? '満席' : '受付中'}
          </span>
        </div>
      ))}
    </div>
  );
}
