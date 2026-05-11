// バックエンドのベースURL（開発中はポート3001）
const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api';

// テナントID（Phase 1は固定値）
export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'tenant-001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Request failed');
  }
  return res.json();
}

export function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  return request<T>(path, options);
}

// ---- イベント ----
export const api = {
  events: {
    list: () => request<Event[]>('/admin/events'),
    get: (id: string) => request<Event>(`/admin/events/${id}`),
    create: (data: EventInput) =>
      request<Event>('/admin/events', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: EventInput) =>
      request<Event>(`/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetch(`${BASE}/admin/events/${id}`, { method: 'DELETE' }),
    reservations: (id: string) =>
      request<Reservation[]>(`/admin/events/${id}/reservations`),
    remind: (id: string) =>
      request(`/admin/events/${id}/remind`, { method: 'POST' }),
    exportUrl: (id: string) => `${BASE}/admin/events/${id}/export`,
  },
  members: {
    list: (params?: { name?: string; grade?: string; gender?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return request<Member[]>(`/admin/members${q ? `?${q}` : ''}`);
    },
    get: (id: string) => request<MemberDetail>(`/admin/members/${id}`),
    exportUrl: () => `${BASE}/admin/members/export`,
  },
  reservations: {
    updateStatus: (id: string, status: string) =>
      request(`/admin/reservations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },
  liff: {
    events: (tenantId: string) => request<LiffEvent[]>(`/liff/${tenantId}/events`),
    event: (tenantId: string, eventId: string) =>
      request<LiffEvent>(`/liff/${tenantId}/events/${eventId}`),
    reserve: (tenantId: string, data: ReserveInput) =>
      request<ReserveResult>(`/liff/${tenantId}/reservations`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (tenantId: string, reservationId: string) =>
      fetch(`${BASE}/liff/${tenantId}/reservations/${reservationId}`, { method: 'DELETE' }),
  },
};

// ---- 型定義 ----
export type EventStatus = 'draft' | 'open' | 'closed';
export type ReservationStatus = 'waiting_payment' | 'reserved' | 'waitlisted' | 'attended' | 'cancelled';

export interface Event {
  id: string;
  title: string;
  description?: string;
  heldAt: string;
  location: string;
  capacity?: number;
  status: EventStatus;
  price: number;
  paymentRequired: boolean;
  notifyOnReserve: boolean;
  remindEnabled: boolean;
  remindAt?: string;
  remindedAt?: string;
  createdAt: string;
  updatedAt: string;
  reservedCount?: number;
  waitlistedCount?: number;
}

export interface EventInput {
  title: string;
  description?: string;
  heldAt: string;
  location: string;
  capacity?: number | null;
  status: EventStatus;
  price: number;
  paymentRequired?: boolean;
  notifyOnReserve?: boolean;
  remindEnabled?: boolean;
  remindAt?: string | null;
}

export interface Member {
  id: string;
  name?: string;
  grade?: string;
  gender?: string;
  lineUserId: string;
  createdAt: string;
  eventCount: number;
}

export interface MemberDetail extends Member {
  reservations: Array<{
    id: string;
    status: ReservationStatus;
    reservedAt: string;
    paidAt?: string;
    event: Event;
  }>;
}

export interface Reservation {
  id: string;
  status: ReservationStatus;
  waitlistOrder?: number;
  reservedAt: string;
  paidAt?: string;
  member: {
    id: string;
    name?: string;
    grade?: string;
    gender?: string;
  };
}

export interface LiffEvent {
  id: string;
  title: string;
  description?: string;
  heldAt: string;
  location: string;
  capacity?: number;
  status: EventStatus;
  price: number;
  paymentRequired: boolean;
  reservedCount: number;
}

export interface ReserveInput {
  eventId: string;
  lineUserId: string;
  name: string;
  grade: string;
  gender: string;
}

export interface ReserveResult {
  id: string;
  status: 'reserved' | 'waitlisted';
  waitlistOrder?: number;
}

// ---- ヘルパー関数 ----
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo',
  });
}

export function formatDateOnly(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tokyo',
  });
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    month: 'numeric', day: 'numeric',
    weekday: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
}

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  reserved: '予約確定',
  waitlisted: 'キャンセル待ち',
  attended: '参加済',
  cancelled: 'キャンセル',
  waiting_payment: '支払待ち',
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: '下書き',
  open: '受付中',
  closed: '受付終了',
};
