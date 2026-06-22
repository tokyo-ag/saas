const DEFAULT_FRONTEND_URL = 'https://comiu.link';
const DEFAULT_API_URL = 'https://comiu.up.railway.app';
const DEFAULT_TENANT_CODE = '11221185';

const frontendUrl = stripTrailingSlash(
  process.env.SMOKE_FRONTEND_URL || DEFAULT_FRONTEND_URL,
);
const apiUrl = stripTrailingSlash(process.env.SMOKE_API_URL || DEFAULT_API_URL);
const tenantCode = process.env.SMOKE_TENANT_CODE || DEFAULT_TENANT_CODE;

const checks = [
  {
    name: 'frontend home responds',
    run: async () => {
      const res = await fetchWithTimeout(frontendUrl);
      assertStatus(res, 200, 399);
    },
  },
  {
    name: 'frontend register page responds',
    run: async () => {
      const res = await fetchWithTimeout(`${frontendUrl}/register`);
      assertStatus(res, 200, 399);
      const html = await res.text();
      if (!html.includes(`${apiUrl}/api/auth/line`)) {
        throw new Error('register page does not link to the production LINE auth endpoint');
      }
    },
  },
  {
    name: 'backend public tenants responds',
    run: async () => {
      const res = await fetchWithTimeout(`${apiUrl}/api/public/tenants`);
      assertStatus(res, 200, 299);
      const tenants = await res.json();
      if (!Array.isArray(tenants)) {
        throw new Error('public tenants response is not an array');
      }
      if (tenants.length === 0) {
        throw new Error('public tenants response is empty');
      }
    },
  },
  {
    name: 'backend LIFF tenant responds',
    run: async () => {
      const res = await fetchWithTimeout(`${apiUrl}/api/liff/${tenantCode}`);
      assertStatus(res, 200, 299);
      const tenant = await res.json();
      if (!tenant?.id || !tenant?.name) {
        throw new Error('LIFF tenant response is missing id/name');
      }
      if (!tenant?.lineChannelId) {
        throw new Error('LIFF tenant response is missing lineChannelId');
      }
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
      if (url.searchParams.get('client_id') === '') {
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
];

let failed = false;

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

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
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
