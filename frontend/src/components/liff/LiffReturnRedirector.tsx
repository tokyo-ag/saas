'use client';

import { useEffect } from 'react';

function getPendingRedirect() {
  const raw = localStorage.getItem('liff-pending-redirect');
  if (!raw) return null;

  try {
    const { url, expires } = JSON.parse(raw) as {
      url: string;
      expires: number;
    };
    if (Date.now() < expires) return url;
  } catch {
    // Clear malformed values below.
  }

  localStorage.removeItem('liff-pending-redirect');
  return null;
}

function normalizeLiffState(raw: string | null) {
  if (!raw) return null;
  let state = raw;
  const seen = new Set<string>();

  while (state && !seen.has(state)) {
    seen.add(state);

    try {
      const decoded = decodeURIComponent(state);
      if (decoded !== state) {
        state = decoded;
        continue;
      }
    } catch {
      // ignore decode failures
    }

    if (state.startsWith('?')) {
      const params = new URLSearchParams(state.slice(1));
      const nested = params.get('liff.state');
      if (nested) {
        params.delete('liff.state');
        const rest = params.toString();
        state = nested + (rest ? `?${rest}` : '');
        continue;
      }
    }

    break;
  }

  return state || null;
}

function getLiffStateRedirect(searchParams: URLSearchParams) {
  const rawState = searchParams.get('liff.state');
  const state = normalizeLiffState(rawState);
  if (!state) return null;

  const path = state.startsWith('/') ? state : `/${state}`;
  if (path === '/' || path.startsWith('//')) return null;
  const target = path.startsWith('/liff/') ? path : `/liff${path}`;

  const nextParams = new URLSearchParams(searchParams);
  nextParams.delete('liff.state');
  const query = nextParams.toString();
  const separator = target.includes('?') ? '&' : '?';
  return `${target}${query ? `${separator}${query}` : ''}`;
}

export default function LiffReturnRedirector() {
  useEffect(() => {
    async function run() {
      const searchParams = new URLSearchParams(window.location.search);
      const pending = getPendingRedirect();
      const liffStateRedirect = getLiffStateRedirect(searchParams);

      const redirectTo = pending ?? liffStateRedirect;
      if (redirectTo) {
        localStorage.removeItem('liff-pending-redirect');
        window.location.replace(redirectTo);
      }
    }

    void run();
  }, []);

  return null;
}
