'use client';

import { useEffect, useState } from 'react';

export default function BottomCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 300);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-slate-200/60 bg-white/80 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] backdrop-blur-xl transition-transform duration-300 md:hidden ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <span className="text-xs font-bold tracking-tight text-slate-900">次世代の団体運営を。</span>
      <a href="#cta" className="rounded-full bg-slate-950 px-6 py-2.5 text-xs font-bold text-white shadow-sm">
        今すぐ無料登録
      </a>
    </div>
  );
}
