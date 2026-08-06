const DEFAULT_FRONTEND_URL = 'https://comiu.link';
const DEFAULT_API_URL = 'https://comiu.up.railway.app';
const DEFAULT_TENANT_CODE = '11221185';

const frontendUrl = stripTrailingSlash(
  process.env.SMOKE_FRONTEND_URL || DEFAULT_FRONTEND_URL,
);
const apiUrl = stripTrailingSlash(process.env.SMOKE_API_URL || DEFAULT_API_URL);
const tenantCode = process.env.SMOKE_TENANT_CODE || DEFAULT_TENANT_CODE;
const selectedSuite = parseSuiteArg();

const suites = {
  saas: [
    {
      name: 'register page links to production LINE auth',
      run: async () => {
        const res = await fetchWithTimeout(`${frontendUrl}/register`);
        assertStatus(res, 200, 399);
        const html = await res.text();
        assertIncludes(
          html,
          `${apiUrl}/api/auth/line`,
          'register page does not link to the production LINE auth endpoint',
        );
      },
    },
    {
      name: 'LINE Login endpoint redirects to LINE',
      run: async () => {
        const res = await fetchWithTimeout(`${apiUrl}/api/auth/line`, {
          redirect: 'manual',
        });
        if (![301, 302, 303, 307, 308].includes(res.status)) {
          const body = await res.text().catch(() => '');
          throw new Error(
            `expected redirect to LINE, got ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`,
          );
        }

        const location = res.headers.get('location');
        if (!location) {
          throw new Error('LINE auth endpoint did not return a Location header');
        }

        const url = new URL(location);
        if (url.hostname !== 'access.line.me') {
          throw new Error(`LINE auth endpoint redirected to unexpected host: ${url.hostname}`);
        }
        if (!url.searchParams.get('client_id')) {
          throw new Error('LINE auth redirect has an empty client_id');
        }

        const redirectUri = url.searchParams.get('redirect_uri');
        if (redirectUri !== `${apiUrl}/api/auth/line/callback`) {
          throw new Error(
            `LINE auth redirect_uri mismatch: expected ${apiUrl}/api/auth/line/callback, got ${redirectUri}`,
          );
        }
      },
    },
    {
      name: 'backend LIFF tenant exposes tenant messaging settings',
      run: async () => {
        const tenant = await fetchJson(`${apiUrl}/api/liff/${tenantCode}`);
        if (!tenant?.id || !tenant?.name) {
          throw new Error('LIFF tenant response is missing id/name');
        }
        if (!tenant?.lineChannelId) {
          throw new Error('LIFF tenant response is missing lineChannelId');
        }
        if (!tenant?.liffId) {
          throw new Error('LIFF tenant response is missing the tenant LIFF ID');
        }
      },
    },
    {
      name: 'LIFF schedule page responds and is noindex',
      run: async () => {
        const res = await fetchWithTimeout(`${frontendUrl}/liff/${tenantCode}`);
        assertStatus(res, 200, 399);
        const html = await res.text();
        assertIncludes(html, 'noindex', 'LIFF schedule page is missing noindex robots metadata');
      },
    },
    {
      name: 'frontend bundle supports tenant LIFF initialization',
      run: async () => {
        const html = await fetchWithTimeout(`${frontendUrl}/liff/${tenantCode}`).then((res) => {
          assertStatus(res, 200, 399);
          return res.text();
        });
        const scripts = getScriptSrcs(html)
          .filter((src) => src.startsWith('/_next/') && src.endsWith('.js'))
          .slice(0, 40);
        if (scripts.length === 0) {
          throw new Error('LIFF page did not include any Next.js script chunks');
        }

        const bundleText = (
          await Promise.all(
            scripts.map((src) =>
              fetchWithTimeout(`${frontendUrl}${src}`).then((res) => {
                assertStatus(res, 200, 299);
                return res.text();
              }),
            ),
          )
        ).join('\n');

        assertIncludes(bundleText, 'liffId', 'frontend bundle does not load the tenant LIFF ID');
      },
    },
    {
      name: 'LIFF reservation page responds for an open event',
      run: async () => {
        const events = await fetchJson(`${apiUrl}/api/liff/${tenantCode}/events`);
        if (!Array.isArray(events) || events.length === 0) {
          throw new Error('LIFF events response is empty');
        }
        const eventId = events[0]?.id;
        if (!eventId) {
          throw new Error('LIFF event is missing id');
        }

        const res = await fetchWithTimeout(
          `${frontendUrl}/liff/${tenantCode}/events/${eventId}/reserve`,
        );
        assertStatus(res, 200, 399);
        const html = await res.text();
        assertIncludes(html, 'noindex', 'LIFF reservation page is missing noindex robots metadata');
      },
    },
  ],
  seo: [
    {
      name: 'frontend home responds',
      run: async () => {
        const res = await fetchWithTimeout(frontendUrl);
        assertStatus(res, 200, 399);
        const html = await res.text();
        assertIncludes(html, 'COMIU', 'home page is missing COMIU');
      },
    },
    {
      name: 'locked portal home points tenants to LIFF and keeps SaaS CTAs',
      run: async () => {
        const res = await fetchWithTimeout(frontendUrl);
        assertStatus(res, 200, 399);
        const html = await res.text();
        assertIncludes(html, '/liff/', 'locked portal home does not link tenants to LIFF');
        assertIncludes(html, '/register', 'locked portal home is missing organizer registration CTA');
        assertIncludes(html, '/login', 'locked portal home is missing organizer login CTA');
      },
    },
    {
      name: 'backend public tenants responds',
      run: async () => {
        const tenants = await fetchJson(`${apiUrl}/api/public/tenants`);
        if (!Array.isArray(tenants)) {
          throw new Error('public tenants response is not an array');
        }
        if (tenants.length === 0) {
          throw new Error('public tenants response is empty');
        }
      },
    },
    {
      name: 'UGC sitemap APIs expose stable SEO identifiers',
      run: async () => {
        const [tenants, events] = await Promise.all([
          fetchJson(`${apiUrl}/api/public/sitemap-tenants`),
          fetchJson(`${apiUrl}/api/public/sitemap-events`),
        ]);

        if (!Array.isArray(tenants) || tenants.length === 0) {
          throw new Error('sitemap-tenants response is empty');
        }
        if (!Array.isArray(events) || events.length === 0) {
          throw new Error('sitemap-events response is empty');
        }

        const tenant = tenants[0];
        if (!tenant?.tenantCode || !tenant?.updatedAt) {
          throw new Error('sitemap tenant is missing tenantCode/updatedAt');
        }

        const event = events[0];
        if (!event?.id || !event?.tenantCode || !event?.updatedAt) {
          throw new Error('sitemap event is missing id/tenantCode/updatedAt');
        }
      },
    },
    {
      name: 'robots separates public SEO routes from app routes',
      run: async () => {
        const res = await fetchWithTimeout(`${frontendUrl}/robots.txt`);
        assertStatus(res, 200, 299);
        const text = await res.text();
        assertIncludes(text, 'Allow: /clubs/', 'robots.txt does not allow club SEO pages');
        assertIncludes(text, 'Allow: /e/', 'robots.txt does not allow event SEO pages');
        assertIncludes(text, 'Disallow: /liff/', 'robots.txt does not disallow LIFF app routes');
        assertIncludes(text, 'Disallow: /admin/', 'robots.txt does not disallow admin routes');
        assertIncludes(text, `Sitemap: ${frontendUrl}/sitemap.xml`, 'robots.txt sitemap URL mismatch');
      },
    },
    {
      name: 'sitemap contains SEO pages and excludes SaaS app routes',
      run: async () => {
        const res = await fetchWithTimeout(`${frontendUrl}/sitemap.xml`);
        assertStatus(res, 200, 299);
        const xml = await res.text();
        const locs = getSitemapLocs(xml);
        if (locs.length === 0) {
          throw new Error('sitemap has no loc entries');
        }
        if (locs.length > 45000) {
          throw new Error('sitemap is close to the 50,000 URL limit; split into sitemap index files');
        }
        assertNoDuplicates(locs, 'sitemap contains duplicate URLs');
        for (const loc of locs) {
          assertSameOrigin(loc, frontendUrl, `sitemap URL has unexpected origin: ${loc}`);
          if (/[?#]/.test(loc)) {
            throw new Error(`sitemap URL should be canonical without query/hash: ${loc}`);
          }
        }

        assertIncludes(xml, `${frontendUrl}/pricing`, 'sitemap is missing pricing page');
        assertIncludes(xml, `${frontendUrl}/use-cases`, 'sitemap is missing use-cases page');
        assertIncludes(xml, `${frontendUrl}/clubs/`, 'sitemap is missing club SEO pages');
        assertIncludes(xml, `${frontendUrl}/e/`, 'sitemap is missing event SEO pages');
        assertExcludes(xml, `${frontendUrl}/liff/`, 'sitemap should not include LIFF app routes');
        assertExcludes(xml, `${frontendUrl}/admin`, 'sitemap should not include admin routes');
        assertExcludes(xml, `${frontendUrl}/login`, 'sitemap should not include login route');
        assertExcludes(xml, `${frontendUrl}/register`, 'sitemap should not include register route');
      },
    },
    {
      name: 'sample UGC SEO pages are indexable with social/search metadata',
      run: async () => {
        const xml = await fetchWithTimeout(`${frontendUrl}/sitemap.xml`).then((res) => {
          assertStatus(res, 200, 299);
          return res.text();
        });
        const locs = getSitemapLocs(xml);
        const samples = [
          locs.find((loc) => loc.startsWith(`${frontendUrl}/clubs/`)),
          locs.find((loc) => loc.startsWith(`${frontendUrl}/e/`)),
        ].filter(Boolean);

        if (samples.length < 2) {
          throw new Error('sitemap does not include both club and event UGC samples');
        }

        for (const url of samples) {
          const res = await fetchWithTimeout(url);
          assertStatus(res, 200, 399);
          const html = await res.text();
          assertExcludes(html, 'noindex', `${url} should be indexable`);
          assertIncludes(html, 'rel="canonical"', `${url} is missing canonical URL`);
          assertIncludes(html, 'property="og:title"', `${url} is missing og:title`);
          assertIncludes(html, 'property="og:description"', `${url} is missing og:description`);
          assertIncludes(html, 'application/ld+json', `${url} is missing JSON-LD`);
        }
      },
    },
  ],
};

const checks =
  selectedSuite === 'all'
    ? [...suites.saas, ...suites.seo]
    : suites[selectedSuite];

let failed = false;

console.log(`smoke suite: ${selectedSuite}`);

for (const check of checks) {
  try {
    await check.run();
    console.log(`ok - ${check.name}`);
  } catch (error) {
    failed = true;
    console.error(`not ok - ${check.name}`);
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) {
  process.exitCode = 1;
}

function parseSuiteArg() {
  const raw =
    process.env.SMOKE_SUITE ||
    process.argv.find((arg) => arg.startsWith('--suite='))?.split('=')[1] ||
    'all';
  if (raw !== 'all' && raw !== 'saas' && raw !== 'seo') {
    throw new Error(`Unknown smoke suite "${raw}". Use all, saas, or seo.`);
  }
  return raw;
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

async function fetchJson(url, options = {}) {
  const res = await fetchWithTimeout(url, options);
  assertStatus(res, 200, 299);
  return res.json();
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function assertStatus(res, min, max) {
  if (res.status < min || res.status > max) {
    throw new Error(`unexpected status ${res.status}`);
  }
}

function assertIncludes(value, expected, message) {
  if (!value.includes(expected)) throw new Error(message);
}

function assertExcludes(value, unexpected, message) {
  if (value.includes(unexpected)) throw new Error(message);
}

function getSitemapLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function getScriptSrcs(html) {
  return [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
}

function assertNoDuplicates(values, message) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${message}: ${value}`);
    seen.add(value);
  }
}

function assertSameOrigin(value, expectedOrigin, message) {
  const url = new URL(value);
  const origin = new URL(expectedOrigin).origin;
  if (url.origin !== origin) throw new Error(message);
}
