import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

import { SITE_URL } from '@/lib/config';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'COMIU | 東京の20代向けサークル・交流イベント検索',
    template: '%s | COMIU',
  },
  description:
    'COMIUは、東京の20代向けサークル・交流イベントを探してLINEで参加予約できるサービスです。バドミントン、フットサル、バスケ、バレーなどのイベントを掲載しています。',
  applicationName: 'COMIU',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'COMIU | 東京の20代向けサークル・交流イベント検索',
    description:
      '東京の20代向けサークル・交流イベントを探して、LINEでかんたんに参加予約できます。',
    url: SITE_URL,
    locale: 'ja_JP',
    type: 'website',
    siteName: 'COMIU',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'COMIU | 東京の20代向けサークル・交流イベント検索',
    description:
      '東京の20代向けサークル・交流イベントを探して、LINEでかんたんに参加予約できます。',
    images: [`${SITE_URL}/opengraph-image`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
