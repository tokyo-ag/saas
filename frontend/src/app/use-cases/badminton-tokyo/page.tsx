import type { Metadata } from 'next'
import Link from 'next/link'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comiu.jp';

export const metadata: Metadata = {
  title: 'バドミントンサークル 東京 20代',
  description:
    '東京の20代向けバドミントンサークルを探すならCOMIU。池袋・豊島区を拠点に板橋・北区・文京区エリアで開催多数。初心者歓迎・社会人歓迎。LINEで簡単に参加申込・リマインド通知。無料で始められます。',
  alternates: {
    canonical: `${SITE_URL}/use-cases/badminton-tokyo`,
  },
  openGraph: {
    title: 'バドミントンサークル 東京 20代 | COMIU',
    description:
      '東京の20代向けバドミントンサークル。初心者歓迎・社会人歓迎。LINEで簡単参加申込。',
    locale: 'ja_JP',
    type: 'website',
    url: `${SITE_URL}/use-cases/badminton-tokyo`,
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'バドミントンサークル 東京 20代 | COMIU',
    description:
      '東京の20代向けバドミントンサークル。初心者歓迎・社会人歓迎。LINEで簡単参加申込。',
    images: [`${SITE_URL}/opengraph-image`],
  },
}

const FAQ_ITEMS = [
  {
    question: 'バドミントンサークルに初心者でも参加できますか？',
    answer:
      'はい、掲載されているサークルの多くは初心者歓迎です。各イベントの詳細ページで「初心者OK」「ラケット貸出あり」などの条件を確認できます。道具をお持ちでない方もまずは気軽にご参加ください。',
  },
  {
    question: '20代社会人でも参加しやすいですか？',
    answer:
      '東京の20代社会人向けサークルが多数登録されています。平日夜や週末開催のイベントが充実しており、仕事の後でも参加しやすい環境が整っています。同世代の参加者が多いので初めての方も馴染みやすいです。',
  },
  {
    question: '参加申込はどうやって行いますか？',
    answer:
      'LINEで友だち追加後、イベント一覧から参加したいイベントをタップして申込フォームに進むだけです。名前・学年・性別を入力するだけで完了します。クレジットカードも不要です。',
  },
  {
    question: '参加費はどのくらいかかりますか？',
    answer:
      '各サークル・イベントによって異なります。無料のサークルから、会場費・シャトル代込みで500〜1,000円程度のイベントまで様々です。イベント詳細ページに参加費が明記されているので事前に確認できます。',
  },
  {
    question: '東京のどのエリアで開催していますか？',
    answer:
      '池袋（豊島区）を拠点に、板橋区・北区・文京区・練馬区など池袋周辺エリアの体育館・スポーツ施設を中心に開催されています。池袋駅からアクセスしやすい会場が多いです。エリアはイベントによって異なりますので、詳細ページでご確認ください。',
  },
]

export default function BadmintonTokyoPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'COMIU',
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
        description:
          '池袋・豊島区を拠点とする東京20代向けバドミントンサークルのイベント管理・参加者募集プラットフォーム。LINEと連携して予約・リマインド通知が完結。',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'JPY',
          description: 'フリープランは永久無料',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${SITE_URL}` },
          { '@type': 'ListItem', position: 2, name: '活用事例', item: `${SITE_URL}/use-cases` },
          { '@type': 'ListItem', position: 3, name: 'バドミントンサークル 東京 20代', item: `${SITE_URL}/use-cases/badminton-tokyo` },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-white">
        {/* ヘッダー */}
        <header className="border-b border-gray-100 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#06C755] rounded-xl flex items-center justify-center">
                <span className="text-white text-sm font-bold">A</span>
              </div>
              <span className="font-bold text-gray-900">COMIU</span>
            </Link>
            <Link
              href="/register"
              className="bg-[#06C755] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#05a847] transition-colors"
            >
              無料で始める
            </Link>
          </div>
        </header>

        {/* ヒーロー */}
        <section className="bg-gradient-to-br from-[#06C755] to-[#047a35] text-white px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
              バドミントンサークル 東京 20代向け<br />
              イベント管理・参加予約をLINEで完結
            </h1>
            <p className="text-white/85 text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              池袋を拠点に豊島区・板橋区・北区・文京区エリアで、東京の20代向けバドミントンサークルが多数登録。
              初心者歓迎・社会人歓迎のイベントを、LINEからかんたんに申込・管理できます。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sports/badminton"
                className="w-full sm:w-auto bg-white text-[#06C755] font-bold px-8 py-4 rounded-2xl hover:bg-gray-50 transition-colors text-center"
              >
                イベントを探す
              </Link>
              <Link
                href="/register"
                className="w-full sm:w-auto border-2 border-white/50 text-white font-medium px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors text-center"
              >
                サークルを登録する（無料）
              </Link>
            </div>
          </div>
        </section>

        {/* ターゲット訴求 */}
        <section className="px-4 py-14 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-10">
              東京20代バドミントンプレイヤーの悩みを解決
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  icon: '👥',
                  title: '同世代と一緒にプレイしたい',
                  body: '20代の参加者が集まるサークルを絞り込んで探せます。同世代の仲間と気軽に楽しめる環境です。',
                },
                {
                  icon: '🏸',
                  title: '初心者でも参加できる？',
                  body: '「初心者歓迎」「ラケット貸出あり」など、未経験者でも参加しやすいサークルを多数掲載しています。',
                },
                {
                  icon: '📍',
                  title: 'アクセスの良い場所で開催',
                  body: '池袋駅を中心に、豊島区・板橋区・北区・文京区の体育館・スポーツ施設での開催が中心です。',
                },
                {
                  icon: '💰',
                  title: '参加費を抑えたい',
                  body: '無料から参加できるサークルも多数。参加費はイベント詳細ページで事前に確認できます。',
                },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-2xl p-6 border border-gray-100">
                  <p className="text-3xl mb-3">{item.icon}</p>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 参加の流れ */}
        <section className="px-4 py-14">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-10">
              3ステップで参加完了
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: '01',
                  title: 'LINEで友だち追加',
                  body: '参加したいサークルのLINE公式アカウントを友だち追加するだけ。スマホから数秒で完了します。',
                },
                {
                  step: '02',
                  title: 'イベントを選んで申込',
                  body: 'イベント一覧から興味のある日程をタップ。名前・学年・性別を入力してフォームを送信するだけです。',
                },
                {
                  step: '03',
                  title: 'LINEでリマインド通知',
                  body: '開催前日・当日にLINEで自動リマインドが届くので、うっかり忘れる心配がありません。',
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 bg-[#06C755] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-sm">{item.step}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* サークル主催者向け */}
        <section className="px-4 py-14 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-4">
              東京20代向けバドミントンサークルを主催している方へ
            </h2>
            <p className="text-gray-500 text-sm text-center mb-10 max-w-2xl mx-auto leading-relaxed">
              COMIUを使えば、参加者募集・予約管理・リマインド通知・出欠確認がすべてLINEで完結します。
              フリープランは月2イベントまで無料で始められます。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  title: 'LINEで参加者募集',
                  body: 'LINE公式アカウントと連携。フォロワーにイベント告知・予約受付が自動化されます。',
                },
                {
                  title: '予約・キャンセル待ち管理',
                  body: '定員管理・キャンセル待ちの自動繰り上げ・出欠確認まで、ダッシュボードで一元管理。',
                },
                {
                  title: 'リマインド自動送信',
                  body: '前日や当日朝に参加者全員へリマインドメッセージを自動送信。連絡忘れの手間がゼロに。',
                },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                    <div className="w-3 h-3 bg-[#06C755] rounded-full" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href="/pricing"
                className="inline-block text-[#06C755] text-sm font-medium hover:underline"
              >
                料金プランを見る →
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-14">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-10">
              よくある質問
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question} className="border border-gray-200 rounded-2xl p-5">
                  <p className="font-semibold text-gray-900 text-sm mb-2">{item.question}</p>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16 bg-gradient-to-br from-[#06C755] to-[#047a35] text-white text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-3">
              東京でバドミントン仲間を見つけよう
            </h2>
            <p className="text-white/80 text-sm mb-8 leading-relaxed">
              20代・初心者歓迎のサークルが多数。まずはイベントを探してみてください。
              主催者の方は無料でサークルを登録できます。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sports/badminton"
                className="w-full sm:w-auto bg-white text-[#06C755] font-bold px-8 py-4 rounded-2xl hover:bg-gray-50 transition-colors"
              >
                イベントを探す
              </Link>
              <Link
                href="/register"
                className="w-full sm:w-auto border-2 border-white/50 text-white font-medium px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors"
              >
                無料でサークルを登録
              </Link>
            </div>
          </div>
        </section>

        {/* フッター */}
        <footer className="px-4 py-8 border-t border-gray-100 text-center">
          <div className="flex items-center justify-center gap-4 mb-4 text-sm text-gray-400">
            <Link href="/sports/badminton" className="hover:text-gray-600">バドミントンイベント一覧</Link>
            <Link href="/pricing" className="hover:text-gray-600">料金プラン</Link>
            <Link href="/register" className="hover:text-gray-600">新規登録</Link>
            <Link href="/login" className="hover:text-gray-600">ログイン</Link>
          </div>
          <p className="text-[11px] text-gray-300">© COMIU</p>
        </footer>
      </div>
    </>
  )
}
