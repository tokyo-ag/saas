'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, AdminMessage } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded } from '@/lib/liff';

export default function AdminTalkPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [lineUserId, setLineUserId] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const ok = await initLiff();
      let uid = '';
      if (ok) {
        await loginIfNeeded();
        uid = (await getLiffUserId()) ?? '';
      } else {
        uid = `demo-${tenantId}`;
      }
      setLineUserId(uid);
      if (uid) load(uid);
    }
    init();
  }, [tenantId]);

  useEffect(() => {
    if (!lineUserId) return;
    const id = setInterval(() => load(lineUserId), 4000);
    return () => clearInterval(id);
  }, [lineUserId]);

  function load(uid: string) {
    api.liff.adminMessages(tenantId, uid)
      .then((data) => {
        setMessages(data);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .catch(() => {});
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !lineUserId || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      await api.liff.sendToAdmin(tenantId, lineUserId, content);
      load(lineUserId);
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="flex flex-col h-screen bg-[#F7F8FA]">
      <div className="bg-white border-b border-gray-100 px-4 flex items-center gap-3 shrink-0" style={{ paddingTop: 'env(safe-area-inset-top, 16px)', paddingBottom: '12px' }}>
        <button onClick={() => router.back()} className="text-gray-500 text-xl leading-none p-1">‹</button>
        <div className="w-8 h-8 rounded-full bg-[#06C755]/10 flex items-center justify-center shrink-0">
          <span className="text-base">🏠</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-tight">主催者</p>
          <p className="text-[10px] text-gray-400">主催者へ直接メッセージ</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-[#06C755]/10 flex items-center justify-center mb-4">
              <span className="text-3xl">🏠</span>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">主催者に連絡しよう</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              イベントのご質問や連絡事項など、<br />主催者に直接メッセージできます。
            </p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = !msg.fromAdmin;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isMine && (
                <div className="w-8 h-8 rounded-full bg-[#06C755]/10 flex items-center justify-center text-base shrink-0 mt-1">🏠</div>
              )}
              <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMine ? 'bg-[#06C755] text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-sm'
                }`}>
                  {msg.content}
                </div>
                <span className="text-xs text-gray-400 px-1">{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="bg-white border-t border-gray-200 px-4 py-3 flex gap-2 shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力..."
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755] bg-gray-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-[#06C755] rounded-full flex items-center justify-center disabled:opacity-40 active:bg-[#05a847] shrink-0"
        >
          <span className="text-white text-lg leading-none">↑</span>
        </button>
      </form>
    </div>
  );
}
