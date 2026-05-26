import type { Metadata } from 'next'
import Link from 'next/link';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://comiu.jp';

export const metadata: Metadata = {
  title: '料金プラン',
  description:
    'COMIUの料金プラン一覧。フリープランは永久無料、スタンダードは月額¥2,980から。バドミントンサークル・交流会・勉強会など東京20代向けコミュニティのイベント管理に。',
  alternates: {
    canonical: `${SITE_URL}/pricing`,
  },
  openGraph: {
    title: '料金プラン | COMIU',
    description: 'フリープランは永久無料。スタンダードは月額¥2,980から。イベント管理・LINE通知・予約管理が全部込み。',
    url: `${SITE_URL}/pricing`,
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '料金プラン | COMIU',
    description: 'フリープランは永久無料。スタンダードは月額¥2,980から。イベント管理・LINE通知・予約管理が全部込み。',
    images: [`${SITE_URL}/opengraph-image`],
  },
}

const FAQ_ITEMS = [
  { q: 'フリープランでもLINE連携は使えますか？', a: 'はい、フリープランでもLINEウェブフックとLIFF（参加者向けアプリ画面）はご利用いただけます。リマインド通知はスタンダード以上のプランでご利用可能です。' },
  { q: 'プランはいつでも変更できますか？', a: 'はい、いつでも変更可能です。アップグレードは即時反映されます。ダウングレードは次回請求サイクルから適用されます。' },
  { q: '支払い方法は何が使えますか？', a: 'クレジットカード（Visa / Mastercard / JCB）がご利用いただけます。Stripeを通じた安全な決済です。' },
  { q: 'フリープランの上限に達したらどうなりますか？', a: '当月のイベント作成（2件）またはメンバー数（50人）が上限に達した場合、新規のイベント作成・メンバー追加ができなくなります。既存のイベントは引き続き管理できます。' },
];

const PLANS = [
  {
    key: 'free',
    name: 'フリー',
    price: 0,
    priceLabel: '¥0',
    period: '永久無料',
    color: 'border-gray-200',
    badge: null,
    cta: '無料で始める',
    ctaHref: '/register',
    ctaStyle: 'border border-[#06C755] text-[#06C755] hover:bg-green-50',
    features: [
      { label: 'イベント作成', value: '2件 / 月' },
      { label: 'メンバー上限', value: '50人' },
      { label: '予約管理', value: '✅' },
      { label: 'LINEウェブフック', value: '✅' },
      { label: 'LIFF（参加者画面）', value: '✅' },
      { label: 'リマインド通知', value: '✗', dim: true },
      { label: 'Stripe決済連携', value: '✗', dim: true },
      { label: 'CSVエクスポート', value: '✗', dim: true },
      { label: '複数管理者', value: '✗', dim: true },
    ],
  },
  {
    key: 'standard',
    name: 'スタンダード',
    price: 2980,
    priceLabel: '¥2,980',
    period: '/ 月',
    color: 'border-[#06C755] ring-2 ring-[#06C755]/20',
    badge: 'おすすめ',
    cta: 'スタンダードで始める',
    ctaHref: '/register?plan=standard',
    ctaStyle: 'bg-[#06C755] text-white hover:bg-[#05a847]',
    features: [
      { label: 'イベント作成', value: '無制限' },
      { label: 'メンバー上限', value: '300人' },
      { label: '予約管理', value: '✅' },
      { label: 'LINEウェブフック', value: '✅' },
      { label: 'LIFF（参加者画面）', value: '✅' },
      { label: 'リマインド通知', value: '✅' },
      { label: 'Stripe決済連携', value: '✅' },
      { label: 'CSVエクスポート', value: '✅' },
      { label: '複数管理者', value: '✗', dim: true },
    ],
  },
  {
    key: 'pro',
    name: 'プロ',
    price: 6980,
    priceLabel: '¥6,980',
    period: '/ 月',
    color: 'border-gray-800',
    badge: '大規模向け',
    cta: 'プロで始める',
    ctaHref: '/register?plan=pro',
    ctaStyle: 'bg-gray-900 text-white hover:bg-gray-700',
    features: [
      { label: 'イベント作成', value: '無制限' },
      { label: 'メンバー上限', value: '無制限' },
      { label: '予約管理', value: '✅' },
      { label: 'LINEウェブフック', value: '✅' },
      { label: 'LIFF（参加者画面）', value: '✅' },
      { label: 'リマインド通知', value: '✅' },
      { label: 'Stripe決済連携', value: '✅' },
      { label: 'CSVエクスポート', value: '✅' },
      { label: '複数管理者', value: '3名まで' },
    ],
  },
];

export default function PricingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'COMIU',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: 'コミュニティのイベント管理・参加者募集をLINEで完結するSaaS',
        offers: [
          { '@type': 'Offer', name: 'フリー', price: '0', priceCurrency: 'JPY' },
          { '@type': 'Offer', name: 'スタンダード', price: '2980', priceCurrency: 'JPY' },
          { '@type': 'Offer', name: 'プロ', price: '6980', priceCurrency: 'JPY' },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#06C755] rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-bold text-gray-900">COMIU</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">ログイン</Link>
          <Link href="/register" className="bg-[#06C755] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#05a847] transition-colors">
            無料で始める
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* タイトル */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            シンプルな料金プラン
          </h1>
          <p className="text-gray-500 text-base md:text-lg">
            無料から始めて、成長に合わせてアップグレード
          </p>
        </div>

        {/* プランカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`bg-white rounded-2xl border-2 p-6 flex flex-col relative ${plan.color}`}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white ${plan.key === 'standard' ? 'bg-[#06C755]' : 'bg-gray-800'}`}>
                  {plan.badge}
                </div>
              )}

              <div className="mb-5">
                <p className="text-sm font-medium text-gray-500 mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">{plan.priceLabel}</span>
                  <span className="text-sm text-gray-400">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-center justify-between text-sm">
                    <span className={f.dim ? 'text-gray-300' : 'text-gray-600'}>{f.label}</span>
                    <span className={`font-medium ${f.dim ? 'text-gray-300' : f.value === '✅' ? 'text-[#06C755]' : f.value === '✗' ? 'text-gray-300' : 'text-gray-900'}`}>
                      {f.value}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`block text-center py-3 rounded-xl text-sm font-bold transition-colors ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">よくある質問</h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q} className="bg-white rounded-xl p-5 border border-gray-200">
                <p className="font-semibold text-gray-900 text-sm mb-2">{item.q}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* フッターCTA */}
        <div className="text-center mt-16">
          <p className="text-gray-500 text-sm mb-4">まずは無料でお試しください。クレジットカード不要。</p>
          <Link
            href="/register"
            className="inline-block bg-[#06C755] text-white font-bold px-8 py-4 rounded-2xl text-base hover:bg-[#05a847] transition-colors"
          >
            無料で始める →
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
