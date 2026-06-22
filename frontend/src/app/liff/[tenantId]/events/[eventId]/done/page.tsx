'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

export default function DonePage() {
  const { tenantId, eventId } = useParams<{ tenantId: string; eventId: string }>();
  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams.get('status');
    const order = searchParams.get('order');
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (order) query.set('order', order);
    const url = `/liff/${tenantId}/events/${eventId}/reserve${query.toString() ? `?${query.toString()}` : ''}`;
    window.location.replace(url);
  }, [searchParams, tenantId, eventId]);

  return null;
}
