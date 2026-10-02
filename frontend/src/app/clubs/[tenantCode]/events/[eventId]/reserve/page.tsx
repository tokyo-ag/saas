'use client';

import { Suspense, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { liffNavigationUrl } from '@/lib/config';
import { api } from '@/lib/api';

function PublicReserveRedirectInner() {
  const { tenantCode, eventId } = useParams<{ tenantCode: string; eventId: string }>();
  const liffReservePath = `/liff/${tenantCode}/events/${eventId}/reserve`;

  useEffect(() => {
    api.public.tenant(tenantCode)
      .then((tenant) => {
        window.location.replace(
          liffNavigationUrl(liffReservePath, {
            liffId: tenant.liffId,
            endpointPath: '/',
          }),
        );
      })
      .catch(() => window.location.replace(liffReservePath));
  }, [liffReservePath, tenantCode]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#06C755]" />
    </div>
  );
}

export default function PublicReserveRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#06C755]" />
        </div>
      }
    >
      <PublicReserveRedirectInner />
    </Suspense>
  );
}
