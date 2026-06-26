import type { Metadata } from 'next';
import Link from 'next/link';

import { SITE_URL } from '@/lib/config';
import CosmicCursor from './CosmicCursor';
import ScrollReveal from './ScrollReveal';

export const revalidate = 60;

const title = 'COMIU（コミュー） | 主催者向け次世代型ポータルサイト';
const description =
  '無料で自動で強いWEB集客と、公式LINE連携による洗練された団体管理。次世代型ポータルサイトCOMIU（コミュー）。';

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
    <div className="bg-slate-50 font-sans text-slate-800 antialiased">
      <CosmicCursor />
      <ScrollReveal />

      {/* ヘッダー */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="text-2xl font-black tracking-wider text-indigo-600">COMIU</div>
          <a
            href="#cta"
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700"
          >
            無料で試す
          </a>
        </div>
      </header>

      <main>
        {/* ヒーロー */}
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 py-20 text-white lg:py-32">
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
            <span className="mb-6 inline-block rounded-full border border-indigo-400/20 bg-indigo-500/30 px-4 py-1.5 text-xs font-bold tracking-wide text-indigo-300 lg:text-sm">
              主催者向け・次世代型ポータルサイト
            </span>
            <h1 className="mb-6 text-3xl font-black leading-tight tracking-tight lg:text-6xl">
              無料で、自動で、強いWEB集客。<br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                洗練された団体管理
              </span>をこれ一つで。
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-indigo-100 lg:text-xl">
              「COMIU（コミュー）」は、SEO特化のサイト作成から、公式LINE自動リマインド、決済まで一気通貫で自動化するシステムです。
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="#cta"
                className="transform rounded-xl bg-amber-500 px-10 py-4 text-lg font-black text-slate-900 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-amber-400"
              >
                今すぐ無料でアカウント作成
              </a>
            </div>
          </div>
        </section>

        {/* FEATURE 01 集客 */}
        <section className="fade-in mx-auto max-w-6xl px-4 py-20 lg:py-28">
          <div className="mb-16 text-center">
            <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-indigo-600">FEATURE 01</span>
            <h2 className="text-3xl font-black tracking-tight lg:text-4xl">無料で自動で強いWEB集客</h2>
            <p className="mt-4 text-slate-500">作って終わりじゃない。自動で働き続ける「蓄積型」のSEOシステム。</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition-all hover:shadow-md">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-bold">SEO特化のWEBサイトを無料作成</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                専門知識は一切不要。検索エンジンに最適化された美しい団体専用ページが、登録したその瞬間に無料で生成されます。
              </p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition-all hover:shadow-md">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.213 6H16" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-bold">イベントやブログが自動反映</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                あなたが普段通りイベントを作成したり、活動ブログを書くだけで、COMIUのポータルサイトへ自動的に掲載・更新されます。
              </p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition-all hover:shadow-md">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-bold">他社と差別化された最強コンテンツ</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                一時的な広告とは異なり、日々の活動情報がすべて「検索に強い資産（蓄積型コンテンツ）」として残り、長期的な集客力を生み出します。
              </p>
            </article>
          </div>
        </section>

        {/* FEATURE 02 管理 */}
        <section className="overflow-hidden bg-slate-900 py-20 text-white lg:py-28">
          <div className="fade-in mx-auto max-w-6xl px-4">
            <div className="mb-16 text-center">
              <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-amber-400">FEATURE 02</span>
              <h2 className="text-3xl font-black tracking-tight lg:text-4xl">COMIUの洗練された団体管理</h2>
              <p className="mt-4 text-slate-400">バラバラだったツールを一つに。スマートで無駄のない運営基盤。</p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              {[
                {
                  title: '公式LINEによる自動リマインドサービス',
                  body: 'ドタキャンや連絡漏れを防ぐ。イベント直前のリマインドメッセージを、使い慣れた公式LINEからユーザーへ自動配信します。',
                },
                {
                  title: '選べるカレンダーからボタン一つで簡単予約',
                  body: '視覚的で使い分けることができるカレンダーUIを採用。ユーザーは迷うことなく、ワンタップでスムーズに予約を完了できます。',
                },
                {
                  title: 'Googleフォームいらずのユーザー管理',
                  body: '予約データと顧客情報が自動で紐づくため、もう複雑なスプレッドシートや複数のフォームを行き来して管理する必要はありません。',
                },
                {
                  title: '専門業者による安全な決済管理システム連携',
                  body: '集金トラブルや未入金をゼロに。強固なセキュリティを備えた専門の決済システムと標準連携し、安全にお金を管理します。',
                },
              ].map((f) => (
                <div key={f.title} className="flex gap-4 rounded-xl border border-slate-800 bg-slate-800/50 p-6">
                  <div className="text-2xl font-bold text-emerald-400">✔</div>
                  <div>
                    <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-400">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="relative overflow-hidden bg-indigo-50 py-20 text-center lg:py-32">
          <div className="fade-in relative z-10 mx-auto max-w-3xl px-4">
            <h2 className="mb-6 text-3xl font-black tracking-tight text-slate-950 lg:text-5xl">
              さあ、一歩進んだ<br className="sm:hidden" />団体運営を始めましょう
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-slate-600 lg:text-lg">
              自動集客と洗練された管理システム。COMIUは、主催者のあなたを煩雑な作業から解放し、コミュニティの価値を高めます。
            </p>
            <div className="inline-block w-full max-w-md rounded-2xl border border-indigo-100 bg-white p-2 shadow-xl">
              <Link
                href="/register"
                className="block w-full rounded-xl bg-indigo-600 px-8 py-4 text-lg font-black tracking-wide text-white transition-all hover:bg-indigo-700"
              >
                無料でCOMIUを始める
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">※初期費用・月額固定費は一切かかりません。</p>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <p>&copy; 2026 COMIU All Rights Reserved.</p>
      </footer>
    </div>
  );
}
