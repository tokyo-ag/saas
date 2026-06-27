import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const dynamic = 'force-static';
export const revalidate = 60;

function getHtml() {
  const html = readFileSync(join(process.cwd(), 'public', 'comiu-lp', 'index.html'), 'utf8');

  return html
    .replace(/href="styles\.css"/g, 'href="/comiu-lp/styles.css"')
    .replace(/src="script\.js"/g, 'src="/comiu-lp/script.js"')
    .replace(/href="#cta"/g, 'href="/register"')
    .replace(/href="mailto:[^"]+"/g, 'href="/register"');
}

export function GET() {
  return new Response(getHtml(), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=86400',
    },
  });
}
