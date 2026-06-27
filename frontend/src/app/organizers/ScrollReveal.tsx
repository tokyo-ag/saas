'use client';

import { useEffect } from 'react';

export default function ScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.fade-in, [data-reveal]');
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 },
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
