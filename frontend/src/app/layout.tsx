import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { SITE_URL } from '@/lib/config';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'COMIU｜コミュニティ・サークルのイベント管理をLINEで',
    template: '%s | COMIU',
  },
  description:
    'バドミントンサークル・交流会・勉強会など、あらゆるコミュニティのイベント管理・参加者募集をLINEで完結。東京を中心に20代向けサークルも多数。フリープランは無料で始められます。',
openGraph: {
    title: 'COMIU｜コミュニティのイベント管理をLINEで',
    description:
      'バドミントンサークル・交流会など、コミュニティのイベント管理・参加者募集をLINEで完結。東京を中心に20代向けサークルも多数。',
    locale: 'ja_JP',
    type: 'website',
    siteName: 'COMIU',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'COMIU｜コミュニティのイベント管理をLINEで',
    description:
      'バドミントンサークル・交流会など、コミュニティのイベント管理・参加者募集をLINEで完結。',
    images: [`${SITE_URL}/opengraph-image`],
  },
  robots: {
    index: true,
    follow: true,
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
