import type { Metadata } from 'next';
import Link from 'next/link';

import { SITE_URL } from '@/lib/config';
import CosmicCursor from './CosmicCursor';
import ScrollReveal from './ScrollReveal';

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
    <div className="flex items-center gap-2">
      <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm">
        CO
      </div>
      <div className="text-xl font-black tracking-wider text-slate-800">
        <span className="text-emerald-500">COM</span>
        <span className="text-pink-400">IU</span>
      </div>
    </div>
  );
}

export default function OrganizersPage() {
  return (
    <div className="bg-slate-50/50 font-sans text-slate-800 antialiased">
      <CosmicCursor />
      <ScrollReveal />

      {/* ヘッダー */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <BrandLogo />
          <a
            href="#cta"
            className="rounded-full bg-gradient-to-r from-emerald-500 to-pink-400 px-6 py-2 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90"
          >
            無料で試す
          </a>
        </div>
      </header>

      <main>
        {/* ヒーロー */}
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-pink-50/40 to-slate-50 py-20 lg:py-28">
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
            <span className="mb-6 inline-block rounded-full border border-emerald-100 bg-white px-4 py-1.5 text-xs font-bold tracking-wide text-emerald-600 shadow-xs lg:text-sm">
              主催者向け・次世代型ポータルサイト
            </span>
            <h1 className="mb-6 text-3xl font-black leading-snug tracking-tight text-slate-900 lg:text-5xl">
              無料で、自動で、強いWEB集客。<br className="hidden sm:block" />
              <span className="brand-text-gradient">洗練された団体管理</span>をこれ一つで。
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-slate-600 lg:text-lg">
              SEO特化のサイト自動生成から、公式LINE自動リマインド、安全な決済管理まで。<br className="hidden sm:block" />
              コミュニティ・イベント運営に必要なすべてを自動化するシステム「COMIU（コミュー）」
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#cta"
                className="w-full transform rounded-xl bg-slate-950 px-10 py-4 text-center text-base font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-slate-800 sm:w-auto"
              >
                今すぐ無料でアカウント作成
              </a>
            </div>
          </div>
        </section>

        {/* ペインポイントバナー */}
        <section className="mx-auto max-w-4xl px-4 py-12">
          <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs md:flex-row lg:p-8">
            <div>
              <h4 className="text-lg font-bold text-slate-900">今のツール運営、バラバラで疲れていませんか？</h4>
              <p className="mt-1 text-sm text-slate-500">
                集客、LINE連絡、予約表、Googleフォーム、決済。COMIUならすべて1つの画面で完結します。
              </p>
            </div>
            <a href="#feature" className="flex items-center gap-1 whitespace-nowrap text-sm font-bold text-emerald-600 hover:text-emerald-700">
              解決する機能を見る ↓
            </a>
          </div>
        </section>

        {/* FEATURE 01 */}
        <section id="feature" className="fade-in mx-auto max-w-6xl px-4 py-20">
          <div className="mb-16 text-center">
            <span className="mb-2 block text-sm font-bold tracking-wider text-emerald-500">FEATURE 01</span>
            <h2 className="text-2xl font-black tracking-tight lg:text-4xl">無料で自動で強いWEB集客</h2>
            <p className="mt-3 text-sm text-slate-500 lg:text-base">作って終わりじゃない。自動で働き続ける「資産型」のSEOシステム。</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xs transition-all hover:border-emerald-200">
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-500">01</div>
              <h3 className="mb-3 text-lg font-bold text-slate-900">
                知識ゼロでも安心。SEO専任担当による「初回LP無料作成＆定期巡回サポート」
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                検索エンジンに最適化された団体専用ページが、登録後すぐに自動生成。専門知識がなくても、Google検索で見つけられやすい強いWebサイトが無料で手に入ります。
                <br className="mb-2 block" />
                さらに、各団体に専任の担当者を配置。定期的なページ巡回から、回数無制限のチャットサポートまで手厚く伴走します。希望に応じて完全任意で初回のヒアリングLP作成代行も無料で行います。
              </p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xs transition-all hover:border-emerald-200">
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-500">02</div>
              <h3 className="mb-3 text-lg font-bold text-slate-900">
                イベント作成や活動ブログがポータルサイトへ自動反映
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                あなたがCOMIU内でイベントを作ったりブログを書くだけで、次世代型ポータルサイトへ自動的に掲載。2重で更新する手間の完全ゼロ化と、Web上の露出アップを同時に叶えます。
              </p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xs transition-all hover:border-pink-200">
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 font-bold text-pink-400">03</div>
              <h3 className="mb-3 text-lg font-bold text-slate-900">
                他社と圧倒的な差がつく「蓄積型」の最強集客コンテンツ
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                一時的なSNS広告とは異なり、日々の活動記録がすべて「検索に強いWeb資産」として蓄積されます。運営を続ければ続けるほど、Google等から自動で集客力が育つ仕組みです。
              </p>
            </article>
          </div>
        </section>

        {/* FEATURE 02 */}
        <section className="rounded-t-3xl bg-slate-900 py-20 text-white lg:rounded-t-[40px]">
          <div className="fade-in mx-auto max-w-6xl px-4">
            <div className="mb-16 text-center">
              <span className="mb-2 block text-sm font-bold tracking-wider text-pink-400">FEATURE 02</span>
              <h2 className="text-2xl font-black tracking-tight lg:text-4xl">COMIUの洗練された団体管理</h2>
              <p className="mt-3 text-sm text-slate-400 lg:text-base">手作業の無駄を排除。スマートで無駄のない運営基盤を構築。</p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              {[
                {
                  color: 'text-emerald-400',
                  title: '公式LINEによるドタキャン防止の「自動リマインド」',
                  body: (
                    <>
                      イベント直前のリマインドメッセージを、ユーザーが普段使い慣れている公式LINEへ自動配信。連絡漏れによる不参加や直前キャンセルを劇的に減らします。配信時間や文章の内容は、団体の特色に合わせて自由なカスタマイズが可能です。
                      <br className="mb-2 block" />
                      個人でLステップのようにAPI連携やデータベース（DB）管理を行おうとすると、膨大な学習時間とコストを要しますが、COMIUなら誰でも簡単に連携可能。設定に不安がある場合は、オンラインでの適切な導入案内サポートもご用意しています。
                    </>
                  ),
                },
                {
                  color: 'text-emerald-400',
                  title: '目的に合わせて選べるカレンダーからボタン一つで簡単予約',
                  body: (
                    <>
                      団体の特性やイベント形態に合わせて、最適な表示に切り替えられるカレンダーUIを採用。
                      <br className="mb-2 block" />
                      さらに、公式LINEのチャット画面、リッチメニュー、カード、ボタンなどに予約URLリンクを直接埋め込むことで、ユーザーを迷わせない「直感的かつワンタップで完了する予約導線」を構築できます。
                    </>
                  ),
                },
                {
                  color: 'text-pink-400',
                  title: 'Googleフォームやスプレッドシートいらずのユーザー管理',
                  body: (
                    <>
                      予約データと顧客情報（ユーザー属性）が自動でシステム内に紐づきます。バラバラのフォームや手動の顧客名簿を行き来して突合する無駄な業務はもう不要です。
                      <br className="mb-2 block" />
                      また、無断キャンセルや悪質なユーザーに対してはブロック機能による対策が可能。対象ユーザーに警告ラベルを付与して可視化することで、COMIUプラットフォーム全体で健全かつ質の高いコミュニティ環境を担保します。
                    </>
                  ),
                },
                {
                  color: 'text-pink-400',
                  title: '専門業者との安心連携による安全なオンライン決済管理',
                  body: '面倒な参加費の集金や未入金トラブルを未然に防ぐため、強固なセキュリティを持つ決済システムと標準連携。安全かつスマートなお金の管理を実現します。',
                },
              ].map((f) => (
                <div key={f.title} className="rounded-2xl border border-slate-800 bg-slate-800/60 p-6 transition-all hover:border-slate-700">
                  <div className="mb-3 flex items-center gap-3">
                    <span className={`text-lg ${f.color}`}>●</span>
                    <h3 className="text-lg font-bold">{f.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-400">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-white py-24 text-center">
          <div className="fade-in relative z-10 mx-auto max-w-3xl rounded-3xl border border-slate-100 bg-white p-8 shadow-xl lg:p-12">
            <div className="brand-gradient mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white shadow-xs">
              CO
            </div>
            <h2 className="mb-4 text-2xl font-black tracking-tight text-slate-950 lg:text-4xl">
              さあ、一歩進んだ団体運営を始めましょう
            </h2>
            <p className="mx-auto mb-8 max-w-md text-sm text-slate-500 lg:text-base">
              自動集客と洗練された管理システム。COMIUは、主催者を煩雑な作業から解放し、コミュニティの価値を高めます。
            </p>
            <div className="mx-auto max-w-sm">
              <Link
                href="/register"
                className="block w-full rounded-xl bg-gradient-to-r from-emerald-500 to-pink-400 px-8 py-4 text-base font-black tracking-wide text-white shadow-md transition-all hover:opacity-95"
              >
                無料でCOMIUを始める
              </Link>
              <p className="mt-3 text-[11px] text-slate-400">※初期費用・月額固定費は一切かかりません。</p>
            </div>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="border-t border-slate-100 bg-white py-8 text-center text-xs text-slate-400">
        <p>&copy; 2026 COMIU All Rights Reserved.</p>
      </footer>
    </div>
  );
}
