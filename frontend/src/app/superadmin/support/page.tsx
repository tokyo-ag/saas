'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, SupportThread, SupportMessage } from '@/lib/api';
import { ChatBubble, ChatInput } from '@/components/ui/ChatBubble';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

export default function SuperadminSupportPage() {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected);
    const id = setInterval(() => loadMessages(selected), 5000);
    return () => clearInterval(id);
  }, [selected]);

  function loadThreads() {
    setLoading(true);
    api.superadmin.supportThreads().then(setThreads).catch(() => {}).finally(() => setLoading(false));
  }

  function loadMessages(uid: string) {
    api.superadmin.supportMessages(uid)
      .then((data) => {
        setMessages(data);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        // 既読になったのでスレッド一覧を更新
        setThreads((prev) => prev.map((t) => t.lineUserId === uid ? { ...t, unread: 0 } : t));
      })
      .catch(() => {});
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !selected || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      await api.superadmin.replySupport(selected, content);
      loadMessages(selected);
      loadThreads();
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }

  const selectedThread = threads.find((t) => t.lineUserId === selected);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link href="/superadmin" className="text-gray-400 hover:text-gray-600 text-sm">← 戻る</Link>
          <h1 className="text-lg font-bold text-gray-900">COMIU サポートチャット</h1>
          {threads.some((t) => t.unread > 0) && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
              {threads.reduce((s, t) => s + t.unread, 0)}件 未読
            </span>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4">
        <div className="flex gap-4 h-[calc(100vh-140px)]">
          {/* スレッド一覧 */}
          <div className="w-72 shrink-0 bg-white rounded-2xl border border-gray-200 overflow-y-auto">
            {loading ? (
              <p className="text-gray-400 text-sm p-4 text-center">読み込み中...</p>
            ) : threads.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                <p className="text-2xl mb-2">🛟</p>
                COMIU サポートチャットのメッセージはありません
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {threads.map((t) => (
                  <button
                    key={t.lineUserId}
                    onClick={() => setSelected(t.lineUserId)}
                    className={`w-full p-4 flex items-start gap-3 text-left transition-colors ${selected === t.lineUserId ? 'bg-[#06C755]/5' : 'hover:bg-gray-50'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base ${t.unread > 0 ? 'bg-[#06C755]/15' : 'bg-gray-100'}`}>🛟</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-mono text-gray-500 truncate">{t.lineUserId.slice(0, 12)}...</p>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-1">{timeAgo(t.lastAt)}</span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{t.lastMessage}</p>
                    </div>
                    {t.unread > 0 && (
                      <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        {t.unread > 9 ? '9+' : t.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* チャットエリア */}
          {selected ? (
            <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* チャットヘッダー */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">🛟</div>
                <div>
                  <p className="text-xs font-bold text-gray-900">{selected}</p>
                  {selectedThread?.tenantId && (
                    <p className="text-[10px] text-gray-400">テナント: {selectedThread.tenantId}</p>
                  )}
                </div>
              </div>

              {/* メッセージ */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[#F7F8FA]">
                {messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    content={msg.content}
                    time={formatTime(msg.createdAt)}
                    isMine={!msg.fromUser}
                    avatar={<div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm">🛟</div>}
                  />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* 入力欄 */}
              <ChatInput value={input} onChange={setInput} onSubmit={handleSend} sending={sending} placeholder="返信を入力..." />
            </div>
          ) : (
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-center p-8">
              <p className="text-4xl mb-4">💬</p>
              <p className="text-sm font-semibold text-gray-700 mb-1">スレッドを選択</p>
              <p className="text-xs text-gray-400">左のリストからユーザーを選んで返信できます</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
