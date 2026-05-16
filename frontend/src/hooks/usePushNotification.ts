import { useEffect } from 'react';
import { getToken } from '@/lib/auth';

const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

async function getVapidPublicKey(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API}/admin/push/vapid-key`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { publicKey: string | null };
    return data.publicKey;
  } catch {
    return null;
  }
}

async function registerSubscription(subscription: PushSubscription): Promise<void> {
  const token = getToken();
  if (!token) return;
  const key = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');
  if (!key || !auth) return;
  await fetch(`${API}/admin/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
      auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
    }),
  });
}

export function usePushNotification() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    (async () => {
      try {
        const vapidKey = await getVapidPublicKey();
        if (!vapidKey) return;

        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        if (Notification.permission === 'denied') return;

        const permission = Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();
        if (permission !== 'granted') return;

        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await registerSubscription(existing);
          return;
        }

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        await registerSubscription(subscription);
      } catch {
        // 通知登録失敗は無視
      }
    })();
  }, []);
}
