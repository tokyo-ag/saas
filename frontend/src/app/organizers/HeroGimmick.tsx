'use client';

import { useEffect, useRef } from 'react';

const CARDS = [
  { id: '1', label: '+12件',  sub: '新規予約',    hx: 50, hy: 14, color: 'blue'   },
  { id: '2', label: 'LINE',   sub: 'リマインド送信済み', hx: 80, hy: 40, color: 'green'  },
  { id: '3', label: '8名',    sub: '残り枠あり',   hx: 16, hy: 50, color: 'purple' },
  { id: '4', label: '¥1,500', sub: '事前決済完了', hx: 62, hy: 78, color: 'pink'   },
  { id: '5', label: '2,842',  sub: '今月の閲覧数', hx: 26, hy: 20, color: 'blue'   },
  { id: '6', label: '38名',   sub: '参加者名簿',   hx: 76, hy: 70, color: 'purple' },
];

export default function HeroGimmick() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(
    CARDS.map((c, i) => ({ ...c, x: c.hx, y: c.hy, vx: 0, vy: 0, phase: i * 1.05 }))
  );
  const ptrRef = useRef({ x: -999, y: -999, active: false });
  const rafRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ptrRef.current = {
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
        active: true,
      };
    };
    const onPointerLeave = () => { ptrRef.current.active = false; };

    // Gyroscope for mobile (no permission required on Android; iOS 13+ requires user gesture)
    const onOrientation = (e: DeviceOrientationEvent) => {
      const g = Math.min(Math.max(e.gamma ?? 0, -30), 30) / 30;
      const b = Math.min(Math.max((e.beta ?? 45) - 45, -30), 30) / 30;
      ptrRef.current = { x: 50 + g * 28, y: 50 + b * 28, active: true };
    };

    el.addEventListener('pointermove', onPointerMove, { passive: true });
    el.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('deviceorientation', onOrientation, { passive: true });

    let t = 0;
    function frame() {
      t += 0.016;
      const { x: px, y: py, active } = ptrRef.current;
      const cards = stateRef.current;

      cards.forEach((c) => {
        // Gentle floating wave offset
        const floatY = Math.sin(t * 0.85 + c.phase) * 3.5;
        const homeX = c.hx;
        const homeY = c.hy + floatY;

        // Spring pull toward (animated) home
        c.vx += (homeX - c.x) * 0.055;
        c.vy += (homeY - c.y) * 0.055;

        // Repel from pointer/touch
        if (active) {
          const dx = c.x - px;
          const dy = c.y - py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const R = 22;
          if (dist < R && dist > 0.01) {
            const f = ((R - dist) / R) ** 1.6 * 6;
            c.vx += (dx / dist) * f;
            c.vy += (dy / dist) * f;
          }
        }

        // Damping
        c.vx *= 0.80;
        c.vy *= 0.80;
        c.x += c.vx;
        c.y += c.vy;

        // Clamp inside container
        c.x = Math.min(Math.max(c.x, 5), 95);
        c.y = Math.min(Math.max(c.y, 5), 95);

        const cardEl = el?.querySelector<HTMLElement>(`[data-card="${c.id}"]`);
        if (cardEl) {
          cardEl.style.left = `${c.x}%`;
          cardEl.style.top  = `${c.y}%`;
        }
      });

      rafRef.current = requestAnimationFrame(frame);
    }

    frame();

    return () => {
      cancelAnimationFrame(rafRef.current);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('deviceorientation', onOrientation);
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        .hero-gimmick {
          position: relative;
          width: 100%;
          min-height: 500px;
          border-radius: 32px;
          background:
            radial-gradient(circle at 30% 38%, rgba(21, 89, 255, 0.08), transparent 52%),
            radial-gradient(circle at 74% 64%, rgba(141, 85, 255, 0.08), transparent 50%),
            rgba(245, 248, 255, 0.55);
          border: 1px solid rgba(200, 214, 255, 0.32);
          overflow: hidden;
          touch-action: none;
        }

        .gimmick-hint {
          position: absolute;
          bottom: 18px;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
          color: rgba(100, 120, 200, 0.3);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.14em;
          white-space: nowrap;
        }

        .gc {
          position: absolute;
          transform: translate(-50%, -50%);
          padding: 13px 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(215, 226, 255, 0.75);
          box-shadow:
            0 12px 32px rgba(35, 61, 145, 0.12),
            0 2px 6px rgba(0, 0, 0, 0.04);
          backdrop-filter: blur(14px);
          pointer-events: none;
          user-select: none;
          white-space: nowrap;
          will-change: left, top;
        }

        .gc b {
          display: block;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.05em;
          line-height: 1.1;
        }

        .gc small {
          display: block;
          font-size: 11px;
          font-weight: 760;
          color: #66708f;
          margin-top: 3px;
        }

        .gc-blue   b { color: #1559ff; }
        .gc-green  b { color: #0fba60; }
        .gc-purple b { color: #8d55ff; }
        .gc-pink   b { color: #e2498c; }

        @media (max-width: 1180px) {
          .hero-gimmick { min-height: 400px; }
        }

        @media (max-width: 640px) {
          .hero-gimmick { min-height: 300px; border-radius: 24px; }
          .gc { padding: 10px 14px; }
          .gc b { font-size: 18px; }
        }
      `}</style>

      <div ref={containerRef} className="hero-gimmick" aria-hidden="true">
        <span className="gimmick-hint">TOUCH TO INTERACT</span>
        {CARDS.map((c) => (
          <div
            key={c.id}
            data-card={c.id}
            className={`gc gc-${c.color}`}
            style={{ left: `${c.hx}%`, top: `${c.hy}%` }}
          >
            <b>{c.label}</b>
            <small>{c.sub}</small>
          </div>
        ))}
      </div>
    </>
  );
}
