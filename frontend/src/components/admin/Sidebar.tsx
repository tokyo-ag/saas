'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, Tenant } from '@/lib/api';
import { clearToken } from '@/lib/auth';

const links = [
  { href: '/admin', label: 'ダッシュボード', icon: '◎' },
  { href: '/admin/events', label: 'イベント管理', icon: '▦' },
  { href: '/admin/members', label: '参加者名簿', icon: '⊞' },
  { href: '/admin/settings', label: '設定', icon: '⚙' },
];

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

  const displayName = tenant?.lineDisplayName ?? tenant?.name ?? '交流会管理';

  const navContent = (
    <>
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          {tenant?.linePictureUrl ? (
            <img src={tenant.linePictureUrl} className="w-8 h-8 rounded-lg object-cover shrink-0" alt="" />
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
          const isActive =
            link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
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
              <span className="text-base leading-none">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10 space-y-2">
        <p className="text-xs text-white/30">Phase 1 — MVP</p>
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
      {/* モバイル: トップバー */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#1B1F2E] flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          {tenant?.linePictureUrl ? (
            <img src={tenant.linePictureUrl} className="w-7 h-7 rounded-lg object-cover shrink-0" alt="" />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-[#06C755] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {displayName.slice(0, 1)}
            </div>
          )}
          <span className="text-sm font-semibold text-white/90 truncate max-w-[160px]">{displayName}</span>
        </div>
        <button onClick={() => setOpen(true)} className="text-white/70 p-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      {/* モバイル: ドロワー */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-[#1B1F2E] text-white flex flex-col h-full z-10">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            {navContent}
          </aside>
        </div>
      )}

      {/* PC: 固定サイドバー */}
      <aside className="hidden md:flex w-56 min-h-screen bg-[#1B1F2E] text-white flex-col shrink-0">
        {navContent}
      </aside>
    </>
  );
}
