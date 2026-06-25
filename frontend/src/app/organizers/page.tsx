import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { API_URL, SITE_URL } from '@/lib/config';

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

const heroImageUrl =
  'https://pc2eyeqk22ch6su6.public.blob.vercel-storage.com/events/1779183518172.jpg';

const strengths = [
  {
    label: '無料WEBサイト',
    title: '団体やサークルのWEBサイトを無料で作成',
    text: '団体紹介、写真、活動ブログ、予約導線、お問い合わせまで、募集に必要なページをすぐ公開できます。',
  },
  {
    label: 'SEOポータル',
    title: '公開したイベントや活動をポータルへ反映',
    text: 'COMIU内のカテゴリページや検索向け記事から、団体ページとイベントへ流入を作れます。',
  },
  {
    label: 'LINE API',
    title: '参加者へ事前リマインドを自動送信',
    text: '公式LINE API連携で、開催前の連絡や問い合わせ対応をLINE中心で進められます。',
  },
  {
    label: '予約カレンダー',
    title: '3種の表示から選んでボタンひとつで予約',
    text: '日程カレンダー、カード、スレッドから活動に合う見せ方を選び、そのまま参加予約へつなげます。',
  },
];

const painPoints = [
  'Instagramだけだと、詳しい案内や予約導線が埋もれる',
  'Googleフォーム、DM、LINEが分かれて参加者管理が面倒',
  '新歓や体験会のたびに、同じ案内とリマインドを手作業で送っている',
  '検索で見つかる団体ページがなく、毎回SNS投稿に頼りきりになる',
];

const calendarTypes = [
  {
    name: '日程カレンダー',
    text: '月ごとの予定を見せたいサークルに。',
    detail: '定期練習、毎週イベント、新歓スケジュール',
  },
  {
    name: 'カード',
    text: '写真と内容で参加意欲を上げたい募集に。',
    detail: 'スポーツイベント、交流会、体験参加',
  },
  {
    name: 'スレッド',
    text: '画像なしでも予定を並べたい団体に。',
    detail: '説明会、勉強会、少人数イベント',
  },
];

const flow = [
  '団体登録',
  'WEBサイト公開',
  'イベント作成',
  'ポータル掲載',
  'LINEで予約・リマインド',
];

async function fetchArticles(): Promise<OfficialArticle[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/official-articles?limit=6`, { next: { revalidate } });
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
    <main className="min-h-screen bg-[#F6F8F7] text-gray-950">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/20 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Image src="/icon.png" alt="" width={32} height={32} className="rounded-lg" />
            COMIU
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-sm font-bold text-gray-600">
            <Link href="/guide" className="hover:text-gray-950">記事</Link>
            <Link href="/pricing" className="hover:text-gray-950">料金</Link>
            <Link href="/login" className="hidden hover:text-gray-950 sm:inline">ログイン</Link>
            <Link href="/register" className="rounded-full bg-[#06C755] px-4 py-2 text-white shadow-sm hover:bg-[#05a847]">
              無料作成
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative min-h-[88vh] overflow-hidden bg-gray-950 pt-16 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/65 via-gray-950/42 to-gray-950/88" />
        <div className="relative mx-auto flex min-h-[calc(88vh-4rem)] max-w-6xl flex-col justify-end px-5 pb-10 pt-20">
          <p className="text-sm font-bold text-[#83F3A4]">団体・サークル運営者向け</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">
            団体やサークルのWEBサイトを無料で作成。
            <span className="block">募集から予約までCOMIUで。</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
            SEOに強い公開ページ、リアルタイムのポータル掲載、選べる予約カレンダー、公式LINE APIのリマインドまで。代表者の募集と運営をひとつにまとめます。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-lg bg-[#06C755] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#06C755]/20 hover:bg-[#05a847]">
              無料でWEBサイトを作る
            </Link>
            <Link href="/clubs/18285255/gakuori" className="rounded-lg border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/20">
              公開サイトを見る
            </Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {['WEBサイト無料', 'ポータル掲載', 'LINE予約管理'].map((item) => (
              <div key={item} className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-10 md:grid-cols-4">
          {strengths.map((item) => (
            <article key={item.label} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-[#06C755]">{item.label}</p>
              <h2 className="mt-3 text-lg font-bold leading-7">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-sm font-bold text-[#06C755]">代表者のよくある悩み</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight">
            集客も予約も連絡も、毎回バラバラになりがち。
          </h2>
          <p className="mt-4 leading-8 text-gray-600">
            COMIUは、SNSで興味を持った人を公開WEBサイトへ誘導し、イベント予約、参加者名簿、LINE連絡までつなげます。
          </p>
        </div>
        <div className="grid gap-3">
          {painPoints.map((point) => (
            <div key={point} className="rounded-lg border border-gray-200 bg-white px-5 py-4 text-sm font-bold leading-7 text-gray-700 shadow-sm">
              {point}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#10251A] text-white">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <p className="text-sm font-bold text-[#83F3A4]">COMIUの導線</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight">
            WEBサイトを作るだけで終わらせない。公開後の集客と予約までつなげます。
          </h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <ProductPanel
              title="公開WEBサイト"
              subtitle="団体紹介、写真、活動ブログ、問い合わせ"
              accent="bg-[#06C755]"
            />
            <ProductPanel
              title="ポータルサイト"
              subtitle="カテゴリ、記事、イベント一覧へ自動反映"
              accent="bg-[#F7C948]"
            />
            <ProductPanel
              title="予約管理"
              subtitle="カレンダーから予約、名簿、リマインドへ"
              accent="bg-[#7DD3FC]"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold text-[#06C755]">選べる予約カレンダー</p>
            <h2 className="mt-3 text-3xl font-bold">団体の活動に合わせて、予約画面を選べる。</h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-gray-600">
            参加者は気になる日程を選び、ボタンひとつで予約。主催者はそのまま名簿と連絡に進めます。
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {calendarTypes.map((type) => (
            <article key={type.name} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <CalendarPreview name={type.name} />
              <h3 className="mt-5 text-lg font-bold">{type.name}</h3>
              <p className="mt-2 text-sm leading-7 text-gray-600">{type.text}</p>
              <p className="mt-3 text-xs font-bold text-gray-400">{type.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-bold text-[#06C755]">公式LINE API</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight">
              予約後の連絡も、事前リマインドもLINEで。
            </h2>
            <p className="mt-4 leading-8 text-gray-600">
              参加者は普段使うLINEで予約内容を確認。主催者は問い合わせ対応や開催前の連絡をまとめて扱えます。
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-[#F6F8F7] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Image src="/icon.png" alt="" width={42} height={42} className="rounded-xl" />
              <div>
                <p className="text-sm font-bold">COMIU リマインド</p>
                <p className="text-xs text-gray-500">イベント前日に自動送信</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-7 shadow-sm">
                明日のイベントは20:00開始です。会場と持ち物を確認してください。
              </div>
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-[#06C755] px-4 py-3 text-sm font-bold leading-7 text-white shadow-sm">
                予約内容を確認する
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-7 shadow-sm">
                質問がある場合は、この画面から主催者へ連絡できます。
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <p className="text-sm font-bold text-[#06C755]">はじめ方</p>
        <h2 className="mt-3 text-3xl font-bold">まずは1つ、公開してみる。</h2>
        <div className="mt-8 grid gap-3 md:grid-cols-5">
          {flow.map((step, index) => (
            <div key={step} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-[#06C755]">STEP {index + 1}</p>
              <p className="mt-3 text-sm font-bold leading-6">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-[#06C755]">SEO記事</p>
              <h2 className="mt-2 text-2xl font-bold">検索から団体に届く入口を増やす。</h2>
            </div>
            <Link href="/guide" className="w-fit rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              記事を見る
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {articles.length === 0 ? (
              <p className="rounded-lg bg-gray-50 px-4 py-8 text-sm text-gray-400 md:col-span-3">
                公開した記事がここに表示されます。
              </p>
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

      <section className="bg-gray-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-[#83F3A4]">無料ではじめられます</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight">
              団体のWEBサイトを作って、次のイベント予約までつなげよう。
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="rounded-lg bg-[#06C755] px-5 py-3 text-sm font-bold text-white hover:bg-[#05a847]">
              無料でWEBサイトを作る
            </Link>
            <Link href="/contact" className="rounded-lg border border-white/25 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">
              相談する
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProductPanel({
  title,
  subtitle,
  accent,
}: {
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/10 p-5 shadow-sm">
      <div className={`h-2 w-16 rounded-full ${accent}`} />
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-white/70">{subtitle}</p>
      <div className="mt-5 space-y-3">
        <div className="h-3 w-4/5 rounded-full bg-white/80" />
        <div className="h-3 w-3/5 rounded-full bg-white/35" />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="rounded-md border border-white/20 px-3 py-2 text-center text-xs font-bold">詳細</div>
          <div className="rounded-md border border-white/20 px-3 py-2 text-center text-xs font-bold">予約</div>
        </div>
      </div>
    </article>
  );
}

function CalendarPreview({ name }: { name: string }) {
  if (name === '日程カレンダー') {
    return (
      <div className="rounded-lg bg-[#F1F5F9] p-3">
        <div className="mb-3 flex items-center justify-between text-xs font-bold text-gray-500">
          <span>7月</span>
          <span className="h-2 w-10 rounded-full bg-[#06C755]" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 14 }).map((_, index) => (
            <span key={index} className={`flex aspect-square items-center justify-center rounded-md text-xs font-bold ${index === 6 || index === 11 ? 'bg-[#06C755] text-white' : 'bg-white text-gray-400'}`}>
              {index + 1}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (name === 'カード') {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="h-20 bg-[linear-gradient(120deg,#0F172A,#16A34A)]" />
        <div className="space-y-2 p-3">
          <div className="h-3 w-4/5 rounded-full bg-gray-900" />
          <div className="h-2 w-3/5 rounded-full bg-gray-200" />
          <div className="flex gap-2 pt-1">
            <span className="h-5 w-5 rounded-full bg-green-100" />
            <span className="h-5 w-5 rounded-full bg-blue-100" />
            <span className="h-5 w-5 rounded-full bg-pink-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg bg-[#F1F5F9] p-3">
      {[17, 24, 31].map((day, index) => (
        <div key={day} className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
          <p className="text-sm font-bold text-gray-900">7/{day}</p>
          <div className="min-w-0 flex-1">
            <div className="h-2 w-4/5 rounded-full bg-gray-300" />
            <div className="mt-2 h-2 w-2/5 rounded-full bg-gray-200" />
          </div>
          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${index === 2 ? 'bg-gray-200 text-gray-500' : 'bg-[#06C755] text-white'}`}>
            {index === 2 ? '満席' : '受付中'}
          </span>
        </div>
      ))}
    </div>
  );
}
