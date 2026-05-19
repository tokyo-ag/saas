'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, SupportMessage } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded } from '@/lib/liff';
import { ChatBubble, ChatInput } from '@/components/ui/ChatBubble';

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export default function SupportPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
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
    const id = setInterval(() => load(lineUserId), 5000);
    return () => clearInterval(id);
  }, [lineUserId]);

  function load(uid: string) {
    api.liff.supportMessages(tenantId, uid)
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
      await api.liff.sendSupport(tenantId, lineUserId, content);
      load(lineUserId);
    } finally {
      setSending(false);
    }
  }

  const comiuAvatar = (
    <div className="w-8 h-8 rounded-full bg-[#06C755]/10 flex items-center justify-center text-base">🛟</div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F5]">
      <div className="bg-white border-b border-gray-100 px-4 flex items-center gap-3 shrink-0" style={{ paddingTop: 'env(safe-area-inset-top, 16px)', paddingBottom: '12px' }}>
        <button onClick={() => router.back()} className="text-gray-600 text-xl leading-none p-1">‹</button>
        <div className="w-8 h-8 rounded-full bg-[#06C755]/20 flex items-center justify-center shrink-0">
          <span className="text-base">🛟</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">COMIU サポートチャット</p>
          <p className="text-[10px] text-gray-500">運営チームにメッセージ</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-[#06C755]/10 flex items-center justify-center mb-4">
              <span className="text-3xl">🛟</span>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">COMIUへ</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              ご質問・ご不明点があればお気軽にメッセージください。<br />
              通常1〜2営業日以内にお返事します。
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            content={msg.content}
            time={formatTime(msg.createdAt)}
            isMine={msg.fromUser}
            avatar={comiuAvatar}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <ChatInput value={input} onChange={setInput} onSubmit={handleSend} sending={sending} className="shrink-0" />
      </div>
    </div>
  );
}
