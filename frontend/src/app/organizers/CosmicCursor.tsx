'use client';

import { useEffect, useRef } from 'react';

type TrailPoint = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  size: number;
  speed: number;
};

export default function CosmicCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const trail: TrailPoint[] = [];
    let mx = -300;
    let my = -300;
    let pmx = -300;
    let pmy = -300;
    let raf = 0;

    function onResize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    }

    function onMove(e: PointerEvent) {
      pmx = mx; pmy = my;
      mx = e.clientX; my = e.clientY;
      const vx = mx - pmx;
      const vy = my - pmy;
      const speed = Math.sqrt(vx * vx + vy * vy);

      // 速度に応じてスポーンするパーティクル数
      const count = Math.min(Math.floor(speed * 0.6) + 1, 8);
      for (let i = 0; i < count; i++) {
        trail.push({
          x: mx + (Math.random() - 0.5) * 4,
          y: my + (Math.random() - 0.5) * 4,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2 - 0.4,
          age: 0,
          maxAge: 28 + Math.random() * 28,
          size: 2 + Math.random() * (speed * 0.08 + 1.5),
          speed,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.age++;

        const progress = p.age / p.maxAge;
        const alpha = (1 - progress) * (1 - progress);
        const r = p.size * (1 - progress * 0.5);

        // 速度で色を変える: 遅い→青、速い→白/シアン
        const t = Math.min(p.speed / 25, 1);
        // slow: rgba(60, 140, 255, a)  fast: rgba(220, 240, 255, a)
        const red   = Math.round(60  + t * 160);
        const green = Math.round(140 + t * 100);
        const blue  = 255;

        // グロー（大きいボカし）
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.5);
        grd.addColorStop(0, `rgba(${red},${green},${blue},${alpha * 0.5})`);
        grd.addColorStop(1, `rgba(${red},${green},${blue},0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // コア（明るい中心）
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${red},${green},${blue},${alpha * 0.85})`;
        ctx.fill();

        if (p.age >= p.maxAge) trail.splice(i, 1);
      }

      raf = requestAnimationFrame(draw);
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('resize', onResize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      aria-hidden="true"
    />
  );
}
