'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { initLiff, isLiffLoggedIn } from '@/lib/liff';
import {
  UnifiedReservationSchedule,
  type UnifiedScheduleEvent,
} from './UnifiedReservationSchedule';

type Props = {
  events: UnifiedScheduleEvent[];
  tenantCode: string;
  viewStyle?: string | null;
  accentColor: string;
  cardBg: string;
  liffId?: string | null;
};

export function TenantEventsClient({ events, tenantCode, viewStyle, accentColor, cardBg, liffId }: Props) {
  const [reservedEventIds, setReservedEventIds] = useState<Set<string> | undefined>(undefined);

  useEffect(() => {
    async function loadReservations() {
      try {
        await initLiff(liffId ?? undefined);
        if (!isLiffLoggedIn()) return;
        const reservations = await api.liff.myReservations(tenantCode);
        const ids = new Set(
          reservations
            .filter((r) => r.status === 'reserved' || r.status === 'waitlisted')
            .map((r) => r.event.id),
        );
        setReservedEventIds(ids);
      } catch {
        // ログインしていない・LIFF未対応の場合はバッジなしで表示
      }
    }
    void loadReservations();
  }, [tenantCode, liffId]);

  return (
    <UnifiedReservationSchedule
      events={events}
      tenantCode={tenantCode}
      viewStyle={viewStyle}
      accentColor={accentColor}
      cardBg={cardBg}
      reservedEventIds={reservedEventIds}
    />
  );
}
