'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, SupportMessage } from '@/lib/api';

type ThreadRow = {
  kind: 'comiu';
  href: string;
  title: string;
  subtitle: string;
  avatar: string;
  lastContent: string;
  lastAt?: string;
  unreadCount: number;
  prefix: string;
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
}

export default function AdminMessagesPage() {
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.tenant.supportMessages()
      .catch(() => [])
      .then((support) => setSupportMessages(support))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo<ThreadRow[]>(() => {
    const latestSupport = supportMessages.at(-1);
    const supportUnread = supportMessages.filter((message) => !message.fromUser && !message.read).length;
    const comiuRow: ThreadRow = {
      kind: 'comiu',
      href: '/admin/support',
      title: 'COMIU サポートチャット',
      subtitle: 'COMIUへの相談・不具合報告',
      avatar: 'C',
      lastContent: latestSupport?.content ?? '運用で困ったことをCOMIUに相談できます',
      lastAt: latestSupport?.createdAt,
      unreadCount: supportUnread,
      prefix: latestSupport ? (latestSupport.fromUser ? 'あなた: ' : 'COMIU: ') : '',
    };

    return [comiuRow];
  }, [supportMessages]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">メッセージ</h1>
        <p className="text-sm text-gray-500 mt-1">
          COMIU サポートチャットを確認できます。
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((row) => (
              <Link
                key={row.href}
                href={row.href}
                className="flex items-center gap-4 p-5 transition-colors bg-[#06C755]/5 hover:bg-[#06C755]/10"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold shrink-0 bg-[#06C755] text-white text-sm">
                  {row.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate">{row.title}</p>
                    <span className="rounded-full bg-[#06C755]/10 px-2 py-0.5 text-[11px] font-bold text-[#06C755]">
                      COMIU
                    </span>
                    {row.unreadCount > 0 && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                        {row.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{row.subtitle}</p>
                  <p className="text-sm text-gray-600 mt-1 truncate">
                    {row.prefix}{row.lastContent}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {row.lastAt && (
                    <p className="text-xs text-gray-400">{formatTime(row.lastAt)}</p>
                  )}
                  <p className="text-xs text-[#06C755] font-medium mt-2">開く</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
