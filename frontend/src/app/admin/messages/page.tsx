'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api, AdminMessageThread, SupportMessage } from '@/lib/api';

type ThreadRow = {
  kind: 'comiu' | 'member';
  href: string;
  title: string;
  subtitle: string;
  avatar: string;
  avatarImg?: string | null;
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
  const [memberThreads, setMemberThreads] = useState<AdminMessageThread[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.members.messageThreads().catch(() => []),
      api.tenant.supportMessages().catch(() => []),
    ])
      .then(([threads, support]) => {
        setMemberThreads(threads);
        setSupportMessages(support);
      })
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

    const memberRows: ThreadRow[] = memberThreads.map((thread) => ({
      kind: 'member',
      href: `/admin/members/${thread.member.id}/messages`,
      title: thread.member.name ?? thread.member.lineDisplayName ?? '未入力',
      subtitle: `${thread.member.grade ?? '-'} / ${thread.member.gender ?? '-'}`,
      avatar: (thread.member.name ?? thread.member.lineDisplayName ?? '未').slice(0, 1),
      avatarImg: thread.member.linePictureUrl,
      lastContent: thread.lastMessage?.content ?? '',
      lastAt: thread.lastMessage?.createdAt,
      unreadCount: thread.unreadCount,
      prefix: '',
    }));

    return [comiuRow, ...memberRows].sort((a, b) => {
      if (a.kind === 'comiu' && !a.lastAt) return -1;
      if (b.kind === 'comiu' && !b.lastAt) return 1;
      return new Date(b.lastAt ?? 0).getTime() - new Date(a.lastAt ?? 0).getTime();
    });
  }, [memberThreads, supportMessages]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">メッセージ</h1>
        <p className="text-sm text-gray-500 mt-1">
          参加者からの連絡と、COMIU サポートチャットをまとめて確認できます。
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold mb-3">M</div>
            <p className="text-sm font-semibold text-gray-700">まだメッセージはありません</p>
            <p className="text-xs text-gray-400 mt-1">LIFFのメッセージやCOMIUへの相談がここに表示されます。</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((row) => (
              <Link
                key={`${row.kind}-${row.href}`}
                href={row.href}
                className={`flex items-center gap-4 p-5 transition-colors ${
                  row.kind === 'comiu' ? 'bg-[#06C755]/5 hover:bg-[#06C755]/10' : 'hover:bg-gray-50'
                }`}
              >
                {row.avatarImg ? (
                  <Image src={row.avatarImg} alt="" width={44} height={44} className="w-11 h-11 rounded-full object-cover shrink-0" unoptimized />
                ) : (
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold shrink-0 ${
                    row.kind === 'comiu'
                      ? 'bg-[#06C755] text-white text-sm'
                      : 'bg-[#06C755]/10 text-[#06C755]'
                  }`}>
                    {row.avatar}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate">{row.title}</p>
                    {row.kind === 'comiu' && (
                      <span className="rounded-full bg-[#06C755]/10 px-2 py-0.5 text-[11px] font-bold text-[#06C755]">
                        COMIU
                      </span>
                    )}
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
