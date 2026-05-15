'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, decodeJwt } from '@/lib/auth';

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/superadmin/login'); return; }
    const payload = decodeJwt<{ isSuperadmin?: boolean }>(token);
    if (!payload?.isSuperadmin) router.replace('/superadmin/login');
  }, [router]);

  return <>{children}</>;
}
