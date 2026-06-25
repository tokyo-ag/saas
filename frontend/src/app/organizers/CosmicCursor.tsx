'use client';

import { useEffect, useRef } from 'react';

export default function CosmicCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (!finePointer) return;
    let frame = 0;
    let x = -120;
    let y = -120;

    function render() {
      frame = 0;
      if (!cursorRef.current) return;
      cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    function move(event: PointerEvent) {
      x = event.clientX;
      y = event.clientY;
      cursorRef.current?.classList.add('is-active');
      if (!frame) frame = requestAnimationFrame(render);
    }

    function leave() {
      cursorRef.current?.classList.remove('is-active');
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerleave', leave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="cosmic-cursor"
      style={{ transform: 'translate3d(-120px, -120px, 0)' }}
      aria-hidden="true"
    >
      <span />
    </div>
  );
}
