'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, apiFetch, AdminMessage } from '@/lib/api';

export default function MemberMessagesPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [memberName, setMemberName] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.members.get(memberId).then((m) => setMemberName(m.name ?? '（名前未設定）')).catch(() => {});
    load();
  }, [memberId]);



  useEffect(() => {
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [memberId]);

  function load() {
    apiFetch<AdminMessage[]>(`/admin/members/${memberId}/messages`)
      .then((data) => {
        setMessages(data);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .catch(() => {});
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      await apiFetch(`/admin/members/${memberId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      load();
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
  }

  let lastDate = '';

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-0 py-3 border-b border-gray-200">
        <Link href={`/admin/members/${memberId}`} className="text-gray-500 text-sm hover:text-gray-700">← 戻る</Link>
        <div className="w-8 h-8 rounded-full bg-[#06C755]/10 flex items-center justify-center shrink-0">👤</div>
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">{memberName}</p>
          <p className="text-[10px] text-gray-400">参加者との直接メッセージ</p>
        </div>
      </div>

      {/* メッセージ一覧 */}
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
              <div className={`flex ${msg.fromAdmin ? 'justify-end' : 'justify-start'} gap-2`}>
                {!msg.fromAdmin && (
                  <div className="w-7 h-7 rounded-full bg-[#06C755]/10 flex items-center justify-center text-sm shrink-0 mt-1">👤</div>
                )}
                <div className={`max-w-[72%] flex flex-col gap-0.5 ${msg.fromAdmin ? 'items-end' : 'items-start'}`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.fromAdmin ? 'bg-[#06C755] text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[11px] text-gray-400 px-1">{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      <form onSubmit={handleSend} className="bg-white border-t border-gray-200 pt-3 pb-2 flex gap-2 -mx-4 md:-mx-6 px-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力..."
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-[#06C755] rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-[#05a847] shrink-0"
        >
          <span className="text-white text-lg leading-none">↑</span>
        </button>
      </form>
    </div>
  );
}
