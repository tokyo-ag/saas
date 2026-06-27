import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { SITE_URL } from '@/lib/config';
import CosmicCursor from './CosmicCursor';
import ScrollReveal from './ScrollReveal';
import BottomCTA from './BottomCTA';

export const revalidate = 60;

const title = 'COMIU（コミュー） | イベント・サークルの集客ならCOMIU';
const description =
  '団体に合わせたWebサイトを無料で作成。イベント募集、予約管理、活動ブログ、参加者管理、公式LINEリマインドまでまとめて運営できます。';

const navItems = [
  { label: 'できること', href: '#features' },
  { label: '導入メリット', href: '#benefits' },
  { label: '無料で作成する', href: '#cta' },
];

const toolCards = ['Instagram告知', 'Googleフォーム', 'LINEグループ', 'スプレッドシート', 'PayPay確認', 'メモ帳'];

const features = [
  {
    label: '団体ページ',
    title: '団体ページを無料で作成',
    text: '団体紹介、活動写真、イベント予定、よくある質問、実績。初めて見た人にも雰囲気と信頼感が伝わります。',
    meta: ['写真', 'FAQ', '実績'],
  },
  {
    label: 'イベント募集',
    title: '毎回の告知を参加につながる導線へ',
    text: '募集人数、参加費、場所、持ち物をひとつの募集ページにまとめます。',
    meta: ['残り8名', '持ち物', '参加費'],
  },
  {
    label: 'ポータル掲載',
    title: 'COMIUポータルにも自動掲載',
    text: 'イベントや活動記事を登録すると、COMIU内でも見つけてもらえる機会を増やします。',
    meta: ['閲覧 +284', 'SEO', '新規流入'],
  },
  {
    label: '予約管理',
    title: 'フォームと名簿を行き来しない',
    text: '参加人数、定員、キャンセル、参加者名簿をまとめて管理できます。',
    meta: ['38 / 50', '名簿', 'キャンセル'],
  },
  {
    label: '公式LINE',
    title: '前日の連絡を自動で届ける',
    text: '予約確認や前日リマインドをLINEで送信。直前の問い合わせを減らします。',
    meta: ['送信済み', '会場案内', '確認'],
  },
  {
    label: '事前決済',
    title: '当日の集金を減らす',
    text: '申込みから支払いまでをスムーズに。受付や未払い確認の負担を軽くします。',
    meta: ['決済完了', '受付', '未払い確認'],
  },
  {
    label: '活動ブログ',
    title: '開催するほど信頼が残る',
    text: 'イベントレポートや活動写真を残して、初参加者に選ばれやすい団体へ育てます。',
    meta: ['活動レポ', 'レビュー', '実績'],
  },
];

const calendarEvents = [
  { date: '7/13', title: 'バドミントン', status: '残り8名', tone: 'bg-lime-100 text-lime-800' },
  { date: '7/17', title: '新歓交流会', status: '予約受付中', tone: 'bg-sky-100 text-sky-800' },
  { date: '7/19', title: 'BBQ', status: '女性枠あと3名', tone: 'bg-pink-100 text-pink-800' },
  { date: '7/24', title: 'フットサル', status: '満員', tone: 'bg-slate-200 text-slate-600' },
];

const timelineItems = [
  '4月 新歓交流会',
  '5月 バドミントン',
  '6月 スポーツ交流会',
  '7月 BBQ',
  '活動ブログ更新',
  '参加者レビュー',
  '累計参加者数 186名',
];

const lineMessages = [
  'ご予約ありがとうございます',
  '7/17 新歓交流会の詳細です',
  '会場：池袋駅東口 徒歩5分',
  '集合時間：18:45',
  '明日はお気をつけてお越しください',
  '参加できなくなった場合は、こちらからキャンセルできます',
];

const benefits = ['案内漏れを減らす', '前日の参加確認を自動化', '当日の問い合わせを減らす', '無断キャンセル対策につながる'];

const futureSteps = [
  {
    title: '見つけてもらえる',
    text: '団体ページとポータル掲載で、新しい参加者に届く。',
  },
  {
    title: '参加しやすくなる',
    text: 'イベント情報、残り枠、予約、決済、LINE案内がつながる。',
  },
  {
    title: '団体が積み上がる',
    text: '活動実績と参加者とのつながりが残り、次の集客につながる。',
  },
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

function BrandLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <Image src="/icon.png" alt="COMIU" width={30} height={30} className="rounded-full shadow-sm" />
      <span className="text-lg font-black text-slate-950">
        <span className="text-emerald-600">COM</span>
        <span className="text-pink-500">IU</span>
      </span>
    </div>
  );
}

function Header() {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label="COMIUトップへ">
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="メインナビゲーション">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-bold text-slate-600 transition hover:text-slate-950">
              {item.label}
            </a>
          ))}
        </nav>

        <details className="group relative md:hidden">
          <summary className="flex h-11 w-11 list-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 shadow-sm">
            <span className="sr-only">メニューを開く</span>
            <span className="h-0.5 w-5 rounded-full bg-slate-950 shadow-[0_6px_0_#020617,0_-6px_0_#020617]" />
          </summary>
          <div className="absolute right-0 mt-3 w-56 rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="block rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 active:scale-[0.98]">
                {item.label}
              </a>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}

function HeroDashboardMock() {
  return (
    <div data-cursor="EXPLORE" data-tilt-stage className="relative mx-auto w-full max-w-[390px] lg:max-w-[460px]">
      <div className="absolute -left-3 top-10 hidden rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-xs font-black text-emerald-700 shadow-xl sm:block">
        新規予約 +12
      </div>
      <div className="absolute -right-2 top-24 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-xs font-black text-sky-700 shadow-xl">
        LINE通知 送信済み
      </div>
      <div className="absolute -bottom-4 left-6 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-xs font-black text-pink-700 shadow-xl">
        ページ閲覧数 +284
      </div>
      <div className="absolute -bottom-3 right-7 hidden rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-xs font-black text-lime-700 shadow-xl sm:block">
        残り枠 8名
      </div>

      <div className="lp-tilt-card rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-[0_28px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400">COMIU Dashboard</p>
            <h2 className="text-xl font-black text-slate-950">次回イベント</h2>
          </div>
          <span className="rounded-full bg-lime-200 px-3 py-1 text-xs font-black text-lime-900">決済完了</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <p className="text-xs text-slate-300">参加人数</p>
            <p className="mt-3 text-3xl font-black">38 / 50</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-sky-100 to-violet-100 p-4">
            <p className="text-xs font-bold text-slate-500">新規予約</p>
            <p className="mt-3 text-3xl font-black text-slate-950">12件</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">今月のページ閲覧数</p>
            <div className="mt-4 h-2 rounded-full bg-slate-100">
              <div className="h-2 w-4/5 rounded-full bg-emerald-400" />
            </div>
            <p className="mt-2 text-sm font-black text-slate-950">1,284 PV</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-700">LINEリマインド</p>
            <p className="mt-3 text-sm font-black text-slate-950">送信済み</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-400">イベント一覧</p>
              <p className="mt-1 text-sm font-black text-slate-950">7/17 新歓交流会</p>
            </div>
            <a href="#calendar" className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
              予約管理
            </a>
          </div>
          <div className="mt-4 flex -space-x-2">
            {['A', 'M', 'R', 'K', '+'].map((name) => (
              <span key={name} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-emerald-200 to-sky-200 text-xs font-black text-slate-800">
                {name}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500">参加者名簿を自動作成</p>
        </div>
      </div>
    </div>
  );
}

function ToolChaos() {
  return (
    <div className="ops-system fade-in grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
      <div className="relative min-h-[300px] rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-5 text-sm font-black text-slate-500">いまの運営</p>
        <div className="grid grid-cols-2 gap-3">
          {toolCards.map((tool, index) => (
            <div key={tool} className={`ops-card ops-card-${index} rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black text-slate-700`}>
              {tool}
            </div>
          ))}
        </div>
      </div>

      <div className="relative rounded-[28px] bg-slate-950 p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-300">COMIU</p>
            <h3 className="text-2xl font-black">ひとつの流れへ</h3>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">LIVE</span>
        </div>
        <div className="grid gap-3">
          {['募集ページ公開', '予約一覧', 'LINE通知', '参加者名簿'].map((item, index) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-sm font-black text-slate-950">{index + 1}</span>
              <span className="text-sm font-bold">{item}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm font-black text-emerald-200">バラバラだった運営を、ひとつの流れへ。</p>
      </div>
    </div>
  );
}

function FeatureMock({ index }: { index: number }) {
  const isDark = index % 3 === 0;
  return (
    <div className={`mt-6 rounded-2xl p-4 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`} aria-hidden="true">
      <div className={`mb-3 h-24 rounded-xl ${isDark ? 'bg-gradient-to-br from-sky-400 to-emerald-300' : 'bg-gradient-to-br from-violet-100 to-lime-100'}`} />
      <div className={`h-3 w-4/5 rounded-full ${isDark ? 'bg-white/80' : 'bg-slate-900'}`} />
      <div className={`mt-2 h-2 w-2/3 rounded-full ${isDark ? 'bg-white/30' : 'bg-slate-200'}`} />
      <div className="mt-4 flex gap-2">
        <span className="h-7 w-7 rounded-full bg-emerald-200" />
        <span className="h-7 w-7 rounded-full bg-sky-200" />
        <span className="h-7 w-7 rounded-full bg-pink-200" />
      </div>
    </div>
  );
}

function FeatureCard({ feature, index }: { feature: (typeof features)[number]; index: number }) {
  return (
    <article data-cursor="VIEW" className="min-w-[82vw] snap-start rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:min-w-[330px] lg:min-w-[360px]">
      <p className="text-xs font-black text-emerald-600">{feature.label}</p>
      <h3 className="mt-3 text-xl font-black leading-snug text-slate-950">{feature.title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{feature.text}</p>
      <FeatureMock index={index} />
      <div className="mt-4 flex flex-wrap gap-2">
        {feature.meta.map((meta) => (
          <span key={meta} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
            {meta}
          </span>
        ))}
      </div>
    </article>
  );
}

function CalendarShowcase() {
  return (
    <div data-cursor="EXPLORE" className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] lg:p-8">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-950">7月の予定</h3>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">LINEで前日通知</span>
      </div>
      <div className="grid gap-3">
        {calendarEvents.map((event) => (
          <div key={event.date} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div>
              <p className="text-sm font-black text-slate-950">{event.date} {event.title}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">詳細を見て、そのまま予約できます</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${event.tone}`}>{event.status}</span>
          </div>
        ))}
      </div>
      <Link href="/register" data-cursor="CREATE" className="mt-5 flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">
        予約する
      </Link>
    </div>
  );
}

function LineMock() {
  return (
    <div data-cursor="EXPLORE" className="mx-auto max-w-[340px] rounded-[34px] border-[10px] border-slate-950 bg-[#e8f2ff] p-4 shadow-2xl">
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
        <Image src="/icon.png" alt="COMIU公式LINE" width={30} height={30} className="rounded-full" />
        <div>
          <p className="text-sm font-black text-slate-950">COMIU公式LINE</p>
          <p className="text-xs font-bold text-emerald-600">自動リマインド</p>
        </div>
      </div>
      <div className="space-y-2">
        {lineMessages.map((message) => (
          <div key={message} className="line-bubble fade-in max-w-[86%] rounded-2xl bg-white px-4 py-3 text-sm font-bold leading-6 text-slate-700 shadow-sm">
            {message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrganizersPage() {
  return (
    <div className="organizer-lp overflow-x-hidden bg-[var(--lp-bg)] pb-20 font-sans text-slate-950 antialiased md:pb-0">
      <CosmicCursor />
      <ScrollReveal />
      <BottomCTA />
      <Header />

      <main>
        <section className="relative overflow-hidden px-5 pb-16 pt-28 sm:pt-32 lg:min-h-screen lg:px-6 lg:pb-24">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_52%_0%,rgba(99,102,241,0.15),transparent_26rem),radial-gradient(circle_at_0%_22%,rgba(16,185,129,0.13),transparent_20rem),radial-gradient(circle_at_100%_30%,rgba(244,114,182,0.12),transparent_18rem)]" />
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.92fr] lg:items-center">
            <div className="fade-in">
              <p className="mb-5 inline-flex rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-black text-slate-700 shadow-sm">
                学生団体・サークル・イベント主催者向け
              </p>
              <h1 className="max-w-3xl text-[40px] font-black leading-[1.08] text-slate-950 sm:text-6xl lg:text-7xl">
                イベント・サークルの集客ならCOMIU
                <span className="mt-4 block bg-gradient-to-r from-emerald-500 via-sky-500 to-pink-500 bg-clip-text text-[0.74em] leading-[1.12] text-transparent">
                  団体に合わせたWebサイトを無料で作成
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-base font-bold leading-8 text-slate-700">
                掲載用のホームページなら、もういらない。<br className="hidden sm:block" />
                Webサイトを、育てるWebアプリケーションへ。
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-8 text-slate-600 sm:text-base">
                団体ページ、イベント募集、予約管理、活動ブログ、LINE連携。
                運営をまとめて、参加者が集まる仕組みをつくる。
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link data-cursor="CREATE" href="/register" className="flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-7 py-3.5 text-sm font-black text-white shadow-xl shadow-slate-900/10 transition active:scale-[0.98]">
                  無料で団体ページを作る
                </Link>
                <a href="#features" className="flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-black text-slate-800 shadow-sm transition active:scale-[0.98]">
                  COMIUでできることを見る
                </a>
              </div>
            </div>
            <div className="fade-in">
              <HeroDashboardMock />
            </div>
          </div>
        </section>

        <section id="benefits" className="px-5 py-16 lg:px-6 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="fade-in mb-10 max-w-3xl">
              <p className="mb-3 text-sm font-black text-pink-500">Before COMIU</p>
              <h2 className="text-3xl font-black leading-tight text-slate-950 lg:text-5xl">毎回、ゼロから運営していませんか？</h2>
              <p className="mt-5 text-sm leading-8 text-slate-600 sm:text-base">
                イベントを開催するたびに、Instagramで告知して、Googleフォームを作って、LINEで連絡して、スプレッドシートで名簿を確認する。
                それぞれは便利でも、運営が大きくなるほど、連絡漏れや確認作業が増えていく。
              </p>
            </div>
            <ToolChaos />
          </div>
        </section>

        <section className="relative overflow-hidden bg-slate-950 px-5 py-20 text-white lg:px-6 lg:py-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_30%,rgba(132,204,22,0.18),transparent_20rem),radial-gradient(circle_at_80%_50%,rgba(96,165,250,0.18),transparent_22rem)]" />
          <div className="fade-in relative mx-auto max-w-5xl">
            <p className="mb-4 text-sm font-black text-lime-300">Growing Community</p>
            <h2 className="text-4xl font-black leading-tight lg:text-7xl">運営が楽になって、団体が大きくなる。</h2>
            <div className="mt-8 grid gap-4 text-base font-bold leading-8 text-slate-200 md:grid-cols-2">
              <p>COMIUは、ただ予約を受け付けるだけのサービスではありません。</p>
              <p>
                活動の魅力を見せる。イベントを見つけてもらう。参加しやすくする。連絡を自動化する。
                開催するほど、団体の実績が残る。
              </p>
            </div>
            <p className="mt-8 rounded-[28px] border border-white/10 bg-white/10 p-6 text-xl font-black leading-9 text-white">
              イベントを繰り返すたびに、次の参加者に選ばれやすい団体へ。
            </p>
          </div>
        </section>

        <section id="features" className="px-5 py-16 lg:px-6 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="fade-in mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-3 text-sm font-black text-emerald-600">What COMIU Does</p>
                <h2 className="text-3xl font-black leading-tight text-slate-950 lg:text-5xl">COMIUにできること</h2>
                <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-600 sm:text-base">
                  募集する。つながる。積み上がる。団体運営に必要な仕組みを、ひとつに。
                </p>
              </div>
              <p className="text-xs font-bold text-slate-400">横にスワイプできます</p>
            </div>
            <div data-cursor="DRAG" className="scrollbar-none flex snap-x gap-4 overflow-x-auto pb-5">
              {features.map((feature, index) => (
                <FeatureCard key={feature.label} feature={feature} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section id="calendar" className="bg-white px-5 py-16 lg:px-6 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="fade-in">
              <p className="mb-3 text-sm font-black text-sky-600">Reservation Experience</p>
              <h2 className="text-3xl font-black leading-tight text-slate-950 lg:text-5xl">次のイベントを、迷わず見つけられる。</h2>
              <p className="mt-5 text-sm leading-8 text-slate-600 sm:text-base">
                「次はいつある？」をなくす。活動予定、残り枠、予約状況を、参加者にわかりやすく届ける。
              </p>
              <div className="mt-6 grid gap-3 text-sm font-bold text-slate-600">
                <p className="rounded-2xl bg-slate-50 p-4">参加者がイベントを見つけやすい</p>
                <p className="rounded-2xl bg-slate-50 p-4">予約まで迷わない</p>
                <p className="rounded-2xl bg-slate-50 p-4">問い合わせが減る</p>
              </div>
            </div>
            <div className="fade-in">
              <CalendarShowcase />
            </div>
          </div>
        </section>

        <section className="px-5 py-16 lg:px-6 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="fade-in mb-10 max-w-3xl">
              <p className="mb-3 text-sm font-black text-violet-600">Trust Timeline</p>
              <h2 className="text-3xl font-black leading-tight text-slate-950 lg:text-5xl">開催するたび、団体の信頼が残る。</h2>
              <p className="mt-5 text-sm leading-8 text-slate-600 sm:text-base">
                SNS投稿は流れていく。でも、活動レポート、イベント実績、参加者の声は、団体ページに残り続ける。
              </p>
            </div>
            <div className="timeline-grid fade-in">
              {timelineItems.map((item, index) => (
                <div key={item} className="timeline-card rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm" style={{ transitionDelay: `${index * 70}ms` }}>
                  <p className="font-mono text-xs font-black text-slate-400">0{index + 1}</p>
                  <p className="mt-3 text-lg font-black text-slate-950">{item}</p>
                </div>
              ))}
            </div>
            <p className="fade-in mt-8 rounded-[28px] bg-gradient-to-r from-emerald-50 via-sky-50 to-violet-50 p-6 text-xl font-black leading-9 text-slate-950">
              活動の記録が、団体の信頼になり、次の参加者へつながる。
            </p>
          </div>
        </section>

        <section className="bg-slate-950 px-5 py-16 text-white lg:px-6 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="fade-in">
              <p className="mb-3 text-sm font-black text-emerald-300">LINE Reminder</p>
              <h2 className="text-3xl font-black leading-tight lg:text-5xl">連絡を頑張る運営から、参加しやすい仕組みをつくる運営へ。</h2>
              <div className="mt-7 grid gap-3">
                {benefits.map((benefit) => (
                  <p key={benefit} className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm font-bold text-slate-100">
                    {benefit}
                  </p>
                ))}
              </div>
            </div>
            <LineMock />
          </div>
        </section>

        <section className="px-5 py-16 lg:px-6 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="fade-in mb-10 text-center">
              <p className="mb-3 text-sm font-black text-emerald-600">After COMIU</p>
              <h2 className="text-3xl font-black leading-tight text-slate-950 lg:text-5xl">イベントを開くたび、次が楽になる。</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {futureSteps.map((step, index) => (
                <article key={step.title} className="fade-in rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-black text-sky-500">STEP {index + 1}</p>
                  <h3 className="mt-4 text-2xl font-black text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.text}</p>
                </article>
              ))}
            </div>
            <p className="fade-in mx-auto mt-10 max-w-3xl text-center text-xl font-black leading-9 text-slate-950">
              COMIUは、イベントを一回成功させるためのツールではない。団体を、続いていくコミュニティへ育てるための仕組み。
            </p>
          </div>
        </section>

        <section id="cta" className="relative overflow-hidden px-5 py-20 text-center lg:px-6 lg:py-28">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.18),transparent_24rem),radial-gradient(circle_at_72%_72%,rgba(244,114,182,0.14),transparent_20rem),linear-gradient(180deg,#ffffff,#eef8ff)]" />
          <div className="fade-in mx-auto max-w-3xl">
            <Image src="/icon.png" alt="COMIU" width={44} height={44} className="mx-auto mb-5 rounded-full shadow-sm" />
            <h2 className="text-3xl font-black leading-tight text-slate-950 lg:text-5xl">あなたの団体を、次の参加者に選ばれる場所へ。</h2>
            <p className="mt-5 text-sm leading-8 text-slate-600 sm:text-base">
              団体ページ、イベント募集、予約管理、LINE連携。まずは無料で、あなたの団体に合ったページを作成しましょう。
            </p>
            <Link data-cursor="CREATE" href="/register" className="mx-auto mt-8 flex min-h-11 max-w-sm items-center justify-center rounded-full bg-slate-950 px-8 py-4 text-sm font-black text-white shadow-xl shadow-slate-900/10 transition active:scale-[0.98]">
              無料で団体ページを作る
            </Link>
            <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-black text-slate-500">
              <span className="rounded-full bg-white px-3 py-2 shadow-sm">登録無料</span>
              <span className="rounded-full bg-white px-3 py-2 shadow-sm">初期費用なし</span>
              <span className="rounded-full bg-white px-3 py-2 shadow-sm">専門知識不要</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white py-10 text-center text-[11px] font-bold text-slate-400">
        <p>&copy; 2026 COMIU. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
