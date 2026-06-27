(() => {
  const header = document.querySelector('.site-header');
  const menuBtn = document.querySelector('.menu-button');
  const menu = document.querySelector('.mobile-menu');
  const fixedCta = document.querySelector('.mobile-fixed-cta');
  const ctaSection = document.querySelector('#cta');

  // Reveal elements as they enter the viewport.
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  // Header appearance after scrolling.
  const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 14);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  // Small mobile menu.
  menuBtn?.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    menuBtn.classList.toggle('open', isOpen);
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    menu.setAttribute('aria-hidden', String(!isOpen));
  });
  menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    menu.classList.remove('open');
    menuBtn?.classList.remove('open');
    menuBtn?.setAttribute('aria-expanded', 'false');
  }));

  // The bottom CTA retreats near the final CTA so it does not overlap it.
  if (fixedCta && ctaSection) {
    const ctaObserver = new IntersectionObserver((entries) => {
      fixedCta.classList.toggle('hide', entries[0].isIntersecting);
    }, { threshold: 0.1 });
    ctaObserver.observe(ctaSection);
  }

  // Lightweight "tools merge into COMIU" scroll state.
  const mergeDemo = document.querySelector('.merge-demo');
  if (mergeDemo) {
    const mergeObserver = new IntersectionObserver((entries) => {
      mergeDemo.classList.toggle('in-view', entries[0].isIntersecting);
    }, { threshold: 0.45 });
    mergeObserver.observe(mergeDemo);
  }

  // Desktop only: mouse tilt for the hero dashboard.
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const tiltStage = document.querySelector('#tilt-stage');
  const dashboard = document.querySelector('.dashboard-card');
  if (canHover && tiltStage && dashboard) {
    tiltStage.addEventListener('mousemove', (event) => {
      const box = tiltStage.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      dashboard.style.transform = `translateX(-50%) rotateY(${x * 8}deg) rotateX(${y * -7}deg) translateZ(8px)`;
    });
    tiltStage.addEventListener('mouseleave', () => {
      dashboard.style.transform = 'translateX(-50%) rotateY(0) rotateX(0) translateZ(0)';
    });
  }

  // Desktop only: restrained custom cursor with contextual labels.
  if (canHover) {
    const cursor = document.querySelector('.cursor');
    let rafId = null;
    let pointer = { x: 0, y: 0 };
    const paintCursor = () => {
      cursor.style.left = `${pointer.x}px`;
      cursor.style.top = `${pointer.y}px`;
      rafId = null;
    };
    window.addEventListener('mousemove', (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!rafId) rafId = requestAnimationFrame(paintCursor);
    }, { passive: true });

    document.querySelectorAll('[data-cursor]').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor.classList.add('active');
        cursor.querySelector('span').textContent = el.dataset.cursor || 'VIEW';
      });
      el.addEventListener('mouseleave', () => cursor.classList.remove('active'));
    });
  }
})();
