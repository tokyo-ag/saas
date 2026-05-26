'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getToken, decodeJwt } from '@/lib/auth';

export default function SuperadminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === '/superadmin/login') {
      setReady(true);
      return;
    }
    const token = getToken();
    if (!token) { router.replace('/superadmin/login'); return; }
    const payload = decodeJwt<{ isSuperadmin?: boolean }>(token);
    if (!payload?.isSuperadmin) {
      router.replace('/superadmin/login');
    } else {
      setReady(true);
    }
  }, [pathname, router]);

  if (!ready) return null;

  return <>{children}</>;
}
