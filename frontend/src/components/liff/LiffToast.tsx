'use client';

import { useEffect, useState } from 'react';

export function LiffToast({ show, message }: { show: boolean; message: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className={`fixed top-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ${
        show ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
    >
      <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-lg ring-1 ring-black/5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06C755" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-xs font-bold text-gray-700">{message}</span>
      </div>
    </div>
  );
}
