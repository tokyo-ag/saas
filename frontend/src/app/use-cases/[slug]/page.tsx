import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import PublicFooter from '@/components/public/PublicFooter';
import { USE_CASES } from '@/lib/useCasesData';
import { SITE_URL } from '@/lib/config';

export function generateStaticParams() {
  return Object.keys(USE_CASES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = USE_CASES[slug];
  if (!data) return {};
  return {
    title: data.title,
    description: data.metaDescription,
    alternates: { canonical: `${SITE_URL}/use-cases/${slug}` },
    openGraph: {
      title: `${data.title} | COMIU`,
      description: data.ogDescription,
      locale: 'ja_JP',
      type: 'website',
      url: `${SITE_URL}/use-cases/${slug}`,
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${data.title} | COMIU`,
      description: data.ogDescription,
      images: [`${SITE_URL}/opengraph-image`],
    },
  };
}

const STEPS = [
  {
    step: '01',
    title: 'イベントを探す',
    body: '種目、日程、場所、参加費を見ながら、参加しやすいイベントを選びます。',
  },
  {
    step: '02',
    title: 'LINEで申し込む',
    body: 'イベント詳細からLINE予約画面へ進み、必要事項を入力して申し込みます。',
  },
  {
    step: '03',
    title: 'リマインドを受け取る',
    body: '開催前にLINEで確認できるので、予定を忘れにくくなります。',
  },
];

const ADMIN_FEATURES = [
  {
    title: '募集ページを公開',
    body: 'イベント情報を登録すると、公開ページとして検索・共有しやすくなります。',
  },
  {
    title: '予約を一元管理',
    body: '参加者、キャンセル待ち、支払い状況を管理画面で確認できます。',
  },
  {
    title: 'LINEで連絡',
    body: '参加者へのリマインドや連絡をLINE中心の導線にできます。',
  },
];

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = USE_CASES[slug];
  if (!data) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'COMIU',
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
        description: data.jsonLdDescription,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'JPY',
          description: 'フリープランは無料',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
          {
            '@type': 'ListItem',
            position: 2,
            name: '活用事例',
            item: `${SITE_URL}/use-cases`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: data.breadcrumbName,
            item: `${SITE_URL}/use-cases/${slug}`,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: data.faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <div className="min-h-screen bg-white">
        <header className="border-b border-gray-100 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="font-bold text-gray-900">
              COMIU
            </Link>
            <Link
              href="/register"
              className="bg-[#06C755] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#05a847] transition-colors"
            >
              無料で始める
            </Link>
          </div>
        </header>

        <section className="bg-gradient-to-br from-[#06C755] to-[#047a35] text-white px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-white/70 text-sm font-bold mb-3">COMIU活用事例</p>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
              {data.title}向け
              <br />
              サークル探しとイベント予約をLINEで
            </h1>
            <p className="text-white/85 text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              {data.heroParagraph}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={data.eventsHref}
                className="w-full sm:w-auto bg-white text-[#06C755] font-bold px-8 py-4 rounded-2xl hover:bg-gray-50 transition-colors text-center"
              >
                イベントを探す
              </Link>
              <Link
                href="/register"
                className="w-full sm:w-auto border-2 border-white/50 text-white font-medium px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors text-center"
              >
                サークルを登録する
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-10">
              {data.targetTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.targetCards.map((item) => (
                <div
                  key={item.title}
                  className="bg-white rounded-2xl p-6 border border-gray-100"
                >
                  <p className="text-xs font-bold text-[#06C755] mb-3">
                    {item.icon}
                  </p>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-10">
              3ステップで参加予約
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STEPS.map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 bg-[#06C755] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-sm">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-4">
              {data.adminTitle}
            </h2>
            <p className="text-gray-500 text-sm text-center mb-10 max-w-2xl mx-auto leading-relaxed">
              COMIUを使えば、参加者募集、予約管理、リマインド連絡をLINE中心で整理できます。フリープランは無料で始められます。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {ADMIN_FEATURES.map((item) => (
                <div
                  key={item.title}
                  className="bg-white rounded-2xl p-5 border border-gray-100"
                >
                  <h3 className="font-bold text-gray-900 text-sm mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href="/pricing"
                className="inline-block text-[#06C755] text-sm font-medium hover:underline"
              >
                料金プランを見る
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-14">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-10">
              よくある質問
            </h2>
            <div className="space-y-4">
              {data.faqItems.map((item) => (
                <div
                  key={item.question}
                  className="border border-gray-200 rounded-2xl p-5"
                >
                  <p className="font-semibold text-gray-900 text-sm mb-2">
                    {item.question}
                  </p>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 bg-gradient-to-br from-[#06C755] to-[#047a35] text-white text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-3">{data.ctaTitle}</h2>
            <p className="text-white/80 text-sm mb-8 leading-relaxed">
              まずはイベント一覧から参加しやすい日程を探してみてください。主催者の方は無料でサークルを登録できます。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={data.eventsHref}
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
        <PublicFooter />
      </div>
    </>
  );
}
