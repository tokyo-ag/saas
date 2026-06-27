'use client';

import { useEffect, useRef } from 'react';

export default function CosmicCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reducedMotion) return;

    const cursorEl = cursorRef.current!;
    const labelEl = labelRef.current!;
    if (!cursorEl || !labelEl) return;

    function onMove(event: PointerEvent) {
      cursorEl.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      cursorEl.classList.add('is-active');

      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-cursor]') : null;
      const text = target?.dataset.cursor ?? '';
      labelEl.textContent = text;
      cursorEl.classList.toggle('has-label', Boolean(text));
    }

    function onLeave() {
      cursorEl.classList.remove('is-active', 'has-label');
      labelEl.textContent = '';
    }

    function onTilt(event: PointerEvent) {
      const stage = (event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tilt-stage]') : null);
      if (!stage) return;

      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      stage.style.setProperty('--tilt-x', `${(-y * 7).toFixed(2)}deg`);
      stage.style.setProperty('--tilt-y', `${(x * 8).toFixed(2)}deg`);
      stage.style.setProperty('--tilt-shift-x', `${(x * 10).toFixed(1)}px`);
      stage.style.setProperty('--tilt-shift-y', `${(y * 10).toFixed(1)}px`);
    }

    function onTiltLeave(event: PointerEvent) {
      const stage = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tilt-stage]') : null;
      if (!stage) return;
      stage.style.removeProperty('--tilt-x');
      stage.style.removeProperty('--tilt-y');
      stage.style.removeProperty('--tilt-shift-x');
      stage.style.removeProperty('--tilt-shift-y');
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointermove', onTilt, { passive: true });
    document.querySelectorAll('[data-tilt-stage]').forEach((stage) => {
      stage.addEventListener('pointerleave', onTiltLeave as EventListener);
    });

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointermove', onTilt);
      document.querySelectorAll('[data-tilt-stage]').forEach((stage) => {
        stage.removeEventListener('pointerleave', onTiltLeave as EventListener);
      });
    };
  }, []);

  return (
    <div ref={cursorRef} className="lp-cursor" aria-hidden="true">
      <span ref={labelRef} />
    </div>
  );
}
