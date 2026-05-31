export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BASE = API_URL + '/api';

import { getToken, clearToken } from './auth';

let _liffToken: string | null = null;
export function setLiffToken(token: string | null) {
  _liffToken = token;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isSuperadmin = path.startsWith('/superadmin');
  const isAdmin = path.startsWith('/admin');
  const isLiff = path.startsWith('/liff/');
  const needsAuth = isSuperadmin || isAdmin || path === '/auth/reconfirm' || path === '/auth/me' || path === '/auth/set-email-password' || path === '/auth/resend-verification';
  const token = needsAuth ? getToken() : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (isLiff && _liffToken) headers['Authorization'] = `Bearer ${_liffToken}`;

  const { headers: optionHeaders, ...restOptions } = options ?? {};
  const res = await fetch(`${BASE}${path}`, {
    ...restOptions,
    headers: { ...headers, ...(optionHeaders as Record<string, string> | undefined) },
  });

  if (!res.ok) {
    if (res.status === 401 && needsAuth && typeof window !== 'undefined') {
      clearToken();
      window.location.href = isSuperadmin ? '/superadmin/login' : '/login';
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
    reviews: (id: string) =>
      request<AdminEventReview[]>(`/admin/events/${id}/reviews`),
    updateReview: (eventId: string, reviewId: string, isPublished: boolean) =>
      request<EventReview>(`/admin/events/${eventId}/reviews/${reviewId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished }),
      }),
    remind: (id: string) =>
      request<{ sentCount: number }>(`/admin/events/${id}/remind`, { method: 'POST' }),
    checkin: (id: string, memberId: string) =>
      request<{ memberName: string; alreadyCheckedIn: boolean }>(
        `/admin/events/${id}/checkin`,
        { method: 'POST', body: JSON.stringify({ memberId }) },
      ),
    sendMessage: (id: string, data: { content: string; sendLine: boolean; sendApp: boolean }) =>
      request<{ lineSentCount: number; appSentCount: number; total: number }>(
        `/admin/events/${id}/message`,
        { method: 'POST', body: JSON.stringify(data) },
      ),
    exportUrl: (id: string) => `${BASE}/admin/events/${id}/export`,
  },
  members: {
    list: (params?: { name?: string; grade?: string; gender?: string }) => {
      const filtered = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== ''));
      const q = new URLSearchParams(filtered).toString();
      return request<Member[]>(`/admin/members${q ? `?${q}` : ''}`);
    },
    get: (id: string) => request<MemberDetail>(`/admin/members/${id}`),
    syncLineProfiles: () => request<{ updated: number }>('/admin/members/sync-line-profiles', { method: 'POST' }),
    messageThreads: () => request<AdminMessageThread[]>('/admin/members/messages/threads'),
    block: (id: string) => request<Member>(`/admin/members/${id}/block`, { method: 'PATCH' }),
    unblock: (id: string) => request<Member>(`/admin/members/${id}/unblock`, { method: 'PATCH' }),
    messages: (id: string) => request<AdminMessage[]>(`/admin/members/${id}/messages`),
    sendMessage: (id: string, content: string) =>
      request<AdminMessage>(`/admin/members/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
  },
  reservations: {
    updateStatus: (id: string, status: string) =>
      request(`/admin/reservations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },
  liff: {
    recordAccess: (tenantId: string) => request<{ ok: boolean }>(`/liff/${tenantId}/access`, { method: 'POST' }),
    tenant: (tenantId: string) => request<LiffTenant>(`/liff/${tenantId}`),
    events: (tenantId: string, lineUserId?: string) =>
      request<LiffEvent[]>(`/liff/${tenantId}/events${lineUserId ? `?lineUserId=${encodeURIComponent(lineUserId)}` : ''}`),
    event: (tenantId: string, eventId: string) =>
      request<LiffEvent>(`/liff/${tenantId}/events/${eventId}`),
    myReservation: (tenantId: string, eventId: string, lineUserId: string) =>
      request<LiffReservation | null>(
        `/liff/${tenantId}/events/${eventId}/my-reservation?lineUserId=${encodeURIComponent(lineUserId)}`,
      ),
    reviews: (tenantId: string, eventId: string) =>
      request<EventReview[]>(`/liff/${tenantId}/events/${eventId}/reviews`),
    myReview: (tenantId: string, eventId: string, lineUserId: string) =>
      request<EventReview | null>(
        `/liff/${tenantId}/events/${eventId}/my-review?lineUserId=${encodeURIComponent(lineUserId)}`,
      ),
    submitReview: (tenantId: string, eventId: string, lineUserId: string, content: string) =>
      request<EventReview>(`/liff/${tenantId}/events/${eventId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ lineUserId, content }),
      }),
    reserve: (tenantId: string, data: ReserveInput) =>
      request<ReserveResult>(`/liff/${tenantId}/reservations`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (tenantId: string, reservationId: string) =>
      request<void>(`/liff/${tenantId}/reservations/${reservationId}`, { method: 'DELETE' }),
    join: (tenantId: string, data: { lineDisplayName?: string; linePictureUrl?: string }) =>
      request<LiffProfile>(`/liff/${tenantId}/join`, { method: 'POST', body: JSON.stringify(data) }),
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
    syncLineProfile: (tenantId: string, lineUserId: string, data: { lineDisplayName?: string; linePictureUrl?: string }) =>
      request<void>(
        `/liff/${tenantId}/profile/line?lineUserId=${encodeURIComponent(lineUserId)}`,
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
    markAdminMessagesRead: (tenantId: string, lineUserId: string) =>
      request<void>(`/liff/${tenantId}/admin-messages/read?lineUserId=${encodeURIComponent(lineUserId)}`, { method: 'PATCH' }),
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
    events: (category?: string, tag?: string) => {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (tag) params.set('tag', tag);
      const qs = params.toString();
      return request<PublicEvent[]>(`/public/events${qs ? `?${qs}` : ''}`);
    },
    tenants: () => request<PublicTenant[]>('/public/tenants'),
    recordView: (eventId: string) =>
      request<{ ok: boolean }>(`/public/events/${eventId}/view`, { method: 'POST' }),
  },
  tenant: {
    get: () => request<Tenant>('/admin/tenant'),
    update: (data: Partial<TenantInput>, reauthToken?: string) =>
      request<Tenant>('/admin/tenant', {
        method: 'PUT',
        headers: reauthToken ? { 'X-Reauth-Token': reauthToken } : undefined,
        body: JSON.stringify(data),
      }),
    stats: () => request<{
      memberCount: number;
      thisMonthEventCount: number;
      totalReservationCount: number;
      thisMonthReservationCount: number;
      totalRevenue: number;
    }>('/admin/tenant/stats'),
    syncLineProfile: () => request<Tenant>('/admin/tenant/sync-line-profile', { method: 'POST' }),
    billingCheckout: (plan: 'standard' | 'pro') =>
      request<{ url: string }>('/admin/tenant/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      }),
    growth: () => request<{ label: string; members: number; reservations: number }[]>('/admin/tenant/growth'),
    activity: () => request<{ type: string; text: string; at: string }[]>('/admin/tenant/activity'),
    supportMessages: () => request<SupportMessage[]>('/admin/tenant/support'),
    sendSupport: (content: string) =>
      request<SupportMessage>('/admin/tenant/support', {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
  },
  auth: {
    reconfirm: (email: string, password: string) =>
      request<{ reauthToken: string }>('/auth/reconfirm', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    getMe: () =>
      request<{ tenantId: string; accountId: string; email: string | null; emailVerified: boolean; hasPassword: boolean; lineUserId: string | null }>('/auth/me'),
    setEmailPassword: (email: string, password: string) =>
      request<{ message: string }>('/auth/set-email-password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },
  superadmin: {
    list: () => request<TenantWithStats[]>('/superadmin/tenants'),
    create: (data: { name: string; description?: string; plan?: 'free' | 'standard' | 'pro'; email: string; password: string }) =>
      request<Tenant>('/superadmin/tenants', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; description?: string; plan?: 'free' | 'standard' | 'pro'; code?: string }) =>
      request<Tenant>(`/superadmin/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deactivate: (id: string) =>
      request<Tenant>(`/superadmin/tenants/${id}/deactivate`, { method: 'PATCH' }),
    restore: (id: string) =>
      request<Tenant>(`/superadmin/tenants/${id}/restore`, { method: 'PATCH' }),
    ban: (id: string) =>
      request<Tenant>(`/superadmin/tenants/${id}/ban`, { method: 'PATCH' }),
    purge: (id: string) =>
      request<void>(`/superadmin/tenants/${id}`, { method: 'DELETE' }),
    impersonate: (id: string) =>
      request<{ token: string }>(`/superadmin/tenants/${id}/impersonate`),
    listBannedUsers: () => request<BannedUser[]>('/superadmin/banned-users'),
    banUser: (lineUserId: string, reason?: string) =>
      request<BannedUser>('/superadmin/banned-users', { method: 'POST', body: JSON.stringify({ lineUserId, reason }) }),
    unbanUser: (lineUserId: string) =>
      request<void>(`/superadmin/banned-users/${encodeURIComponent(lineUserId)}`, { method: 'DELETE' }),
    supportThreads: () => request<SupportThread[]>('/superadmin/support'),
    supportMessages: (lineUserId: string) => request<SupportMessage[]>(`/superadmin/support/${encodeURIComponent(lineUserId)}`),
    replySupport: (lineUserId: string, content: string) =>
      request<SupportMessage>(`/superadmin/support/${encodeURIComponent(lineUserId)}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    errorLogs: () => request<ErrorLog[]>('/superadmin/errors'),
    clearErrorLogs: () => request<void>('/superadmin/errors', { method: 'DELETE' }),
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
  endAt?: string | null;
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
  category?: string | null;
  tags?: string[];
}

export interface EventInput {
  title: string;
  description?: string;
  heldAt: string;
  endAt?: string | null;
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
  category?: string | null;
  tags?: string[];
}

export interface Member {
  id: string;
  name?: string;
  grade?: string;
  gender?: string;
  lineUserId: string;
  lineDisplayName?: string | null;
  linePictureUrl?: string | null;
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

export interface AdminMessageThread {
  member: {
    id: string;
    name?: string | null;
    grade?: string | null;
    gender?: string | null;
    lineUserId: string;
    lineDisplayName?: string | null;
    linePictureUrl?: string | null;
  };
  lastMessage: AdminMessage | null;
  unreadCount: number;
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

export interface ErrorLog {
  id: string;
  method: string;
  url: string;
  status: number;
  message: string;
  stack?: string | null;
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
    lineDisplayName?: string | null;
    linePictureUrl?: string | null;
  };
}

export interface LiffEvent {
  id: string;
  title: string;
  description?: string;
  heldAt: string;
  endAt?: string | null;
  location: string;
  locationUrl?: string | null;
  capacity?: number;
  status: EventStatus;
  price: number;
  priceMale?: number | null;
  priceFemale?: number | null;
  paymentRequired: boolean;
  reservedCount: number;
  imageUrl?: string;
  iconUrl?: string;
  friendAttendees?: { id: string; name: string | null }[];
  reviews?: EventReview[];
}

export interface EventReview {
  id: string;
  content: string;
  createdAt: string;
  memberName?: string | null;
  memberGrade?: string | null;
  isPublished?: boolean;
}

export interface AdminEventReview extends EventReview {
  isPublished: boolean;
  member: {
    id: string;
    name?: string | null;
    grade?: string | null;
    gender?: string | null;
  };
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
  code?: string;
  name: string;
  description?: string;
  lineChannelId?: string;
  lineChannelSecret?: string;
  lineChannelAccessToken?: string;
  lineConfigured?: boolean;
  liffId?: string;
  organizerLineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  stripePublishableKey?: string | null;
  stripeSecretKey?: string | null;
  stripeWebhookSecret?: string | null;
  plan: 'free' | 'standard' | 'pro';
  planStartedAt?: string | null;
  liffEventView?: string;
  themeColor?: string;
  iconUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  bannedAt?: string | null;
}

export interface TenantWithStats extends Tenant {
  memberCount: number;
  organizerEmail?: string | null;
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
  liffEventView?: string;
  themeColor?: string;
  iconUrl?: string;
  code?: string;
}

export interface LiffTenant {
  id: string;
  name: string;
  description?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  iconUrl?: string;
  lineChannelId?: string;
  liffEventView?: string;
  themeColor?: string;
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
  id: string;
  code?: string | null;
  name: string;
  description?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  memberCount: number;
  eventCount: number;
  accessCount: number;
}

export interface PublicEvent {
  id: string;
  tenantId: string;
  tenantCode?: string | null;
  title: string;
  heldAt: string;
  location: string;
  price: number;
  priceMale?: number | null;
  priceFemale?: number | null;
  capacity?: number;
  reservedCount: number;
  iconUrl?: string;
  imageUrl?: string;
  viewCount: number;
  tenantAccessCount: number;
  category?: string | null;
  tags: string[];
  tenant: {
    id: string;
    code?: string | null;
    name: string;
    lineDisplayName?: string;
    linePictureUrl?: string;
    iconUrl?: string;
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
