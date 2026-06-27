'use client';
import { useEffect } from 'react';

// ── Fish ──────────────────────────────────────────────
const FN = 10;
const FSEG = 6;
const FMAX_W = 9;
const F_PROFILE = [0.0, 0.38, 0.72, 1.0, 0.93, 0.78, 0.58, 0.36, 0.16, 0.0];
// Module-level: reused every frame to avoid GC (safe — single instance per page)
const FU = Array.from({ length: FN }, () => ({ x: 0, y: 0 })); // upper edge
const FL = Array.from({ length: FN }, () => ({ x: 0, y: 0 })); // lower edge

// ── Balls ─────────────────────────────────────────────
const BALL_N = 5;
const BALL_RGBA = [
  'rgba(91,148,255,0.58)',
  'rgba(141,85,255,0.58)',
  'rgba(212,79,255,0.58)',
  'rgba(255,109,179,0.58)',
  'rgba(19,200,106,0.58)',
];

// ── Ripples ───────────────────────────────────────────
const RIPPLE_RGB = ['21,89,255', '141,85,255', '212,79,255', '255,110,190'];

interface Ball   { x: number; y: number; vx: number; vy: number; r: number; rgba: string; }
interface Ripple { x: number; y: number; r: number; maxR: number; alpha: number; rgb: string; }
interface Basket { x: number; y: number; w: number; h: number; rim: number; }

export default function PageFX() {
  useEffect(() => {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // ── Cached viewport (avoid per-frame reflow) ──────
    let vW = window.innerWidth, vH = window.innerHeight;
    const onResize = () => { vW = window.innerWidth; vH = window.innerHeight; };
    window.addEventListener('resize', onResize, { passive: true });

    // ── Shared input state ────────────────────────────
    let mx = -999, my = -999;
    let gyroX = 0, gyroY = 0.22;
    let scrollFrac = 0;

    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    if (canHover) window.addEventListener('mousemove', onMove, { passive: true });

    const onGyro = (e: DeviceOrientationEvent) => {
      gyroX = ((e.gamma ?? 0) / 90) * 0.45;
      gyroY = Math.max(0.05, (((e.beta ?? 45) - 10) / 90) * 0.5);
    };
    window.addEventListener('deviceorientation', onGyro, { passive: true });

    // ── G: blob bg — scroll only, throttled to ~7fps ──
    const lp = document.querySelector<HTMLElement>('.comiu-lp');
    let blobLast = 0;
    const updateBlob = () => {
      if (!lp) return;
      const now = performance.now();
      if (now - blobLast < 140) return;
      blobLast = now;
      const t = scrollFrac;
      lp.style.setProperty('--g1x', `${(12 + t * 22).toFixed(1)}%`);
      lp.style.setProperty('--g1y', `${(5  + t * 16).toFixed(1)}%`);
      lp.style.setProperty('--g2x', `${(90 - t * 20).toFixed(1)}%`);
      lp.style.setProperty('--g2y', `${(8  + t * 26).toFixed(1)}%`);
      lp.style.setProperty('--g3x', `${(52 + Math.sin(t * Math.PI * 2) * 10).toFixed(1)}%`);
      lp.style.setProperty('--g3y', `${(95 - t * 34).toFixed(1)}%`);
      lp.style.setProperty('--g4x', `${(8  + t * 16).toFixed(1)}%`);
      lp.style.setProperty('--g4y', `${(68 - t * 22).toFixed(1)}%`);
    };
    const onScroll = () => {
      const total = document.body.scrollHeight - vH;
      scrollFrac = total > 0 ? window.scrollY / total : 0;
      updateBlob();
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── E: ripple canvas ──────────────────────────────
    const rc = document.createElement('canvas');
    rc.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9994;';
    document.body.appendChild(rc);
    const rctx = rc.getContext('2d')!;
    rc.width = vW; rc.height = vH;
    const ripples: Ripple[] = [];

    const addRipple = (x: number, y: number) => {
      if (ripples.length >= 8) return; // hard cap
      ripples.push({ x, y, r: 0, maxR: 90 + Math.random() * 90, alpha: 0.55,
        rgb: RIPPLE_RGB[Math.floor(Math.random() * RIPPLE_RGB.length)] });
    };
    const onClickR  = (e: MouseEvent) => addRipple(e.clientX, e.clientY);
    const onTouchR  = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++)
        addRipple(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
    };
    window.addEventListener('click', onClickR);
    window.addEventListener('touchstart', onTouchR, { passive: true });

    // ── F: ball canvas (no mix-blend-mode) ───────────
    const bc = document.createElement('canvas');
    bc.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;';
    document.body.appendChild(bc);
    const bctx = bc.getContext('2d')!;
    bc.width = vW; bc.height = vH;

    const balls: Ball[] = Array.from({ length: BALL_N }, (_, i) => ({
      x: (i + 0.5) * (vW / BALL_N),
      y: 60 + Math.random() * Math.min(vH * 0.35, 280),
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2 - 1,
      r: 11 + Math.random() * 7,
      rgba: BALL_RGBA[i],
    }));

    const basketEl = document.querySelector<HTMLElement>('.hero-basket-target');
    const getBasket = (): Basket | null => {
      if (!canHover || !basketEl) return null;
      const rect = basketEl.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20 || rect.bottom < -40 || rect.top > vH + 40) return null;
      return {
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
        rim: Math.max(12, rect.height * 0.18),
      };
    };

    // ── Fish canvas (desktop only) ────────────────────
    let fc: HTMLCanvasElement | null = null;
    let fctx: CanvasRenderingContext2D | null = null;
    // Per-mount mutable spine (not module-level — stays isolated)
    const fSpine = Array.from({ length: FN }, () => ({ x: -300, y: -300 }));
    let fishGrad: CanvasGradient | null = null;
    let lastGradX0 = -999;

    if (canHover) {
      fc = document.createElement('canvas');
      fc.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998;';
      document.body.appendChild(fc);
      fctx = fc.getContext('2d')!;
      fc.width = vW; fc.height = vH;
    }

    // ── Single unified rAF loop ───────────────────────
    let raf = 0;

    const tick = () => {
      // Resize only when vW/vH changed via onResize
      if (rc.width !== vW || rc.height !== vH) { rc.width = vW; rc.height = vH; }
      if (bc.width !== vW || bc.height !== vH) { bc.width = vW; bc.height = vH; }
      if (fc && fc.width !== vW) { fc.width = vW; fc.height = vH; }

      // ─ E: ripples ─────────────────────────────────
      if (ripples.length > 0) {
        rctx.clearRect(0, 0, vW, vH);
        for (let i = ripples.length - 1; i >= 0; i--) {
          const r = ripples[i];
          r.r    += 4 + (r.r / r.maxR) * 5;
          r.alpha = 0.55 * (1 - r.r / r.maxR);
          if (r.alpha <= 0) { ripples.splice(i, 1); continue; }
          for (let k = 0; k < 3; k++) {
            const kr = r.r - k * 18;
            if (kr <= 0) continue;
            rctx.beginPath();
            rctx.arc(r.x, r.y, kr, 0, Math.PI * 2);
            rctx.strokeStyle = `rgba(${r.rgb},${(r.alpha * (1 - k * 0.3)).toFixed(2)})`;
            rctx.lineWidth = 2 - k * 0.5;
            rctx.stroke();
          }
        }
        if (ripples.length === 0) rctx.clearRect(0, 0, vW, vH);
      }

      // ─ F: balls ───────────────────────────────────
      bctx.clearRect(0, 0, vW, vH);
      const basket = getBasket();
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        b.vx += gyroX;
        b.vy += gyroY;
        if (canHover && mx > 0) {
          const dx = b.x - mx, dy = b.y - my;
          const d  = Math.hypot(dx, dy);
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
        if (b.x < b.r)       { b.x = b.r;       b.vx =  Math.abs(b.vx) * 0.6; }
        if (b.x > vW - b.r)  { b.x = vW - b.r;  b.vx = -Math.abs(b.vx) * 0.6; }
        if (b.y < b.r)       { b.y = b.r;       b.vy =  Math.abs(b.vy) * 0.6; }
        if (b.y > vH - b.r)  { b.y = vH - b.r;  b.vy = -Math.abs(b.vy) * 0.6; }
        if (basket) {
          const innerLeft = basket.x + basket.w * 0.13 + b.r;
          const innerRight = basket.x + basket.w * 0.87 - b.r;
          const innerTop = basket.y + basket.rim * 1.6;
          const innerBottom = basket.y + basket.h - b.r;
          const inBasket =
            b.x > basket.x - b.r &&
            b.x < basket.x + basket.w + b.r &&
            b.y > basket.y - b.r &&
            b.y < basket.y + basket.h + b.r;

          if (inBasket && b.y > innerTop) {
            if (b.x < innerLeft) { b.x = innerLeft; b.vx = Math.abs(b.vx) * 0.52; }
            if (b.x > innerRight) { b.x = innerRight; b.vx = -Math.abs(b.vx) * 0.52; }
            if (b.y > innerBottom) {
              b.y = innerBottom;
              b.vy = -Math.abs(b.vy) * 0.46;
              b.vx *= 0.78;
            }
          }
        }
        // ball-ball collision
        for (let j = i + 1; j < balls.length; j++) {
          const c  = balls[j];
          const dx = c.x - b.x, dy = c.y - b.y;
          const d  = Math.hypot(dx, dy);
          const mn = b.r + c.r;
          if (d < mn && d > 0.01) {
            const nx = dx / d, ny = dy / d;
            const ov = (mn - d) * 0.5;
            b.x -= nx * ov; b.y -= ny * ov;
            c.x += nx * ov; c.y += ny * ov;
            const rel = (b.vx - c.vx) * nx + (b.vy - c.vy) * ny;
            if (rel > 0) {
              b.vx -= rel * nx * 0.65; b.vy -= rel * ny * 0.65;
              c.vx += rel * nx * 0.65; c.vy += rel * ny * 0.65;
            }
          }
        }
        // flat fill — no per-frame gradient object
        bctx.beginPath();
        bctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        bctx.fillStyle = b.rgba;
        bctx.fill();
      }

      // ─ Fish (desktop) ──────────────────────────────
      if (canHover && fctx && fc) {
        fctx.clearRect(0, 0, vW, vH);

        fSpine[0].x += (mx - fSpine[0].x) * 0.14;
        fSpine[0].y += (my - fSpine[0].y) * 0.14;
        for (let i = 1; i < FN; i++) {
          const dx = fSpine[i - 1].x - fSpine[i].x;
          const dy = fSpine[i - 1].y - fSpine[i].y;
          const d  = Math.hypot(dx, dy);
          if (d > FSEG) {
            fSpine[i].x = fSpine[i - 1].x - (dx / d) * FSEG;
            fSpine[i].y = fSpine[i - 1].y - (dy / d) * FSEG;
          }
        }

        if (mx > -100) {
          // Build edge points into pre-allocated arrays
          for (let i = 0; i < FN; i++) {
            const prev = fSpine[Math.max(0, i - 1)];
            const next = fSpine[Math.min(FN - 1, i + 1)];
            const ang  = Math.atan2(next.y - prev.y, next.x - prev.x);
            const perp = ang + Math.PI / 2;
            const w    = F_PROFILE[i] * FMAX_W;
            FU[i].x = fSpine[i].x + Math.cos(perp) * w;
            FU[i].y = fSpine[i].y + Math.sin(perp) * w;
            FL[i].x = fSpine[i].x - Math.cos(perp) * w;
            FL[i].y = fSpine[i].y - Math.sin(perp) * w;
          }

          const now     = Date.now() * 0.004;
          const tail    = fSpine[FN - 1];
          const tailAng = Math.atan2(tail.y - fSpine[FN - 2].y, tail.x - fSpine[FN - 2].x);

          // Tail fins
          for (const s of [-1, 1]) {
            const wag = tailAng + s * (0.88 + Math.sin(now + s * 0.9) * 0.32);
            fctx.beginPath();
            fctx.moveTo(tail.x, tail.y);
            fctx.bezierCurveTo(
              tail.x + Math.cos(tailAng) * 7 + Math.cos(wag) * 5,
              tail.y + Math.sin(tailAng) * 7 + Math.sin(wag) * 5,
              tail.x + Math.cos(wag) * 17, tail.y + Math.sin(wag) * 17,
              tail.x + Math.cos(tailAng) * 2 + Math.cos(wag) * 20,
              tail.y + Math.sin(tailAng) * 2 + Math.sin(wag) * 20,
            );
            fctx.fillStyle = 'rgba(255,108,36,0.72)';
            fctx.fill();
          }

          // Body (smooth quadratic spline)
          fctx.beginPath();
          fctx.moveTo(FU[0].x, FU[0].y);
          for (let i = 1; i < FN; i++)
            fctx.quadraticCurveTo(FU[i-1].x, FU[i-1].y, (FU[i-1].x+FU[i].x)/2, (FU[i-1].y+FU[i].y)/2);
          fctx.quadraticCurveTo(FU[FN-1].x, FU[FN-1].y, FL[FN-1].x, FL[FN-1].y);
          for (let i = FN - 1; i >= 1; i--)
            fctx.quadraticCurveTo(FL[i].x, FL[i].y, (FL[i].x+FL[i-1].x)/2, (FL[i].y+FL[i-1].y)/2);
          fctx.closePath();

          // Gradient cache: recreate only when head moved > 5px
          if (Math.abs(fSpine[0].x - lastGradX0) > 5) {
            fishGrad = fctx.createLinearGradient(
              fSpine[0].x, fSpine[0].y, fSpine[FN-1].x, fSpine[FN-1].y,
            );
            fishGrad.addColorStop(0,    '#ffb347');
            fishGrad.addColorStop(0.45, '#ff7030');
            fishGrad.addColorStop(1,    '#ff9040');
            lastGradX0 = fSpine[0].x;
          }
          fctx.fillStyle = fishGrad!;
          fctx.fill();
          fctx.strokeStyle = 'rgba(180,52,0,0.18)';
          fctx.lineWidth = 0.8;
          fctx.stroke();

          // Dorsal fin
          fctx.beginPath();
          fctx.moveTo(FU[2].x, FU[2].y);
          fctx.quadraticCurveTo(
            FU[3].x + (FU[3].x - fSpine[3].x) * 0.75,
            FU[3].y + (FU[3].y - fSpine[3].y) * 0.75,
            FU[4].x, FU[4].y,
          );
          fctx.fillStyle = 'rgba(255,135,28,0.52)';
          fctx.fill();

          // Eye
          fctx.beginPath();
          fctx.arc(fSpine[1].x, fSpine[1].y, 2.5, 0, Math.PI * 2);
          fctx.fillStyle = '#1c0800';
          fctx.fill();
          fctx.beginPath();
          fctx.arc(fSpine[1].x - 0.6, fSpine[1].y - 0.7, 0.8, 0, Math.PI * 2);
          fctx.fillStyle = 'rgba(255,255,255,0.9)';
          fctx.fill();
        }
      }

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      if (canHover) window.removeEventListener('mousemove', onMove);
      window.removeEventListener('deviceorientation', onGyro);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('click', onClickR);
      window.removeEventListener('touchstart', onTouchR);
      rc.remove();
      bc.remove();
      fc?.remove();
    };
  }, []);

  return null;
}
