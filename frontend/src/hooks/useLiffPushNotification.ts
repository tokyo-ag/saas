'use client';
import { useEffect } from 'react';

const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

export function useLiffPushNotification(tenantId: string, lineUserId: string) {
  useEffect(() => {
    if (!tenantId || !lineUserId) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    (async () => {
      try {
        const res = await fetch(`${API}/liff/${tenantId}/push/vapid-key`);
        if (!res.ok) return;
        const { publicKey } = await res.json() as { publicKey: string | null };
        if (!publicKey) return;

        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        if (Notification.permission === 'denied') return;
        const permission = Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();
        if (permission !== 'granted') return;

        const existing = await reg.pushManager.getSubscription();
        const subscription = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        const key = subscription.getKey('p256dh');
        const auth = subscription.getKey('auth');
        if (!key || !auth) return;

        await fetch(`${API}/liff/${tenantId}/push/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineUserId,
            endpoint: subscription.endpoint,
            p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
            auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
          }),
        });
      } catch {
        // 通知登録失敗は無視
      }
    })();
  }, [tenantId, lineUserId]);
}
