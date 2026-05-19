'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { initLiff, getLiffUserId } from '@/lib/liff';

function CompassIcon({ active }: { active: boolean }) {
  const s = active ? '#06C755' : '#BDBDBD';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={active ? '#06C755' : 'none'} />
    </svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  const s = active ? '#06C755' : '#BDBDBD';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  const s = active ? '#06C755' : '#BDBDBD';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" />
    </svg>
  );
}

function BellIcon({ active }: { active: boolean }) {
  const s = active ? '#06C755' : '#BDBDBD';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="none" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function LiffBottomNav({ tenantId: propId }: { tenantId?: string }) {
  const pathname = usePathname();
  const params = useParams();
  const [tid, setTid] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [talkUnread, setTalkUnread] = useState(0);

  useEffect(() => {
    const fromUrl = propId ?? (params?.tenantId as string | undefined);
    if (fromUrl) {
      localStorage.setItem('liff-tenant-id', fromUrl);
      setTid(fromUrl);
    } else {
      setTid(localStorage.getItem('liff-tenant-id') ?? '');
    }
  }, [propId, params?.tenantId]);

  useEffect(() => {
    if (!tid) return;
    async function fetchUnread() {
      const ok = await initLiff();
      const uid = ok ? ((await getLiffUserId()) ?? '') : `demo-${tid}`;
      if (!uid) return;
      const [notifs, msgs] = await Promise.all([
        api.notifications.list(tid, uid).catch(() => []),
        api.liff.adminMessages(tid, uid).catch(() => []),
      ]);
      setUnreadCount(notifs.filter((n) => !n.read).length);
      setTalkUnread(msgs.filter((m) => m.fromAdmin && !m.read).length);
    }
    fetchUnread();
  }, [tid, pathname]);

  const base = tid ? `/liff/${tid}` : '';

  const items = [
    {
      href: '/',
      label: 'Discover',
      Icon: CompassIcon,
      active: pathname === '/',
      badge: 0,
    },
    {
      href: base || null,
      label: 'Home',
      Icon: HomeIcon,
      active: !!base && pathname === base,
      badge: 0,
    },
    {
      href: base ? `${base}/talks` : null,
      label: 'Talk',
      Icon: ChatIcon,
      active: !!base && pathname.startsWith(`${base}/talks`),
      badge: talkUnread,
    },
    {
      href: base ? `${base}/notifications` : null,
      label: '通知',
      Icon: BellIcon,
      active: !!base && pathname.startsWith(`${base}/notifications`),
      badge: unreadCount,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map(({ href, label, Icon, active, badge }) => {
        const cls = `flex-1 flex flex-col items-center py-2 gap-0.5 ${active ? 'text-[#06C755]' : 'text-gray-400'}`;
        const labelEl = <span className="text-[10px] font-medium tracking-wide">{label}</span>;
        const iconEl = (
          <div className="relative">
            <Icon active={active} />
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </div>
        );
        if (!href) {
          return (
            <span key={label} className={`${cls} opacity-30`}>
              {iconEl}
              {labelEl}
            </span>
          );
        }
        return (
          <Link key={label} href={href} className={cls}>
            {iconEl}
            {labelEl}
          </Link>
        );
      })}
    </nav>
  );
}
