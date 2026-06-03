import type { Metadata } from 'next';
import Link from 'next/link';

import PublicFooter from '@/components/public/PublicFooter';
import { OFFICIAL_LINE_URL, SITE_URL, SUPPORT_EMAIL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'お問い合わせ',
  description:
    'COMIUへのお問い合わせページです。サービス利用、サークル登録、イベント掲載、LINE連携や予約に関するご相談はこちらからご連絡ください。',
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: 'お問い合わせ | COMIU',
    description:
      'COMIUへのお問い合わせ、サークル登録、イベント掲載、LINE連携や予約に関するご相談はこちらからご連絡ください。',
    url: `${SITE_URL}/contact`,
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'お問い合わせ | COMIU',
    description:
      'COMIUへのお問い合わせ、サークル登録、イベント掲載、LINE連携や予約に関するご相談はこちらからご連絡ください。',
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function ContactPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ContactPage',
        name: 'お問い合わせ',
        url: `${SITE_URL}/contact`,
        inLanguage: 'ja-JP',
        isPartOf: {
          '@type': 'WebSite',
          name: 'COMIU',
          url: SITE_URL,
        },
      },
      {
        '@type': 'Organization',
        name: 'COMIU',
        url: SITE_URL,
        sameAs: [OFFICIAL_LINE_URL],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: SUPPORT_EMAIL,
          url: OFFICIAL_LINE_URL,
          availableLanguage: ['ja'],
        },
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

      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-100 bg-white px-4 py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <Link href="/" className="font-bold text-gray-900">
              COMIU
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[#06C755] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#05a847]"
            >
              無料で始める
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-14">
          <div className="mb-10">
            <div className="mb-3 text-sm text-gray-400">
              <Link href="/" className="hover:text-gray-600">
                ホーム
              </Link>
              <span className="mx-2">/</span>
              <span>お問い合わせ</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
              お問い合わせ
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-600">
              COMIUの利用方法、サークル登録、イベント掲載、LINE連携や予約に関するご相談を受け付けています。返信は公式LINEがスムーズで早いです。登録済みの方はアプリ内のサポートチャットも利用できます。
            </p>
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold text-[#06C755]">MAIL SUPPORT</p>
            <h2 className="mt-2 text-xl font-bold text-gray-900">
              メールで問い合わせる
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              メールでも問い合わせできます。返信は公式LINEがスムーズで早いです。メールの場合は、サークル名、イベントURL、発生している画面がある場合は一緒に記載してください。
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-5 inline-flex rounded-xl bg-[#06C755] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#05a847]"
            >
              {SUPPORT_EMAIL}
            </a>
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">
                公式LINE
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                公式LINEからも問い合わせできます。返信は公式LINEがスムーズで早いです。スマホでの相談や、LINE連携まわりの確認に使いやすい窓口です。
              </p>
              <a
                href={OFFICIAL_LINE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex text-sm font-bold text-[#06C755] hover:underline"
              >
                公式LINEを開く
              </a>
            </section>
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">
                アプリ内サポートチャット
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                参加者・主催者としてログイン済みの場合は、トーク画面のサポートチャットから問い合わせできます。
              </p>
            </section>
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">
                主な問い合わせ内容
              </h2>
              <ul className="mt-2 space-y-2 text-sm text-gray-600">
                <li>サークル登録・プランについて</li>
                <li>イベント掲載・予約管理について</li>
                <li>LINEログイン・LIFF連携について</li>
                <li>不具合、表示内容、退会について</li>
              </ul>
            </section>
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
