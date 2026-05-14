'use client';

import { useEffect, useRef, useState } from 'react';
import { api, SupportMessage } from '@/lib/api';
import { ChatBubble, ChatInput } from '@/components/ui/ChatBubble';

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export default function AdminSupportPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  async function load() {
    const data = await api.tenant.supportMessages().catch(() => []);
    setMessages(data);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setInput('');
    setSending(true);
    try {
      await api.tenant.sendSupport(content);
      await load();
    } finally {
      setSending(false);
    }
  }

  const comiuAvatar = (
    <div className="w-8 h-8 rounded-full bg-[#06C755]/10 text-[#06C755] flex items-center justify-center text-xs font-bold">C</div>
  );

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">COMIU サポートチャット</h1>
        <p className="text-sm text-gray-500 mt-1">COMIUへ運用相談や不具合を送れます。</p>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#06C755]/10 text-[#06C755] flex items-center justify-center text-sm font-bold">C</div>
          <div>
            <p className="text-sm font-bold text-gray-900">COMIU</p>
            <p className="text-xs text-gray-400">COMIU サポートチャット</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F7F8FA] px-4 py-4 space-y-2">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-10">読み込み中...</p>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 rounded-full bg-[#06C755]/10 text-[#06C755] flex items-center justify-center text-lg font-bold mb-4">C</div>
              <p className="text-sm font-semibold text-gray-700 mb-1">COMIUに相談</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                LINE設定、決済、イベント運用、参加者対応などで困ったことを送れます。
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                content={msg.content}
                time={formatTime(msg.createdAt)}
                isMine={msg.fromUser}
                avatar={comiuAvatar}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <ChatInput value={input} onChange={setInput} onSubmit={handleSend} sending={sending} />
      </div>
    </div>
  );
}
