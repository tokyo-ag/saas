'use client';

import { ReservationStatus, EventStatus } from '@/lib/api';

const reservationColors: Record<ReservationStatus, string> = {
  reserved: 'bg-blue-100 text-blue-800',
  attended: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  waitlisted: 'bg-yellow-100 text-yellow-800',
  waiting_payment: 'bg-orange-100 text-orange-800',
};

const reservationLabels: Record<ReservationStatus, string> = {
  reserved: '参加確定',
  attended: '参加済',
  cancelled: 'キャンセル',
  waitlisted: 'キャンセル待ち',
  waiting_payment: '支払待ち',
};

const eventColors: Record<EventStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-green-100 text-green-800',
  closed: 'bg-red-100 text-red-800',
};

const eventLabels: Record<EventStatus, string> = {
  draft: '下書き',
  open: '受付中',
  closed: '受付終了',
};

export function ReservationBadge({ status }: { status: ReservationStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${reservationColors[status]}`}>
      {reservationLabels[status]}
    </span>
  );
}

export function EventBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${eventColors[status]}`}>
      {eventLabels[status]}
    </span>
  );
}
