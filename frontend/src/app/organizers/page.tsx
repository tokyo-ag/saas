import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Metadata } from 'next';

import StaticLpInteractions from './StaticLpInteractions';
import { SITE_URL } from '@/lib/config';

export const revalidate = 60;

const title = 'COMIU（コミュー） | イベント・サークルの集客なら';
const description =
  'COMIUは、イベント・サークル主催者のための団体運営プラットフォームです。団体ページ、イベント募集、予約管理、公式LINE連携をひとつに。';

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

function getStaticLpHtml() {
  const html = readFileSync(join(process.cwd(), 'public', 'comiu-lp', 'index.html'), 'utf8');
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? '';

  return body
    .replace(/\s*<script src="script\.js"><\/script>\s*/g, '')
    .replace(/href="#cta"/g, 'href="/register"')
    .replace(/href="mailto:[^"]+"/g, 'href="/register"');
}

export default function OrganizersPage() {
  return (
    <>
      <link rel="stylesheet" href="/comiu-lp/styles.css" />
      <StaticLpInteractions />
      <div dangerouslySetInnerHTML={{ __html: getStaticLpHtml() }} />
    </>
  );
}
