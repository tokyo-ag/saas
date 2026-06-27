'use client';
import { useEffect } from 'react';

const N = 10;    // spine points
const SEG = 6;   // px between points  → total fish ~60px
const MAX_W = 9; // body half-width at widest (px)

// Body width profile: [head tip … tail tip]
const PROFILE = [0.0, 0.38, 0.72, 1.0, 0.93, 0.78, 0.58, 0.36, 0.16, 0.0];

export default function GoldfishCursor() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    // Spine: spine[0] = head (near mouse), spine[N-1] = tail
    const spine = Array.from({ length: N }, () => ({ x: -300, y: -300 }));
    let tx = -300, ty = -300;

    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    window.addEventListener('mousemove', onMove, { passive: true });

    let raf = 0;

    const tick = () => {
      const W = window.innerWidth, H = window.innerHeight;
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      ctx.clearRect(0, 0, W, H);

      // Head spring-follows mouse
      spine[0].x += (tx - spine[0].x) * 0.14;
      spine[0].y += (ty - spine[0].y) * 0.14;

      // Each point drags the next (inextensible chain)
      for (let i = 1; i < N; i++) {
        const dx = spine[i - 1].x - spine[i].x;
        const dy = spine[i - 1].y - spine[i].y;
        const d = Math.hypot(dx, dy);
        if (d > SEG) {
          spine[i].x = spine[i - 1].x - (dx / d) * SEG;
          spine[i].y = spine[i - 1].y - (dy / d) * SEG;
        }
      }

      // Don't render until fish enters screen
      if (tx < -100) { raf = requestAnimationFrame(tick); return; }

      // ── Build upper/lower edge points ─────────────
      const upper: { x: number; y: number }[] = [];
      const lower: { x: number; y: number }[] = [];

      for (let i = 0; i < N; i++) {
        const prev = spine[Math.max(0, i - 1)];
        const next = spine[Math.min(N - 1, i + 1)];
        const ang  = Math.atan2(next.y - prev.y, next.x - prev.x);
        const perp = ang + Math.PI / 2;
        const w = PROFILE[i] * MAX_W;
        upper.push({ x: spine[i].x + Math.cos(perp) * w, y: spine[i].y + Math.sin(perp) * w });
        lower.push({ x: spine[i].x - Math.cos(perp) * w, y: spine[i].y - Math.sin(perp) * w });
      }

      const now = Date.now() * 0.004;
      const tail = spine[N - 1];
      const tailAng = Math.atan2(tail.y - spine[N - 2].y, tail.x - spine[N - 2].x);

      // ── Tail fins (two lobes, idle wag) ──────────
      for (const s of [-1, 1]) {
        const wag = tailAng + s * (0.88 + Math.sin(now + s * 0.9) * 0.32);
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.bezierCurveTo(
          tail.x + Math.cos(tailAng) * 7 + Math.cos(wag) * 5,
          tail.y + Math.sin(tailAng) * 7 + Math.sin(wag) * 5,
          tail.x + Math.cos(wag) * 17,
          tail.y + Math.sin(wag) * 17,
          tail.x + Math.cos(tailAng) * 2 + Math.cos(wag) * 20,
          tail.y + Math.sin(tailAng) * 2 + Math.sin(wag) * 20,
        );
        ctx.fillStyle = 'rgba(255,108,36,0.72)';
        ctx.fill();
      }

      // ── Body (smooth quadratic bezier spine) ──────
      ctx.beginPath();
      ctx.moveTo(upper[0].x, upper[0].y);
      for (let i = 1; i < N; i++) {
        const mx = (upper[i - 1].x + upper[i].x) / 2;
        const my = (upper[i - 1].y + upper[i].y) / 2;
        ctx.quadraticCurveTo(upper[i - 1].x, upper[i - 1].y, mx, my);
      }
      ctx.quadraticCurveTo(upper[N - 1].x, upper[N - 1].y, lower[N - 1].x, lower[N - 1].y);
      for (let i = N - 1; i >= 1; i--) {
        const mx = (lower[i].x + lower[i - 1].x) / 2;
        const my = (lower[i].y + lower[i - 1].y) / 2;
        ctx.quadraticCurveTo(lower[i].x, lower[i].y, mx, my);
      }
      ctx.closePath();

      const bodyGrad = ctx.createLinearGradient(
        spine[0].x, spine[0].y, spine[N - 1].x, spine[N - 1].y,
      );
      bodyGrad.addColorStop(0,    '#ffb347');
      bodyGrad.addColorStop(0.45, '#ff7030');
      bodyGrad.addColorStop(1,    '#ff9040');
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(180,52,0,0.2)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // ── Dorsal fin ────────────────────────────────
      ctx.beginPath();
      ctx.moveTo(upper[2].x, upper[2].y);
      ctx.quadraticCurveTo(
        upper[3].x + (upper[3].x - spine[3].x) * 0.75,
        upper[3].y + (upper[3].y - spine[3].y) * 0.75,
        upper[4].x, upper[4].y,
      );
      ctx.fillStyle = 'rgba(255,135,28,0.52)';
      ctx.fill();

      // ── Eye ───────────────────────────────────────
      ctx.beginPath();
      ctx.arc(spine[1].x, spine[1].y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1c0800';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(spine[1].x - 0.6, spine[1].y - 0.7, 0.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      canvas.remove();
    };
  }, []);

  return null;
}
