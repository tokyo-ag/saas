'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, AppNotification } from '@/lib/api';
import { initLiff, getLiffUserId } from '@/lib/liff';
import LiffBottomNav from '@/components/liff/LiffBottomNav';

export default function NotificationsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [lineUserId, setLineUserId] = useState('');

  useEffect(() => {
    async function init() {
      const ok = await initLiff();
      const uid = ok ? ((await getLiffUserId()) ?? '') : `demo-${tenantId}`;
      setLineUserId(uid);
      const data = await api.notifications.list(tenantId, uid).catch(() => []);
      setNotifications(data);
      setLoading(false);
    }
    init();
  }, [tenantId]);

  async function handleMarkAllRead() {
    if (!lineUserId) return;
    await api.notifications.markAllRead(tenantId, lineUserId).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleMarkRead(id: string) {
    await api.notifications.markRead(tenantId, id).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <div className="min-h-screen bg-[#F5F5F5] pb-24">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between px-4 pt-12 pb-3 sm:pt-4">
            <h1 className="text-[18px] font-bold text-white">通知</h1>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-gray-600 font-medium">
                すべて既読
              </button>
            )}
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white/85 rounded-xl p-4 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#BDBDBD" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">通知はありません</p>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  className={`w-full text-left rounded-xl p-4 border transition-colors ${
                    n.read ? 'bg-white border-gray-100' : 'bg-white border-[[#06C755]/30]'
                  }`}
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                >
                  <div className="flex items-start gap-3">
                    {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-[#06C755] shrink-0" />}
                    {n.read && <span className="mt-1.5 w-2 h-2 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className={`text-sm font-semibold ${n.read ? 'text-gray-500' : 'text-gray-900'}`}>{n.title}</p>
                        <p className="text-[10px] text-gray-400 shrink-0">
                          {new Date(n.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{n.body}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <LiffBottomNav tenantId={tenantId} />
    </>
  );
}
