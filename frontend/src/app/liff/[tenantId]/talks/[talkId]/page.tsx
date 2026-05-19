'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ChatRoom } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded } from '@/lib/liff';

export default function ChatPage() {
  const { tenantId, talkId } = useParams<{ tenantId: string; talkId: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<ChatRoom | null>(null);
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
      return uid;
    }
    init().then((uid) => { if (uid) loadMessages(uid); });
  }, [tenantId, talkId]);

  useEffect(() => {
    if (!lineUserId) return;
    const id = setInterval(() => loadMessages(lineUserId), 3000);
    return () => clearInterval(id);
  }, [lineUserId, tenantId, talkId]);

  function loadMessages(uid: string) {
    api.liff.messages(tenantId, talkId, uid)
      .then((data) => {
        setRoom(data);
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
      await api.liff.sendMessage(tenantId, talkId, lineUserId, content);
      loadMessages(lineUserId);
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--cp-20)]">
      <div className="bg-[var(--cp)] text-white px-4 py-4 flex items-center gap-3 shrink-0">
        <button onClick={() => router.push(`/liff/${tenantId}/talks`)} className="text-white text-xl leading-none p-1">‹</button>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm shrink-0">👤</div>
        <h1 className="text-base font-bold">{room?.partnerName ?? '...'}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {!room && <p className="text-center text-gray-400 text-sm pt-8">読み込み中...</p>}
        {room?.messages.map((msg) => {
          const isMine = msg.senderId === room.myMemberId;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isMine && (
                <div className="w-8 h-8 rounded-full bg-[var(--cp-10)] flex items-center justify-center text-sm shrink-0 mt-1">👤</div>
              )}
              <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMine ? 'bg-[var(--cp)] text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-sm'
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

      <form onSubmit={handleSend} className="bg-white border-t border-gray-200 px-4 py-3 flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力..."
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cp)] bg-gray-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-[var(--cp)] rounded-full flex items-center justify-center disabled:opacity-40 active:bg-[var(--cp-h)] shrink-0"
        >
          <span className="text-white text-lg leading-none">↑</span>
        </button>
      </form>
    </div>
  );
}
