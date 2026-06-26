import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { SITE_URL } from '@/lib/config';
import CosmicCursor from './CosmicCursor';
import ScrollReveal from './ScrollReveal';
import ManagementTabs from './ManagementTabs';
import BottomCTA from './BottomCTA';

export const revalidate = 60;

const title = 'COMIU（コミュー） | 主催者向け次世代型ポータルサイト';
const description =
  '知識ゼロでもSEO専任担当が初回LPを無料作成。公式LINE自動リマインド、Googleフォーム不要のユーザー管理までこれ一つで。';

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
    <div className="bg-[#f8fafc] font-sans tracking-tight text-slate-900 antialiased pb-20 md:pb-0">
      <CosmicCursor />
      <ScrollReveal />
      <BottomCTA />

      {/* ヘッダー */}
      <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <BrandLogo />
          <a
            href="#cta"
            className="rounded-full bg-slate-900 px-5 py-2 text-xs font-medium tracking-wide text-white shadow-sm transition-all hover:bg-slate-800"
          >
            無料で試す
          </a>
        </div>
      </header>

      <main>
        {/* ヒーロー */}
        <section className="relative overflow-hidden bg-[radial-gradient(100%_100%_at_50%_0%,rgba(167,243,208,0.15)_0%,rgba(251,207,232,0.1)_50%,rgba(248,250,252,0)_100%)] py-20 lg:py-28">
          <div className="relative z-10 mx-auto max-w-6xl px-6">
            <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
              {/* テキスト */}
              <div className="flex-1 text-center lg:text-left">
                <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-slate-900/5 px-3.5 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-800">
                  Organizer Portal Platform
                </span>
                <h1 className="mb-6 text-3xl font-black leading-[1.15] tracking-tighter text-slate-950 lg:text-5xl">
                  無料で、自動で、強いWEB集客。<br className="hidden sm:block" />
                  <span className="brand-text-gradient">洗練された団体管理</span>をこれ一つで。
                </h1>
                <p className="mb-10 max-w-xl text-sm font-light leading-relaxed text-slate-500 lg:text-lg">
                  SEO特化のサイト自動生成から、公式LINE自動リマインド、安全な決済管理まで。
                  コミュニティ運営に必要なすべてをスマートに統合。
                </p>
                <a
                  href="#cta"
                  className="inline-block transform rounded-full bg-slate-950 px-10 py-4 text-center text-sm font-bold tracking-wide text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl"
                >
                  今すぐ無料で始める
                </a>
              </div>
              {/* モックアップ画像 */}
              <div className="w-full max-w-xs shrink-0 lg:max-w-sm xl:max-w-md">
                <Image
                  src="/comiu_portal_mockup.svg"
                  alt="COMIUポータル画面"
                  width={480}
                  height={480}
                  className="w-full drop-shadow-2xl"
                  priority
                  unoptimized
                />
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE 01 */}
        <section className="fade-in mx-auto max-w-6xl px-6 py-20">
          <div className="mb-14 text-center">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-emerald-600">
              01 / Automatic Marketing
            </span>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 lg:text-4xl">無料で自動で強いWEB集客</h2>
            <p className="mt-2 text-xs font-light text-slate-400 lg:text-sm">自動で働き続ける「資産型」の強力なSEOシステム。</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-200/60 bg-white p-7 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(0,0,0,0.04)]">
              <div className="mb-5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 font-mono text-xs font-bold text-emerald-600">01</div>
              <h3 className="mb-3 text-base font-bold leading-snug text-slate-950">
                知識ゼロでも安心。SEO専任担当による「初回LP無料作成＆定期巡回サポート」
              </h3>
              <p className="text-xs font-light leading-relaxed text-slate-500">
                検索エンジンに最適化された団体専用ページが、登録後すぐに自動生成。専門知識がなくても、Google検索で見つけられやすい強いWebサイトが無料で手に入ります。
                <br /><br />
                さらに各団体に専任の担当者を配置し、定期巡回から回数無制限のチャットサポートまで手厚く伴走。希望に応じて初回のヒアリングLP作成代行も無料で行います。
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200/60 bg-white p-7 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(0,0,0,0.04)]">
              <div className="mb-5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 font-mono text-xs font-bold text-emerald-600">02</div>
              <h3 className="mb-3 text-base font-bold leading-snug text-slate-950">
                イベント作成や活動ブログがポータルサイトへ自動反映
              </h3>
              <p className="text-xs font-light leading-relaxed text-slate-500">
                あなたがCOMIU内でイベントを作ったりブログを書くだけで、次世代型ポータルサイトへ自動的に掲載。2重で更新する手間の完全ゼロ化と、Web上の露出アップを同時に叶えます。
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200/60 bg-white p-7 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(0,0,0,0.04)]">
              <div className="mb-5 flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10 font-mono text-xs font-bold text-pink-500">03</div>
              <h3 className="mb-3 text-base font-bold leading-snug text-slate-950">
                他社と圧倒的な差がつく「蓄積型」の最強集客コンテンツ
              </h3>
              <p className="text-xs font-light leading-relaxed text-slate-500">
                一時的なSNS広告とは異なり、日々の活動記録がすべて「検索に強いWeb資産」として蓄積されます。運営を続ければ続けるほど、Google等から自動で集客力が育つ仕組みです。
              </p>
            </article>
          </div>
        </section>

        {/* FEATURE 02 */}
        <section className="rounded-t-[32px] bg-[#0b0f19] py-20 text-slate-100">
          <div className="mx-auto max-w-4xl px-6">
            <div className="mb-10 text-center">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-pink-400">
                02 / Smart Management
              </span>
              <h2 className="text-2xl font-black tracking-tight text-white lg:text-4xl">COMIUの洗練された団体管理</h2>
              <p className="mt-2 text-xs font-light text-slate-500">タップして各機能のコアテクノロジーをチェック</p>
            </div>
            <ManagementTabs />
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="bg-gradient-to-b from-[#0b0f19] to-[#f8fafc] py-24 text-center">
          <div className="fade-in mx-auto max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            <Image src="/icon.png" alt="COMIU" width={36} height={36} className="mx-auto mb-4 rounded-full shadow-sm" />
            <h2 className="mb-2 text-xl font-black tracking-tight text-slate-950">
              さあ、一歩進んだ団体運営を始めましょう
            </h2>
            <p className="mb-8 text-xs font-light text-slate-400">初期費用・月額固定費は一切かかりません。</p>
            <Link
              href="/register"
              className="block w-full rounded-full bg-slate-950 py-4 text-sm font-bold tracking-wide text-white shadow-md transition-all hover:bg-slate-900 hover:shadow-xl"
            >
              無料でCOMIUを始める
            </Link>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="border-t border-slate-100 bg-white py-10 text-center text-[10px] uppercase tracking-widest text-slate-400">
        <p>&copy; 2026 COMIU. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
