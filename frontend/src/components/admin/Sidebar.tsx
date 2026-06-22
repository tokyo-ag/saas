'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, Tenant } from '@/lib/api';
import { clearToken } from '@/lib/auth';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.tenant.get().then(setTenant).catch(() => {});
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!tenant) return;
    const correctSlug = tenant.code ?? tenant.id;
    if (!correctSlug) return;

    if (!pathname.startsWith('/admin/')) return;
    const afterAdmin = pathname.slice('/admin/'.length);
    const firstSegment = afterAdmin.split('/')[0];

    const ADMIN_SUBROUTES = new Set(['events', 'members', 'messages', 'settings', 'support', 'superadmin', 'login', 'dashboard']);
    if (!firstSegment || ADMIN_SUBROUTES.has(firstSegment)) return;

    if (firstSegment !== tenant.code && firstSegment !== tenant.id) {
      const rest = afterAdmin.slice(firstSegment.length);
      router.replace(`/admin/${correctSlug}${rest}`);
    } else if (tenant.code && firstSegment === tenant.id) {
      router.replace(pathname.replace(tenant.id, tenant.code));
    }
  }, [tenant, pathname, router]);

  const displayName = tenant?.lineDisplayName ?? tenant?.name ?? 'イベント管理';

  const links = [
    { href: '/admin/public-page', label: '公開ページ', icon: 'P' },
    { href: '/admin', label: 'ダッシュボード', icon: 'D' },
    { href: '/admin/events', label: 'イベント管理', icon: 'E' },
    { href: '/admin/messages', label: 'メッセージ', icon: 'M' },
    { href: '/admin/members', label: '参加者名簿', icon: 'U' },
    { href: '/admin/settings', label: '設定', icon: 'S' },
  ];

  const navContent = (
    <>
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          {(tenant?.linePictureUrl ?? tenant?.iconUrl) ? (
            <Image src={(tenant?.linePictureUrl ?? tenant?.iconUrl)!} width={32} height={32} className="w-8 h-8 rounded-lg object-cover shrink-0" alt="" unoptimized />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#06C755] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {displayName.slice(0, 1)}
            </div>
          )}
          <span className="text-sm font-semibold text-white/90 leading-tight truncate">{displayName}</span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {links.map((link) => {
          const isActive = link.label === 'ダッシュボード'
            ? pathname === '/admin'
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-[#06C755] text-white font-medium'
                  : 'text-white/60 hover:bg-white/10 hover:text-white/90'
              }`}
            >
              <span className="w-5 text-center text-xs font-bold leading-none">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10 space-y-2">
        <p className="text-xs text-white/30">Phase 1 MVP</p>
        <button
          onClick={() => { clearToken(); router.push('/login'); }}
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#1B1F2E] flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          {(tenant?.linePictureUrl ?? tenant?.iconUrl) ? (
            <Image src={(tenant?.linePictureUrl ?? tenant?.iconUrl)!} width={28} height={28} className="w-7 h-7 rounded-lg object-cover shrink-0" alt="" unoptimized />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-[#06C755] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {displayName.slice(0, 1)}
            </div>
          )}
          <span className="text-sm font-semibold text-white/90 truncate max-w-[160px]">{displayName}</span>
        </div>
        <button onClick={() => setOpen(true)} className="text-white/70 p-1" aria-label="メニューを開く">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-[#1B1F2E] text-white flex flex-col h-full z-10">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white" aria-label="メニューを閉じる">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {navContent}
          </aside>
        </div>
      )}

      <aside className="hidden md:flex w-56 min-h-screen bg-[#1B1F2E] text-white flex-col shrink-0">
        {navContent}
      </aside>
    </>
  );
}
