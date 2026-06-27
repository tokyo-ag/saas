'use client';
import { useEffect } from 'react';

const BALL_COLORS = ['#5b94ff', '#8d55ff', '#d44fff', '#ff6db3', '#13c86a', '#1559ff'];
const RIPPLE_COLORS = ['21,89,255', '141,85,255', '212,79,255', '255,110,190'];

interface Ball { x: number; y: number; vx: number; vy: number; r: number; color: string; }
interface Ripple { x: number; y: number; r: number; maxR: number; alpha: number; color: string; }

export default function PageGimmicks() {
  useEffect(() => {
    let mx = -999, my = -999;
    let gyroX = 0, gyroY = 0.22;
    let scrollFrac = 0;

    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener('mousemove', onMove, { passive: true });

    const onGyro = (e: DeviceOrientationEvent) => {
      gyroX = ((e.gamma ?? 0) / 90) * 0.45;
      gyroY = Math.max(0.05, (((e.beta ?? 45) - 10) / 90) * 0.5);
    };
    window.addEventListener('deviceorientation', onGyro, { passive: true });

    const onScroll = () => {
      const total = document.body.scrollHeight - window.innerHeight;
      scrollFrac = total > 0 ? window.scrollY / total : 0;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── G: blob bg ────────────────────────────────
    const lp = document.querySelector<HTMLElement>('.comiu-lp');

    // ── E: ripple canvas ──────────────────────────
    const rc = document.createElement('canvas');
    rc.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9994;';
    document.body.appendChild(rc);
    const rctx = rc.getContext('2d')!;
    const ripples: Ripple[] = [];

    const addRipple = (x: number, y: number) => {
      ripples.push({
        x, y, r: 0,
        maxR: 90 + Math.random() * 90,
        alpha: 0.55,
        color: RIPPLE_COLORS[Math.floor(Math.random() * RIPPLE_COLORS.length)],
      });
    };
    const onClickR = (e: MouseEvent) => addRipple(e.clientX, e.clientY);
    const onTouchR = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++)
        addRipple(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
    };
    window.addEventListener('click', onClickR);
    window.addEventListener('touchstart', onTouchR, { passive: true });

    // ── F: ball canvas (mix-blend-mode:multiply) ──
    const bc = document.createElement('canvas');
    bc.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;mix-blend-mode:multiply;';
    document.body.appendChild(bc);
    const bctx = bc.getContext('2d')!;

    const W0 = window.innerWidth, H0 = window.innerHeight;
    const balls: Ball[] = Array.from({ length: 6 }, (_, i) => ({
      x: (i + 0.5) * (W0 / 6),
      y: 60 + Math.random() * Math.min(H0 * 0.35, 280),
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2 - 1,
      r: 13 + Math.random() * 9,
      color: BALL_COLORS[i],
    }));

    // ── unified rAF ───────────────────────────────
    let raf = 0;

    const tick = () => {
      const W = window.innerWidth, H = window.innerHeight;
      if (rc.width !== W || rc.height !== H) { rc.width = W; rc.height = H; }
      if (bc.width !== W || bc.height !== H) { bc.width = W; bc.height = H; }

      // G: gradient blob anchors
      if (lp) {
        const ox = mx > 0 ? (mx / W - 0.5) * 10 : 0;
        const oy = my > 0 ? (my / H - 0.5) * 6 : 0;
        const t = scrollFrac;
        lp.style.setProperty('--g1x', `${12 + t * 20 + ox}%`);
        lp.style.setProperty('--g1y', `${5  + t * 14 + oy}%`);
        lp.style.setProperty('--g2x', `${90 - t * 18 + ox * 0.5}%`);
        lp.style.setProperty('--g2y', `${8  + t * 24}%`);
        lp.style.setProperty('--g3x', `${52 + Math.sin(t * Math.PI * 2) * 10 + ox * 0.3}%`);
        lp.style.setProperty('--g3y', `${95 - t * 32}%`);
        lp.style.setProperty('--g4x', `${8  + t * 14}%`);
        lp.style.setProperty('--g4y', `${68 - t * 20 + oy * 0.4}%`);
      }

      // E: ripples
      rctx.clearRect(0, 0, W, H);
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += 4 + (r.r / r.maxR) * 5;
        r.alpha = 0.55 * (1 - r.r / r.maxR);
        if (r.alpha <= 0) { ripples.splice(i, 1); continue; }
        for (let k = 0; k < 3; k++) {
          const kr = r.r - k * 18;
          if (kr <= 0) continue;
          rctx.beginPath();
          rctx.arc(r.x, r.y, kr, 0, Math.PI * 2);
          rctx.strokeStyle = `rgba(${r.color},${r.alpha * (1 - k * 0.3)})`;
          rctx.lineWidth = 2 - k * 0.5;
          rctx.stroke();
        }
      }

      // F: balls — physics
      bctx.clearRect(0, 0, W, H);
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];

        // gravity (gyro on mobile, fixed on desktop)
        b.vx += gyroX;
        b.vy += gyroY;

        // mouse repulsion
        if (mx > 0) {
          const dx = b.x - mx, dy = b.y - my;
          const d = Math.hypot(dx, dy);
          if (d < 100 && d > 0.01) {
            const f = ((100 - d) / 100) ** 2 * 3.5;
            b.vx += (dx / d) * f;
            b.vy += (dy / d) * f;
          }
        }

        b.vx *= 0.978; b.vy *= 0.978;
        const spd = Math.hypot(b.vx, b.vy);
        if (spd > 14) { b.vx = b.vx / spd * 14; b.vy = b.vy / spd * 14; }

        b.x += b.vx; b.y += b.vy;
        if (b.x < b.r)     { b.x = b.r;     b.vx =  Math.abs(b.vx) * 0.6; }
        if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.6; }
        if (b.y < b.r)     { b.y = b.r;     b.vy =  Math.abs(b.vy) * 0.6; }
        if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy) * 0.6; }

        // ball-ball collision
        for (let j = i + 1; j < balls.length; j++) {
          const c = balls[j];
          const dx = c.x - b.x, dy = c.y - b.y;
          const d = Math.hypot(dx, dy);
          const min = b.r + c.r;
          if (d < min && d > 0.01) {
            const nx = dx / d, ny = dy / d;
            const ov = (min - d) * 0.5;
            b.x -= nx * ov; b.y -= ny * ov;
            c.x += nx * ov; c.y += ny * ov;
            const rel = (b.vx - c.vx) * nx + (b.vy - c.vy) * ny;
            if (rel > 0) {
              b.vx -= rel * nx * 0.65; b.vy -= rel * ny * 0.65;
              c.vx += rel * nx * 0.65; c.vy += rel * ny * 0.65;
            }
          }
        }

        // draw — radial gradient for 3D look
        const g = bctx.createRadialGradient(
          b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.05,
          b.x, b.y, b.r,
        );
        g.addColorStop(0, b.color + 'ff');
        g.addColorStop(0.55, b.color + 'ee');
        g.addColorStop(1, b.color + '55');
        bctx.beginPath();
        bctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        bctx.fillStyle = g;
        bctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('deviceorientation', onGyro);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('click', onClickR);
      window.removeEventListener('touchstart', onTouchR);
      rc.remove();
      bc.remove();
    };
  }, []);

  return null;
}
