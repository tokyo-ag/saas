'use client';

import { useEffect, useRef } from 'react';

const LETTERS = [
  { id: 'C', ch: 'C', hx: 13, hy: 50 },
  { id: 'O', ch: 'O', hx: 30, hy: 50 },
  { id: 'M', ch: 'M', hx: 50, hy: 50 },
  { id: 'I', ch: 'I', hx: 69, hy: 50 },
  { id: 'U', ch: 'U', hx: 86, hy: 50 },
];

type State = typeof LETTERS[number] & { x: number; y: number; vx: number; vy: number };

export default function HeroGimmick() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<State[]>(
    LETTERS.map(l => ({ ...l, x: l.hx, y: l.hy, vx: 0, vy: 0 }))
  );
  const ptrRef = useRef({ x: -999, y: -999, active: false });
  const rafRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const setPtr = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      ptrRef.current = {
        x: ((cx - r.left) / r.width) * 100,
        y: ((cy - r.top) / r.height) * 100,
        active: true,
      };
    };

    const onPointerMove = (e: PointerEvent) => setPtr(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => setPtr(e.touches[0].clientX, e.touches[0].clientY);
    const onLeave = () => { ptrRef.current.active = false; };
    const onOrientation = (e: DeviceOrientationEvent) => {
      const g = Math.min(Math.max(e.gamma ?? 0, -40), 40) / 40;
      const b = Math.min(Math.max((e.beta ?? 45) - 45, -40), 40) / 40;
      ptrRef.current = { x: 50 + g * 38, y: 50 + b * 38, active: true };
    };

    el.addEventListener('pointermove', onPointerMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('deviceorientation', onOrientation, { passive: true });

    let t = 0;
    function frame() {
      t += 0.016;
      const { x: px, y: py, active } = ptrRef.current;

      stateRef.current.forEach((s, i) => {
        const fx = Math.sin(t * 0.55 + i * 1.3) * 1.6;
        const fy = Math.cos(t * 0.65 + i * 0.95) * 2.2;

        s.vx += (s.hx + fx - s.x) * 0.048;
        s.vy += (s.hy + fy - s.y) * 0.048;

        if (active) {
          const dx = s.x - px;
          const dy = s.y - py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const R = 30;
          if (dist < R && dist > 0.01) {
            const f = ((R - dist) / R) ** 1.5 * 11;
            s.vx += (dx / dist) * f;
            s.vy += (dy / dist) * f;
          }
        }

        s.vx *= 0.77;
        s.vy *= 0.77;
        s.x = Math.min(Math.max(s.x + s.vx, 3), 95);
        s.y = Math.min(Math.max(s.y + s.vy, 8), 90);

        const letterEl = el?.querySelector<HTMLElement>(`[data-letter="${s.id}"]`);
        letterEl?.style.setProperty('--lx', `${s.x}%`);
        letterEl?.style.setProperty('--ly', `${s.y}%`);
      });

      rafRef.current = requestAnimationFrame(frame);
    }
    frame();

    return () => {
      cancelAnimationFrame(rafRef.current);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('deviceorientation', onOrientation);
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        .hero-gimmick {
          position: relative;
          width: 100%;
          min-height: 480px;
          border-radius: 32px;
          overflow: hidden;
          background:
            radial-gradient(circle at 30% 42%, rgba(21,89,255,0.07), transparent 52%),
            radial-gradient(circle at 72% 60%, rgba(141,85,255,0.08), transparent 48%),
            rgba(245,248,255,0.5);
          border: 1px solid rgba(200,214,255,0.3);
          touch-action: none;
        }

        .mag-letter {
          position: absolute;
          left: var(--lx, 50%);
          top:  var(--ly, 50%);
          transform: translate(-50%, -50%);
          font-size: clamp(76px, 13vw, 128px);
          font-weight: 950;
          letter-spacing: -0.06em;
          line-height: 1;
          pointer-events: none;
          user-select: none;
          will-change: left, top;
          background: linear-gradient(145deg, #1559ff 0%, #8d55ff 100%);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          filter: drop-shadow(0 4px 22px rgba(80,80,255,0.18));
        }

        .gimmick-hint {
          position: absolute;
          bottom: 14px;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
          color: rgba(100,120,200,0.26);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
          white-space: nowrap;
        }

        @media (max-width: 1180px) {
          .hero-gimmick { min-height: 380px; }
        }

        @media (max-width: 640px) {
          .hero-gimmick { min-height: 260px; border-radius: 24px; }
        }
      `}</style>

      <div ref={containerRef} className="hero-gimmick" aria-label="COMIU" aria-hidden="true">
        <span className="gimmick-hint">PUSH AWAY</span>
        {LETTERS.map(l => (
          <span key={l.id} data-letter={l.id} className="mag-letter">
            {l.ch}
          </span>
        ))}
      </div>
    </>
  );
}
