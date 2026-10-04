'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function DonePage() {
  const { tenantId } = useParams<{ tenantId: string; eventId: string }>();

  useEffect(() => {
    window.location.replace(`/e/${tenantId}`);
  }, [tenantId]);

  return null;
}
