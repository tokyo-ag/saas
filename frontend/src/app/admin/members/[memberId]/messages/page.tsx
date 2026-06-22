'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, AdminMessage } from '@/lib/api';
import { ChatBubble, ChatInput } from '@/components/ui/ChatBubble';

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

export default function MemberMessagesPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [memberName, setMemberName] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api.members.messages(memberId)
      .then((data) => {
        setMessages(data);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .catch(() => {});
  }, [memberId]);

  useEffect(() => {
    api.members.get(memberId).then((m) => setMemberName(m.name ?? '（名前未設定）')).catch(() => {});
    load();
  }, [memberId, load]);

  useEffect(() => {
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      await api.members.sendMessage(memberId, content);
      load();
    } finally {
      setSending(false);
    }
  }

  const memberAvatar = (
    <div className="w-7 h-7 rounded-full bg-[#06C755]/10 flex items-center justify-center text-sm">👤</div>
  );

  let lastDate = '';

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center gap-3 mb-0 py-3 border-b border-gray-200">
        <Link href={`/admin/members/${memberId}`} className="text-gray-500 text-sm hover:text-gray-700">← 戻る</Link>
        <div className="w-8 h-8 rounded-full bg-[#06C755]/10 flex items-center justify-center shrink-0">👤</div>
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">{memberName}</p>
          <p className="text-[10px] text-gray-400">参加者との直接メッセージ</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-2 bg-[#F7F8FA] px-4 -mx-4 md:-mx-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-sm text-gray-500">まだメッセージはありません</p>
            <p className="text-xs text-gray-400 mt-1">参加者にメッセージを送ることができます</p>
          </div>
        )}
        {messages.map((msg) => {
          const d = formatDate(msg.createdAt);
          const showDate = d !== lastDate;
          lastDate = d;
          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex justify-center my-2">
                  <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{d}</span>
                </div>
              )}
              <ChatBubble
                content={msg.content}
                time={formatTime(msg.createdAt)}
                isMine={msg.fromAdmin}
                avatar={memberAvatar}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSend}
        sending={sending}
        className="-mx-4 md:-mx-6 px-4 pt-3 pb-2"
      />
    </div>
  );
}
