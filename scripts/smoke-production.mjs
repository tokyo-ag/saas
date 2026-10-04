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
      name: 'organizer register page exposes email signup',
      run: async () => {
        const res = await fetchWithTimeout(`${frontendUrl}/register`);
        assertStatus(res, 200, 399);
        const html = await res.text();
        assertIncludes(
          html,
          '主催者登録',
          'register page is missing the organizer signup form',
        );
        assertIncludes(html, 'type="email"', 'register page is missing the email field');
        assertIncludes(html, 'type="password"', 'register page is missing the password field');
        assertExcludes(
          html,
          'LINEで登録する',
          'register page still exposes the removed organizer LINE signup flow',
        );
      },
    },
    {
      name: 'organizer registration API validates input without creating data',
      run: async () => {
        const res = await fetchWithTimeout(`${apiUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'invalid', password: 'short', orgName: '' }),
        });
        if (res.status !== 400) {
          const body = await res.text().catch(() => '');
          throw new Error(
            `expected validation error 400, got ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`,
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
        if (tenant?.code !== tenantCode) {
          throw new Error('LIFF tenant response is missing the canonical tenant code');
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
      name: 'legacy LIFF schedule redirects to the canonical public schedule',
      run: async () => {
        const res = await fetchWithTimeout(`${frontendUrl}/liff/${tenantCode}`, {
          redirect: 'manual',
        });
        if (res.status !== 307 && res.status !== 308) {
          throw new Error(`expected permanent schedule redirect, got ${res.status}`);
        }
        const location = res.headers.get('location');
        if (location !== `/e/${tenantCode}` && location !== `${frontendUrl}/e/${tenantCode}`) {
          throw new Error(`unexpected schedule redirect target: ${location ?? 'missing'}`);
        }
      },
    },
    {
      name: 'canonical public schedule is indexable and exposes reservation details',
      run: async () => {
        const html = await fetchWithTimeout(`${frontendUrl}/e/${tenantCode}`).then((res) => {
          assertStatus(res, 200, 299);
          return res.text();
        });
        assertExcludes(html, 'noindex', 'canonical public schedule should be indexable');
        assertIncludes(html, 'rel="canonical"', 'canonical public schedule is missing canonical metadata');
        assertIncludes(html, 'マイページ', 'canonical public schedule is missing the account entry point');
        assertIncludes(html, `/e/${tenantCode}/`, 'canonical public schedule is missing event detail links');
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
      name: 'home exposes participant discovery and organizer CTAs',
      run: async () => {
        const res = await fetchWithTimeout(frontendUrl);
        assertStatus(res, 200, 399);
        const html = await res.text();
        const hasParticipantRoute =
          html.includes('/e/') ||
          html.includes('/liff/') ||
          html.includes('/clubs/') ||
          html.includes('/events/');
        if (!hasParticipantRoute) {
          throw new Error('home does not link to any participant discovery route');
        }
        assertIncludes(html, '/register', 'home is missing organizer registration CTA');
        assertIncludes(html, '/login', 'home is missing organizer login CTA');
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
