'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { buildLiffUrl } from '@/lib/config';
import { api } from '@/lib/api';

function PublicReserveRedirectInner() {
  const { tenantCode, eventId } = useParams<{ tenantCode: string; eventId: string }>();
  const searchParams = useSearchParams();
  const isWaitlist = searchParams.get('waitlist') === '1';
  const liffReservePath = `/liff/${tenantCode}/events/${eventId}/reserve${isWaitlist ? '?waitlist=1' : ''}`;

  useEffect(() => {
    api.public.tenant(tenantCode)
      .then((tenant) => {
        window.location.replace(
          buildLiffUrl(liffReservePath, {
            liffId: tenant.liffId,
            endpointPath: `/liff/${tenantCode}`,
          }) ?? liffReservePath,
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
