'use client';

import { useEffect } from 'react';

export default function StaticLpInteractions() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.site-header');
    const menuBtn = document.querySelector<HTMLButtonElement>('.menu-button');
    const menu = document.querySelector<HTMLElement>('.mobile-menu');
    const fixedCta = document.querySelector<HTMLElement>('.mobile-fixed-cta');
    const ctaSection = document.querySelector<HTMLElement>('#cta');

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 },
    );
    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

    const updateHeader = () => {
      header?.classList.toggle('scrolled', window.scrollY > 14);
    };
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();

    const toggleMenu = () => {
      if (!menu || !menuBtn) return;
      const isOpen = menu.classList.toggle('open');
      menuBtn.classList.toggle('open', isOpen);
      menuBtn.setAttribute('aria-expanded', String(isOpen));
      menu.setAttribute('aria-hidden', String(!isOpen));
    };
    menuBtn?.addEventListener('click', toggleMenu);

    const closeMenu = () => {
      menu?.classList.remove('open');
      menuBtn?.classList.remove('open');
      menuBtn?.setAttribute('aria-expanded', 'false');
      menu?.setAttribute('aria-hidden', 'true');
    };
    const menuLinks = Array.from(menu?.querySelectorAll('a') ?? []);
    menuLinks.forEach((link) => link.addEventListener('click', closeMenu));

    const ctaObserver =
      fixedCta && ctaSection
        ? new IntersectionObserver(
            (entries) => {
              fixedCta.classList.toggle('hide', entries[0].isIntersecting);
            },
            { threshold: 0.1 },
          )
        : null;
    if (ctaObserver && ctaSection) ctaObserver.observe(ctaSection);

    const mergeDemo = document.querySelector<HTMLElement>('.merge-demo');
    const mergeObserver = mergeDemo
      ? new IntersectionObserver(
          (entries) => {
            mergeDemo.classList.toggle('in-view', entries[0].isIntersecting);
          },
          { threshold: 0.45 },
        )
      : null;
    if (mergeObserver && mergeDemo) mergeObserver.observe(mergeDemo);

    const lineSection = document.querySelector<HTMLElement>('.line-section');
    const lineObserver = lineSection
      ? new IntersectionObserver(
          (entries) => {
            lineSection.classList.toggle('in-view', entries[0].isIntersecting);
          },
          { threshold: 0.35 },
        )
      : null;
    if (lineObserver && lineSection) lineObserver.observe(lineSection);

    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const tiltStage = document.querySelector<HTMLElement>('#tilt-stage');
    const dashboard = document.querySelector<HTMLElement>('.dashboard-card');

    const handleTilt = (event: MouseEvent) => {
      if (!tiltStage || !dashboard) return;
      const box = tiltStage.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      dashboard.style.transform = `translateX(-50%) rotateY(${x * 8}deg) rotateX(${y * -7}deg) translateZ(8px)`;
    };
    const resetTilt = () => {
      if (!dashboard) return;
      dashboard.style.transform = 'translateX(-50%) rotateY(0) rotateX(0) translateZ(0)';
    };

    if (canHover && tiltStage && dashboard) {
      tiltStage.addEventListener('mousemove', handleTilt);
      tiltStage.addEventListener('mouseleave', resetTilt);
    }

    const cursor = document.querySelector<HTMLElement>('.cursor');
    let rafId: number | null = null;
    let pointer = { x: 0, y: 0 };
    const paintCursor = () => {
      if (!cursor) return;
      cursor.style.left = `${pointer.x}px`;
      cursor.style.top = `${pointer.y}px`;
      rafId = null;
    };
    const handleMouseMove = (event: MouseEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!rafId) rafId = requestAnimationFrame(paintCursor);
    };

    const cursorTargets = Array.from(document.querySelectorAll<HTMLElement>('[data-cursor]'));
    const cursorHandlers = cursorTargets.map((el) => {
      const enter = () => {
        if (!cursor) return;
        cursor.classList.add('active');
        const label = cursor.querySelector('span');
        if (label) label.textContent = el.dataset.cursor || 'VIEW';
      };
      const leave = () => cursor?.classList.remove('active');
      if (canHover && cursor) {
        el.addEventListener('mouseenter', enter);
        el.addEventListener('mouseleave', leave);
      }
      return { el, enter, leave };
    });

    if (canHover && cursor) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    return () => {
      revealObserver.disconnect();
      window.removeEventListener('scroll', updateHeader);
      menuBtn?.removeEventListener('click', toggleMenu);
      menuLinks.forEach((link) => link.removeEventListener('click', closeMenu));
      ctaObserver?.disconnect();
      mergeObserver?.disconnect();
      lineObserver?.disconnect();
      tiltStage?.removeEventListener('mousemove', handleTilt);
      tiltStage?.removeEventListener('mouseleave', resetTilt);
      window.removeEventListener('mousemove', handleMouseMove);
      cursorHandlers.forEach(({ el, enter, leave }) => {
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('mouseleave', leave);
      });
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
}
