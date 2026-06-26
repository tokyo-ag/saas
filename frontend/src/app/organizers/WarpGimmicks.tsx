'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
   ⑤ COMIU サウンド — Web Audio API 宇宙アンビエント
───────────────────────────────────────────── */
function useComiuSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const [on, setOn] = useState(false);

  function start() {
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    // ─ 低音ドローン
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 48;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.055;

    // ─ 高調波
    const harm = ctx.createOscillator();
    harm.type = 'sine';
    harm.frequency.value = 96;
    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.028;

    // ─ パッドシンセ（揺らぎ）
    const pad = ctx.createOscillator();
    pad.type = 'triangle';
    pad.frequency.value = 192;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.018;

    // ─ LFO でドローンを揺らす
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 6;
    lfo.connect(lfoGain).connect(drone.frequency);
    lfo.start();

    // ─ analyser
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 32;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5);

    drone.connect(droneGain);
    harm.connect(harmGain);
    pad.connect(padGain);
    [droneGain, harmGain, padGain].forEach(g => g.connect(analyser).connect(master));
    master.connect(ctx.destination);
    drone.start(); harm.start(); pad.start();

    const data = new Uint8Array(analyser.frequencyBinCount);
    function tick() {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const pulse = (avg / 255).toFixed(3);
      document.documentElement.style.setProperty('--sp', pulse);
      rafRef.current = requestAnimationFrame(tick);
    }
    tick();
  }

  function stop() {
    cancelAnimationFrame(rafRef.current);
    if (ctxRef.current) {
      const master = ctxRef.current.createGain();
      master.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 1.2);
      ctxRef.current.close();
      ctxRef.current = null;
    }
    document.documentElement.style.setProperty('--sp', '0');
  }

  const toggle = useCallback(() => {
    setOn(v => {
      if (v) stop(); else start();
      return !v;
    });
  }, []);

  return { on, toggle };
}

/* ─────────────────────────────────────────────
   メインコンポーネント
───────────────────────────────────────────── */
export default function WarpGimmicks() {
  useMouseTracking();
  useTextScramble();
  useWarpCTA();
  const { on, toggle } = useComiuSound();

  return (
    <button
      onClick={toggle}
      className={`warp-sound-btn ${on ? 'is-on' : ''}`}
      aria-label="COMIU ambient sound"
    >
      <span className="warp-sound-bars">
        {[1, 2, 3, 4].map(i => <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />)}
      </span>
      {on ? 'SOUND ON' : 'SOUND'}
    </button>
  );
}
