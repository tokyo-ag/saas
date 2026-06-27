'use client';

import { useEffect, useState } from 'react';

export default function BottomCTA() {
  const [visible, setVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      const active = document.activeElement;
      const typing =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement;

      setVisible(window.scrollY > 420 && !ctaVisible && !typing);
    }

    const cta = document.querySelector('#cta');
    const observer = cta
      ? new IntersectionObserver(
          ([entry]) => {
            setCtaVisible(entry.isIntersecting);
          },
          { threshold: 0.12 },
        )
      : null;

    if (cta && observer) observer.observe(cta);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('focusin', onScroll);
    window.addEventListener('focusout', onScroll);
    onScroll();

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('focusin', onScroll);
      window.removeEventListener('focusout', onScroll);
    };
  }, [ctaVisible]);

  return (
    <div
      className={`fixed bottom-3 left-3 right-3 z-50 flex items-center justify-between gap-3 rounded-full border border-white/80 bg-white/90 px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-transform duration-300 md:hidden ${
        visible ? 'translate-y-0' : 'translate-y-24'
      }`}
    >
      <span className="text-xs font-black text-slate-900">無料で団体ページを作る</span>
      <a href="#cta" className="flex min-h-11 items-center rounded-full bg-slate-950 px-5 text-xs font-black text-white shadow-sm">
        作成する
      </a>
    </div>
  );
}
