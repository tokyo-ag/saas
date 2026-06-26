'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/* ─────────────────────────────────────────────
   ① Parallax + ① Gravity lens
   マウス座標を CSS 変数に流す
───────────────────────────────────────────── */
function useMouseTracking() {
  useEffect(() => {
    let frame = 0;
    function onMove(e: MouseEvent) {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const mx = e.clientX / window.innerWidth - 0.5;
        const my = e.clientY / window.innerHeight - 0.5;
        // parallax
        document.documentElement.style.setProperty('--px', mx.toFixed(3));
        document.documentElement.style.setProperty('--py', my.toFixed(3));
        // gravity lens — distance from orb center (62% 46%)
        const cx = window.innerWidth * 0.62;
        const cy = window.innerHeight * 0.46;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxR = Math.min(window.innerWidth, window.innerHeight) * 0.38;
        const s = Math.max(0, 1 - dist / maxR) * 28;
        const angle = Math.atan2(dy, dx);
        document.documentElement.style.setProperty('--lx', (Math.cos(angle) * s).toFixed(1));
        document.documentElement.style.setProperty('--ly', (Math.sin(angle) * s).toFixed(1));
        frame = 0;
      });
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(frame); };
  }, []);
}

/* ─────────────────────────────────────────────
   ③ テキスト粒子 — スクランブル → 本物の文字
───────────────────────────────────────────── */
function useTextScramble() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-warp-headline]');
    if (!el) return;
    const original = el.innerText;
    const pool = 'アイウエオカキクケコタチツテトサシスセソABCDEF012345';
    let iter = 0;
    const iv = setInterval(() => {
      el.innerText = original.split('').map((ch, i) => {
        if (i < iter || ch === '、' || ch === '。' || ch === '\n' || ch === '　') return ch;
        return pool[Math.floor(Math.random() * pool.length)];
      }).join('');
      iter += 0.7;
      if (iter > original.length) clearInterval(iv);
    }, 38);
    return () => clearInterval(iv);
  }, []);
}

/* ─────────────────────────────────────────────
   ② ワープ速度 CTA — イベント委譲で [data-warp-cta] を捕捉
───────────────────────────────────────────── */
function useWarpCTA() {
  const router = useRouter();
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const btn = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-warp-cta]');
      if (!btn) return;
      e.preventDefault();
      const href = btn.getAttribute('href') ?? '/register';
      document.querySelector('.warp-page')?.classList.add('is-warping');
      const flash = document.createElement('div');
      flash.className = 'warp-speed-flash';
      document.body.appendChild(flash);
      setTimeout(() => router.push(href), 950);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [router]);
}

/* ─────────────────────────────────────────────
   メインコンポーネント
───────────────────────────────────────────── */
export default function WarpGimmicks() {
  useMouseTracking();
  useTextScramble();
  useWarpCTA();
  return null;
}
