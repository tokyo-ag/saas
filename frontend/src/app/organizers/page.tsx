import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { SITE_URL } from '@/lib/config';
import CosmicCursor from './CosmicCursor';
import ScrollReveal from './ScrollReveal';
import ManagementTabs from './ManagementTabs';
import BottomCTA from './BottomCTA';

export const revalidate = 60;

const title = 'COMIU（コミュー） | サークルの募集・予約・LINE連絡をひとつに';
const description =
  'COMIUは、学生サークル・社会人サークル向けに、無料WEBサイト作成、SEO、ポータル自動掲載、ワンタップ予約、公式LINE API連携をまとめて提供します。';

const strengths = [
  {
    label: '無料WEBサイト',
    title: 'サークルの募集ページを無料で作成',
    text: '団体紹介、活動ブログ、イベント一覧、問い合わせまで。SNSだけでは流れてしまう情報を、検索に残る公開ページとして持てます。',
  },
  {
    label: 'SEO・ポータル掲載',
    title: '検索とCOMIUポータルの両方で見つかる',
    text: 'SEOを意識した公開ページに加えて、作成したイベントや活動記事をCOMIUポータルへ自動反映。更新の手間を増やさず露出を作ります。',
  },
  {
    label: 'ワンタップ予約',
    title: '参加者は日程を選んでそのまま予約',
    text: '日程カレンダー、カード、スレッドから活動に合う予約画面を選択。GoogleフォームやDMに分散しがちな予約をひとつにまとめます。',
  },
  {
    label: '公式LINE API連携',
    title: '予約後の連絡とリマインドをLINEで',
    text: '公式LINE APIとつなげて、予約確認、前日リマインド、問い合わせ対応まで。参加者が普段使うLINEで自然に運営できます。',
  },
];

const problems = [
  'Instagram投稿だけだと、募集情報がすぐ流れてしまう',
  'DM、Googleフォーム、スプレッドシートで予約管理が分散する',
  'イベント前の案内やリマインドを毎回手作業で送っている',
  '新歓・体験会のたびに、同じ説明を何度も繰り返している',
];

const flow = ['募集ページ公開', 'ポータル自動掲載', 'ワンタップ予約', 'LINEリマインド'];

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

function BrandLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <Image src="/icon.png" alt="COMIU" width={28} height={28} className="rounded-full shadow-sm" />
      <div className="text-lg font-black tracking-widest text-slate-900">
        <span className="text-emerald-600">COM</span>
        <span className="text-pink-500">IU</span>
      </div>
    </div>
  );
}

export default function OrganizersPage() {
  return (
    <div className="bg-[#f8fafc] pb-20 font-sans tracking-tight text-slate-900 antialiased md:pb-0">
      <CosmicCursor />
      <ScrollReveal />
      <BottomCTA />

      <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="COMIUトップへ">
            <BrandLogo />
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-slate-950 px-5 py-2 text-xs font-bold tracking-wide text-white shadow-sm transition-all hover:bg-slate-800"
          >
            無料で始める
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[radial-gradient(100%_100%_at_55%_0%,rgba(16,185,129,0.14)_0%,rgba(236,72,153,0.09)_42%,rgba(248,250,252,0)_74%)] py-20 lg:py-28">
          <div className="relative z-10 mx-auto max-w-6xl px-6">
            <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
              <div className="flex-1 text-center lg:text-left">
                <span className="mb-6 inline-flex items-center rounded-full border border-slate-900/10 bg-white/72 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 shadow-sm">
                  Circle Recruiting Platform
                </span>
                <h1 className="mb-6 text-[40px] font-black leading-[1.08] tracking-tighter text-slate-950 md:text-5xl lg:text-[56px]">
                  <span className="block">サークルの募集ページを</span>
                  <span className="block">無料で公開。</span>
                  <span className="brand-text-gradient block">予約もLINE連絡も</span>
                  <span className="block">COMIUで完結。</span>
                </h1>
                <p className="mb-9 max-w-2xl text-sm leading-8 text-slate-600 lg:text-base">
                  <span className="block">SEOに強い公開ページ、COMIUポータルへの自動掲載、</span>
                  <span className="block">ワンタップ予約、公式LINE API連携まで。</span>
                  <span className="block">学生サークル・社会人サークルの募集と運営をまとめます。</span>
                </p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                  <Link
                    href="/register"
                    className="rounded-full bg-slate-950 px-8 py-4 text-center text-sm font-bold tracking-wide text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl"
                  >
                    無料で募集ページを作る
                  </Link>
                  <Link
                    href="/clubs/18285255/gakuori"
                    className="rounded-full border border-slate-200 bg-white px-8 py-4 text-center text-sm font-bold tracking-wide text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
                  >
                    公開サイトを見る
                  </Link>
                </div>
              </div>

              <div className="w-full max-w-[260px] shrink-0 sm:max-w-[300px] lg:max-w-[320px] xl:max-w-[340px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/comiu_portal_mockup.svg"
                  alt="COMIUポータル画面"
                  className="mx-auto h-auto max-h-[430px] w-full object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="fade-in mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="mb-10 max-w-3xl">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-emerald-600">
              What COMIU Does
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 lg:text-5xl">
              SNS募集の次に必要なものを、ひとつに。
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {strengths.map((item, index) => (
              <article
                key={item.label}
                className="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_30px_rgba(15,23,42,0.06)]"
              >
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 font-mono text-xs font-bold text-emerald-600">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="text-xs font-bold text-emerald-600">{item.label}</p>
                </div>
                <h3 className="mb-3 text-xl font-black leading-snug text-slate-950">{item.title}</h3>
                <p className="text-sm leading-7 text-slate-500">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200/70 bg-white py-16 lg:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-pink-500">
                Before COMIU
              </span>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 lg:text-5xl">
                募集はできている。<br />
                でも運営が散らばる。
              </h2>
              <p className="mt-5 text-sm leading-8 text-slate-500">
                COMIUは、SNSで興味を持った参加者を公開ページへ誘導し、そのまま予約、名簿、LINE連絡までつなげます。
              </p>
            </div>
            <div className="grid gap-3">
              {problems.map((problem) => (
                <div key={problem} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold leading-7 text-slate-700">
                  {problem}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="fade-in mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="mb-10 text-center">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-emerald-600">
              Simple Flow
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 lg:text-5xl">
              ページ公開からリマインドまで。
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {flow.map((step, index) => (
              <div key={step} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="font-mono text-xs font-bold text-slate-400">STEP {index + 1}</p>
                <p className="mt-5 text-lg font-black text-slate-950">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-t-[32px] bg-[#0b0f19] py-20 text-slate-100">
          <div className="mx-auto max-w-4xl px-6">
            <div className="mb-10 text-center">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-pink-400">
                Management
              </span>
              <h2 className="text-3xl font-black tracking-tight text-white lg:text-5xl">
                予約・LINE・参加者管理まで。
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                分かる人には伝わる機能も、主催者が使いやすい形で。
              </p>
            </div>
            <ManagementTabs />
          </div>
        </section>

        <section id="cta" className="bg-gradient-to-b from-[#0b0f19] to-[#f8fafc] py-24 text-center">
          <div className="fade-in mx-auto max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            <Image src="/icon.png" alt="COMIU" width={36} height={36} className="mx-auto mb-4 rounded-full shadow-sm" />
            <h2 className="mb-2 text-xl font-black tracking-tight text-slate-950">
              まずは募集ページを公開しよう。
            </h2>
            <p className="mb-8 text-sm leading-7 text-slate-500">
              学生サークルも、社会人サークルも。無料で始められます。
            </p>
            <Link
              href="/register"
              className="block w-full rounded-full bg-slate-950 py-4 text-sm font-bold tracking-wide text-white shadow-md transition-all hover:bg-slate-900 hover:shadow-xl"
            >
              無料でCOMIUを始める
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white py-10 text-center text-[10px] uppercase tracking-widest text-slate-400">
        <p>&copy; 2026 COMIU. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
