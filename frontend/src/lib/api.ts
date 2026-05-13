// バックエンドのベースURL（開発中はポート3001）
const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api';

// テナントID（Phase 1は固定値）
export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'tenant-001';

import { getToken, clearToken } from './auth';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const needsAuth = path.startsWith('/superadmin');
  const token = needsAuth ? getToken() : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { headers, ...options });

  if (!res.ok) {
    if (res.status === 401 && needsAuth && typeof window !== 'undefined') {
      clearToken();
      window.location.href = '/superadmin/login';
      return Promise.reject(new Error('Unauthorized'));
    }
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Request failed');
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return res.json();
}

export async function downloadWithAuth(url: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('ダウンロードに失敗しました');
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objUrl);
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
      request<void>(`/admin/events/${id}`, { method: 'DELETE' }),
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
    block: (id: string) => request<Member>(`/admin/members/${id}/block`, { method: 'PATCH' }),
    unblock: (id: string) => request<Member>(`/admin/members/${id}/unblock`, { method: 'PATCH' }),
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
    tenant: (tenantId: string) => request<LiffTenant>(`/liff/${tenantId}`),
    events: (tenantId: string, lineUserId?: string) =>
      request<LiffEvent[]>(`/liff/${tenantId}/events${lineUserId ? `?lineUserId=${encodeURIComponent(lineUserId)}` : ''}`),
    event: (tenantId: string, eventId: string) =>
      request<LiffEvent>(`/liff/${tenantId}/events/${eventId}`),
    myReservation: (tenantId: string, eventId: string, lineUserId: string) =>
      request<LiffReservation | null>(
        `/liff/${tenantId}/events/${eventId}/my-reservation?lineUserId=${encodeURIComponent(lineUserId)}`,
      ),
    reserve: (tenantId: string, data: ReserveInput) =>
      request<ReserveResult>(`/liff/${tenantId}/reservations`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (tenantId: string, reservationId: string) =>
      fetch(`${BASE}/liff/${tenantId}/reservations/${reservationId}`, { method: 'DELETE' }),
    profile: (tenantId: string, lineUserId: string) =>
      request<LiffProfile>(`/liff/${tenantId}/profile?lineUserId=${encodeURIComponent(lineUserId)}`),
    memberProfile: (tenantId: string, memberId: string) =>
      request<LiffProfile>(`/liff/${tenantId}/members/${memberId}`),
    createConnection: (tenantId: string, myLineUserId: string, targetMemberId: string) =>
      request<LiffConnection & { alreadyConnected: boolean }>(`/liff/${tenantId}/connections`, {
        method: 'POST',
        body: JSON.stringify({ myLineUserId, targetMemberId }),
      }),
    connections: (tenantId: string, lineUserId: string) =>
      request<LiffConnection[]>(`/liff/${tenantId}/connections?lineUserId=${encodeURIComponent(lineUserId)}`),
    messages: (tenantId: string, connectionId: string, lineUserId: string) =>
      request<ChatRoom>(`/liff/${tenantId}/connections/${connectionId}/messages?lineUserId=${encodeURIComponent(lineUserId)}`),
    sendMessage: (tenantId: string, connectionId: string, lineUserId: string, content: string) =>
      request<ChatMessage>(`/liff/${tenantId}/connections/${connectionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ lineUserId, content }),
      }),
    updateProfile: (tenantId: string, lineUserId: string, data: { name: string; grade: string; gender: string }) =>
      request<LiffProfile>(
        `/liff/${tenantId}/profile?lineUserId=${encodeURIComponent(lineUserId)}`,
        { method: 'PATCH', body: JSON.stringify(data) },
      ),
    updateSettings: (tenantId: string, lineUserId: string, settings: { showEventsToConnections: boolean }) =>
      request<{ showEventsToConnections: boolean }>(
        `/liff/${tenantId}/profile/settings?lineUserId=${encodeURIComponent(lineUserId)}`,
        { method: 'PATCH', body: JSON.stringify(settings) },
      ),
    adminMessages: (tenantId: string, lineUserId: string) =>
      request<AdminMessage[]>(`/liff/${tenantId}/admin-messages?lineUserId=${encodeURIComponent(lineUserId)}`),
    sendToAdmin: (tenantId: string, lineUserId: string, content: string) =>
      request<AdminMessage>(`/liff/${tenantId}/admin-messages`, {
        method: 'POST',
        body: JSON.stringify({ lineUserId, content }),
      }),
    supportMessages: (tenantId: string, lineUserId: string) =>
      request<SupportMessage[]>(`/liff/${tenantId}/support?lineUserId=${encodeURIComponent(lineUserId)}`),
    sendSupport: (tenantId: string, lineUserId: string, content: string) =>
      request<SupportMessage>(`/liff/${tenantId}/support`, {
        method: 'POST',
        body: JSON.stringify({ lineUserId, content }),
      }),
  },
  notifications: {
    list: (tenantId: string, lineUserId: string) =>
      request<AppNotification[]>(`/liff/${tenantId}/notifications?lineUserId=${encodeURIComponent(lineUserId)}`),
    markRead: (tenantId: string, id: string) =>
      request(`/liff/${tenantId}/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: (tenantId: string, lineUserId: string) =>
      request(`/liff/${tenantId}/notifications/read-all?lineUserId=${encodeURIComponent(lineUserId)}`, { method: 'PATCH' }),
  },
  public: {
    events: (anonymousId?: string) =>
      request<PublicEvent[]>(`/public/events${anonymousId ? `?anonymousId=${encodeURIComponent(anonymousId)}` : ''}`),
    tenants: () => request<PublicTenant[]>('/public/tenants'),
    toggleLike: (eventId: string, anonymousId: string) =>
      request<{ liked: boolean }>(`/public/events/${eventId}/like`, {
        method: 'POST',
        body: JSON.stringify({ anonymousId }),
      }),
  },
  tenant: {
    get: () => request<Tenant>('/admin/tenant'),
    update: (data: Partial<TenantInput>) =>
      request<Tenant>('/admin/tenant', { method: 'PUT', body: JSON.stringify(data) }),
    stats: () => request<{
      memberCount: number;
      thisMonthEventCount: number;
      totalReservationCount: number;
      thisMonthReservationCount: number;
      totalRevenue: number;
    }>('/admin/tenant/stats'),
    syncLineProfile: () => request<Tenant>('/admin/tenant/sync-line-profile', { method: 'POST' }),
    growth: () => request<{ label: string; members: number; reservations: number }[]>('/admin/tenant/growth'),
    activity: () => request<{ type: string; text: string; at: string }[]>('/admin/tenant/activity'),
  },
  superadmin: {
    list: () => request<TenantWithStats[]>('/superadmin/tenants'),
    create: (data: { name: string; description?: string; plan?: 'free' | 'standard' | 'pro' }) =>
      request<Tenant>('/superadmin/tenants', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; description?: string; plan?: 'free' | 'standard' | 'pro' }) =>
      request<Tenant>(`/superadmin/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deactivate: (id: string) =>
      request<Tenant>(`/superadmin/tenants/${id}/deactivate`, { method: 'PATCH' }),
    restore: (id: string) =>
      request<Tenant>(`/superadmin/tenants/${id}/restore`, { method: 'PATCH' }),
    ban: (id: string) =>
      request<Tenant>(`/superadmin/tenants/${id}/ban`, { method: 'PATCH' }),
    purge: (id: string) =>
      fetch(`${BASE}/superadmin/tenants/${id}`, { method: 'DELETE' }),
    listBannedUsers: () => request<BannedUser[]>('/superadmin/banned-users'),
    banUser: (lineUserId: string, reason?: string) =>
      request<BannedUser>('/superadmin/banned-users', { method: 'POST', body: JSON.stringify({ lineUserId, reason }) }),
    unbanUser: (lineUserId: string) =>
      fetch(`${BASE}/superadmin/banned-users/${encodeURIComponent(lineUserId)}`, { method: 'DELETE' }),
    supportThreads: () => request<SupportThread[]>('/superadmin/support'),
    supportMessages: (lineUserId: string) => request<SupportMessage[]>(`/superadmin/support/${encodeURIComponent(lineUserId)}`),
    replySupport: (lineUserId: string, content: string) =>
      request<SupportMessage>(`/superadmin/support/${encodeURIComponent(lineUserId)}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
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
  locationUrl?: string;
  capacity?: number;
  capacityMale?: number;
  capacityFemale?: number;
  status: EventStatus;
  price: number;
  priceMale?: number;
  priceFemale?: number;
  paymentRequired: boolean;
  paymentTiming?: string;
  notifyOnReserve: boolean;
  notifyOnReserveApp?: boolean;
  remindEnabled: boolean;
  remindApp?: boolean;
  remindAt?: string;
  remindedAt?: string;
  createdAt: string;
  updatedAt: string;
  reservedCount?: number;
  waitlistedCount?: number;
  imageUrl?: string;
  iconUrl?: string;
}

export interface EventInput {
  title: string;
  description?: string;
  heldAt: string;
  location: string;
  locationUrl?: string;
  capacity?: number | null;
  capacityMale?: number | null;
  capacityFemale?: number | null;
  status: EventStatus;
  price: number;
  priceMale?: number | null;
  priceFemale?: number | null;
  paymentRequired?: boolean;
  paymentTiming?: string;
  notifyOnReserve?: boolean;
  notifyOnReserveApp?: boolean;
  remindEnabled?: boolean;
  remindApp?: boolean;
  remindAt?: string | null;
  imageUrl?: string;
  iconUrl?: string;
}

export interface Member {
  id: string;
  name?: string;
  grade?: string;
  gender?: string;
  lineUserId: string;
  blockedAt?: string | null;
  createdAt: string;
  eventCount: number;
}

export interface BannedUser {
  id: string;
  lineUserId: string;
  reason?: string;
  bannedAt: string;
}

export interface AdminMessage {
  id: string;
  content: string;
  fromAdmin: boolean;
  read: boolean;
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  lineUserId: string;
  tenantId?: string | null;
  content: string;
  fromUser: boolean;
  read: boolean;
  createdAt: string;
}

export interface SupportThread {
  lineUserId: string;
  tenantId: string | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
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
  imageUrl?: string;
  iconUrl?: string;
  friendAttendees?: { id: string; name: string | null }[];
}

export interface ReserveInput {
  eventId: string;
  lineUserId: string;
  name: string;
  grade: string;
  gender: string;
}

export interface Tenant {
  id: string;
  name: string;
  description?: string;
  lineChannelId?: string;
  lineChannelSecret?: string;
  lineChannelAccessToken?: string;
  liffId?: string;
  organizerLineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  stripePublishableKey?: string | null;
  stripeSecretKey?: string | null;
  stripeWebhookSecret?: string | null;
  plan: 'free' | 'standard' | 'pro';
  planStartedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  bannedAt?: string | null;
}

export interface TenantWithStats extends Tenant {
  memberCount: number;
}

export interface TenantInput {
  name: string;
  description?: string;
  lineChannelId?: string;
  lineChannelSecret?: string;
  lineChannelAccessToken?: string;
  liffId?: string;
  organizerLineUserId?: string;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
}

export interface LiffTenant {
  id: string;
  name: string;
  description?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  lineChannelId?: string;
}

export interface LiffReservation {
  id: string;
  status: ReservationStatus;
  waitlistOrder?: number;
  reservedAt: string;
}

export interface LiffProfile {
  id: string;
  name?: string;
  grade?: string;
  gender?: string;
  showEventsToConnections: boolean;
}

export interface LiffConnection {
  id: string;
  partner: { id: string; name?: string; grade?: string };
  lastMessage: { content: string; createdAt: string } | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

export interface ChatRoom {
  partnerId: string;
  partnerName?: string;
  myMemberId: string;
  messages: ChatMessage[];
}

export interface ReserveResult {
  id: string;
  status: 'reserved' | 'waitlisted' | 'waiting_payment';
  waitlistOrder?: number;
  stripeCheckoutUrl?: string;
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

export interface PublicTenant {
  totalLikes: number;
  id: string;
  name: string;
  description?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  memberCount: number;
  eventCount: number;
}

export interface PublicEvent {
  id: string;
  tenantId: string;
  title: string;
  heldAt: string;
  location: string;
  price: number;
  capacity?: number;
  reservedCount: number;
  iconUrl?: string;
  imageUrl?: string;
  likeCount: number;
  monthlyLikeCount: number;
  userLiked: boolean;
  tenant: {
    id: string;
    name: string;
    lineDisplayName?: string;
    linePictureUrl?: string;
  };
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
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
