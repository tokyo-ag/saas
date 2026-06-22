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

function getLiffStateRedirect(searchParams: URLSearchParams) {
  const state = searchParams.get('liff.state');
  if (!state) return null;

  const path = state.startsWith('/') ? state : `/${state}`;
  if (path === '/' || path.startsWith('//')) return null;
  const target = path.startsWith('/liff/') ? path : `/liff${path}`;

  const nextParams = new URLSearchParams(searchParams);
  nextParams.delete('liff.state');
  const query = nextParams.toString();
  return `${target}${query ? `?${query}` : ''}`;
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
