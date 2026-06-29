"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import PageFX from "./PageFX";


function Logo() {
  return (
    <a className="logo" href="#top" aria-label="COMIU トップへ">
      <Image src="/icon.png" alt="" width={36} height={36} className="logo-icon" priority />
      <strong>COMIU</strong>
    </a>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}



export default function ComiuLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    const mainEl = document.querySelector<HTMLElement>(".comiu-lp");
    const header = document.querySelector<HTMLElement>(".site-header");
    const fixedCta = document.querySelector<HTMLElement>(".fixed-mobile-cta");

    // Scroll to top on mount.
    if (mainEl) mainEl.scrollTop = 0;

    // Keep the header readable after scrolling.
    const handleScroll = () => {
      header?.classList.toggle("is-scrolled", (mainEl?.scrollTop ?? 0) > 12);
    };

    mainEl?.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    // Reveal sections as they enter the viewport.
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { root: mainEl, threshold: 0.16 }
    );
    document.querySelectorAll<HTMLElement>(".reveal, .flow-stage, .line-phone").forEach((el) => {
      revealObserver.observe(el);
    });

    // Track active page for dot navigation.
    const pages = document.querySelectorAll<HTMLElement>(".snap-page");
    const pageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Array.from(pages).indexOf(entry.target as HTMLElement);
            if (idx !== -1) setActivePage(idx);
          }
        });
      },
      { root: mainEl, threshold: 0.5 }
    );
    pages.forEach((p) => pageObserver.observe(p));

    // Hide fixed CTA on last page / footer.
    const ctaObserver = new IntersectionObserver(
      (entries) => {
        const shouldHide = entries.some((e) => e.isIntersecting);
        fixedCta?.classList.toggle("is-hidden", shouldHide);
      },
      { root: mainEl, threshold: 0.1 }
    );
    const heroActions = document.querySelector<HTMLElement>(".hero-actions");
    const footer = document.querySelector<HTMLElement>(".site-footer");
    if (heroActions) ctaObserver.observe(heroActions);
    if (footer) ctaObserver.observe(footer);

    // Keyboard navigation.
    const handleKey = (e: KeyboardEvent) => {
      if (!mainEl) return;
      const allPages = Array.from(document.querySelectorAll<HTMLElement>(".snap-page"));
      const cur = Math.round(mainEl.scrollTop / mainEl.clientHeight);
      if (e.key === "ArrowDown" && cur < allPages.length - 1) {
        allPages[cur + 1].scrollIntoView({ behavior: "smooth" });
      } else if (e.key === "ArrowUp" && cur > 0) {
        allPages[cur - 1].scrollIntoView({ behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      mainEl?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKey);
      revealObserver.disconnect();
      pageObserver.disconnect();
      ctaObserver.disconnect();
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <style jsx global>{`
        :root {
          --ink: #071033;
          --navy: #0b143d;
          --muted: #66708f;
          --blue: #1559ff;
          --blue-2: #3f63ff;
          --purple: #8d55ff;
          --lime: #dfff4f;
          --yellow: #fff23e;
          --green: #13c86a;
          --pink: #ff6db3;
          --sky: #ebf5ff;
          --surface: #ffffff;
          --soft: #f5f8ff;
          --line: #e3e9f8;
          --radius-lg: 30px;
          --radius-md: 22px;
          --shadow: 0 22px 58px rgba(35, 61, 145, 0.14);
          --shadow-soft: 0 12px 30px rgba(35, 61, 145, 0.09);
          --page-x: clamp(18px, 5vw, 76px);
          --section-y: clamp(82px, 11vw, 150px);
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
          scroll-padding-top: 86px;
          scroll-snap-type: y proximity;
        }

        body {
          margin: 0;
          overflow-x: hidden;
          background: #f7f6ff;
          color: var(--ink);
          font-family: Inter, "Noto Sans JP", system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        body:has(.comiu-lp) {
          background: #f7f6ff;
        }

        a {
          color: inherit;
        }

        button {
          font: inherit;
        }

        .comiu-lp {
          position: relative;
          height: 100dvh;
          overflow-y: scroll;
          overflow-x: hidden;
          scroll-snap-type: y mandatory;
          overscroll-behavior: none;
          background:
            radial-gradient(circle at var(--g1x, 12%) var(--g1y, 5%), rgba(176, 215, 255, 0.68), transparent 28%),
            radial-gradient(circle at var(--g2x, 90%) var(--g2y, 8%), rgba(232, 204, 255, 0.72), transparent 30%),
            radial-gradient(circle at var(--g3x, 52%) var(--g3y, 95%), rgba(255, 214, 237, 0.72), transparent 34%),
            radial-gradient(circle at var(--g4x, 8%) var(--g4y, 68%), rgba(202, 247, 224, 0.68), transparent 26%),
            linear-gradient(180deg, #fbfdff 0%, #f7f4ff 46%, #f5fbff 100%);
        }

        .comiu-lp::before {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          content: "";
          opacity: 0.28;
          background-image: radial-gradient(circle, rgba(36, 93, 255, 0.22) 1px, transparent 1.8px);
          background-size: 22px 22px;
          mask-image: linear-gradient(120deg, transparent 0%, #000 18%, transparent 62%);
        }

        .lp-section {
          position: relative;
          z-index: 1;
          width: min(1180px, calc(100% - var(--page-x) * 2));
          margin: 0 auto;
          padding: var(--section-y) 0;
        }

        .site-header {
          position: fixed;
          top: 12px;
          left: 50%;
          z-index: 50;
          display: flex;
          width: min(1180px, calc(100% - 24px));
          min-height: 64px;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 12px 10px 18px;
          border: 1px solid transparent;
          border-radius: 22px;
          transform: translateX(-50%);
          transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }

        .site-header.is-scrolled {
          border-color: rgba(220, 226, 245, 0.86);
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 14px 34px rgba(25, 42, 110, 0.1);
          backdrop-filter: blur(18px);
        }

        .logo {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          gap: 10px;
          color: var(--ink);
          text-decoration: none;
        }

        .logo-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          object-fit: contain;
        }

        .logo strong,
        .mock-logo {
          color: transparent;
          background: linear-gradient(90deg, #0c58ff, #9b47ff);
          background-clip: text;
          -webkit-background-clip: text;
          font-size: 23px;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .desktop-nav a,
        .mobile-nav a {
          min-height: 44px;
          align-items: center;
          justify-content: center;
          color: #202b4f;
          text-decoration: none;
          font-size: 14px;
          font-weight: 850;
        }

        .desktop-nav a {
          display: inline-flex;
          padding: 0 8px;
        }

        .desktop-nav .nav-cta,
        .mobile-nav .nav-cta {
          padding: 0 18px;
          color: #fff;
          background: var(--ink);
          border-radius: 999px;
          box-shadow: 0 12px 26px rgba(7, 16, 51, 0.18);
        }

        .menu-button {
          display: none;
          width: 48px;
          height: 48px;
          border: 0;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 10px 24px rgba(25, 42, 110, 0.1);
        }

        .menu-button span {
          display: block;
          width: 20px;
          height: 2px;
          margin: 5px auto;
          background: var(--ink);
          border-radius: 999px;
        }

        .mobile-nav {
          position: fixed;
          top: 84px;
          left: 12px;
          right: 12px;
          z-index: 49;
          display: grid;
          gap: 8px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid var(--line);
          border-radius: 20px;
          box-shadow: var(--shadow);
          backdrop-filter: blur(18px);
          transform: translateY(-12px);
          opacity: 0;
          pointer-events: none;
          transition: 0.2s ease;
        }

        .mobile-nav.is-open {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }

        .mobile-nav a {
          display: flex;
          border-radius: 14px;
        }

        .hero {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          height: 100dvh;
          padding-top: 120px;
          padding-bottom: 60px;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          isolation: isolate;
        }

        .hero-copy {
          position: relative;
          z-index: 5;
          max-width: 860px;
        }

        .hero-basket {
          position: absolute;
          top: clamp(250px, 29vw, 340px);
          right: clamp(18px, 5vw, 76px);
          z-index: 6;
          display: block;
          width: clamp(158px, 15vw, 226px);
          height: clamp(118px, 11vw, 162px);
          pointer-events: none;
          opacity: 0.96;
          filter: drop-shadow(0 24px 38px rgba(91, 85, 255, 0.18));
        }

        .hero-basket-glow {
          position: absolute;
          inset: 12% -18% -12%;
          background: radial-gradient(ellipse at center, rgba(141, 85, 255, 0.2), rgba(21, 89, 255, 0));
          border-radius: 50%;
        }

        .hero-basket-label {
          position: absolute;
          top: 0;
          left: 50%;
          color: rgba(21, 89, 255, 0.72);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          transform: translateX(-50%);
        }

        .hero-basket-target {
          position: absolute;
          inset: 28px 8px 0;
        }

        .hero-basket-rim {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 2;
          width: 100%;
          height: 28%;
          border: 5px solid rgba(21, 89, 255, 0.78);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.28);
          box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.48);
        }

        .hero-basket-body {
          position: absolute;
          top: 15%;
          right: 8%;
          bottom: 2%;
          left: 8%;
          clip-path: polygon(0 0, 100% 0, 84% 100%, 16% 100%);
          background:
            repeating-linear-gradient(90deg, transparent 0 17%, rgba(21, 89, 255, 0.26) 17% 18.5%, transparent 18.5% 33%),
            repeating-linear-gradient(0deg, transparent 0 27%, rgba(21, 89, 255, 0.22) 27% 29%, transparent 29% 42%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(229, 236, 255, 0.42));
          border-bottom: 2px solid rgba(7, 16, 51, 0.2);
        }

        /* Line-by-line reveal */
        .hero-line-wrap {
          display: block;
          overflow: hidden;
        }

        .title-line {
          display: block;
          animation: line-up 1s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .mobile-title-break {
          display: none;
        }

        .hero-line-wrap:nth-child(1) .title-line { animation-delay: 0.06s; }

        @keyframes line-up {
          from { transform: translateY(108%); }
          to   { transform: translateY(0); }
        }

        /* Scroll-triggered line reveal (reusable for all sections) */
        .lr-wrap {
          display: block;
          overflow: hidden;
        }

        .lr {
          display: block;
          white-space: nowrap;
          transform: translateY(110%);
          transition: transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .is-visible .lr { transform: translateY(0); }

        .lr-wrap:nth-child(1) .lr { transition-delay: 0.02s; }
        .lr-wrap:nth-child(2) .lr { transition-delay: 0.20s; }
        .lr-wrap:nth-child(3) .lr { transition-delay: 0.38s; }
        .lr-wrap:nth-child(4) .lr { transition-delay: 0.54s; }

        /* desc lines start after heading lines */
        .section-desc .lr-wrap:nth-child(1) .lr { transition-delay: 0.30s; }
        .section-desc .lr-wrap:nth-child(2) .lr { transition-delay: 0.48s; }

        .hero-fade {
          animation: fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: var(--fd, 0s);
        }

        @keyframes fade-up {
          from { transform: translateY(18px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        .section-label {
          display: inline-flex;
          min-height: 34px;
          align-items: center;
          gap: 9px;
          margin: 0 0 20px;
          padding: 0 14px;
          color: #2652b8;
          background: rgba(255, 255, 255, 0.88);
          border: 1.5px solid #c8d8ff;
          border-radius: 999px;
          box-shadow: 0 6px 18px rgba(53, 94, 180, 0.12);
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.08em;
        }

        .section-label::before {
          width: 8px;
          height: 8px;
          content: "";
          background: linear-gradient(135deg, #ff6db3, var(--lime));
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(255, 109, 179, 0.22);
        }

        h1,
        h2,
        h3,
        p {
          margin-top: 0;
        }

        .hero h1,
        .section-title,
        .statement h2 {
          letter-spacing: -0.08em;
        }

        .hero h1 {
          max-width: 860px;
          margin-bottom: 28px;
          font-size: clamp(30px, 4vw, 52px);
          line-height: 1.12;
          font-weight: 950;
        }

        .title-line {
          white-space: nowrap;
        }

        .hero h1 .title-line {
          display: block;
        }

        .hero h1 .accent,
        .gradient-text {
          color: transparent;
          background: linear-gradient(95deg, var(--blue) 0%, var(--purple) 88%);
          background-clip: text;
          -webkit-background-clip: text;
        }

        .hero h1 .accent {
          font-style: normal;
        }

        .hero-lead {
          max-width: 560px;
          margin-bottom: 18px;
          padding-left: 18px;
          border-left: 5px solid var(--blue);
          font-size: clamp(24px, 3vw, 36px);
          line-height: 1.42;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .hero-lead strong {
          color: var(--blue);
        }

        .hero-sub {
          max-width: 800px;
          margin-bottom: 18px;
          color: #1a2445;
          font-size: clamp(16px, 2vw, 22px);
          line-height: 1.7;
          font-weight: 700;
          letter-spacing: -0.03em;
        }

        .hero-desc,
        .section-desc {
          max-width: 640px;
          color: var(--muted);
          font-size: clamp(15px, 1.55vw, 18px);
          line-height: 2;
          font-weight: 650;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .button {
          display: inline-flex;
          min-height: 52px;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 0 22px;
          border: 1px solid transparent;
          border-radius: 999px;
          text-decoration: none;
          font-size: 15px;
          font-weight: 950;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .button:active {
          transform: scale(0.98);
        }

        .button-primary {
          color: #fff;
          background: linear-gradient(110deg, #1559ff 0%, #8d55ff 55%, #d44fff 100%);
          box-shadow: 0 16px 36px rgba(100, 60, 255, 0.3);
        }

        .button-secondary {
          color: var(--ink);
          background: #fff;
          border-color: var(--line);
          box-shadow: 0 10px 26px rgba(30, 52, 130, 0.08);
        }

        .hero-visual {
          --tilt-x: 0deg;
          --tilt-y: 0deg;
          --float-x: 0px;
          --float-y: 0px;
          position: relative;
          min-height: 640px;
          perspective: 1100px;
        }

        .hero-device {
          position: absolute;
          top: 30px;
          left: 50%;
          width: min(520px, 92%);
          padding: 20px;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.96);
          border-radius: 38px;
          box-shadow: 0 34px 80px rgba(43, 69, 154, 0.18);
          backdrop-filter: blur(18px);
          transform: translateX(-50%) rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
          transform-style: preserve-3d;
          transition: transform 0.18s ease;
        }

        .floating-card {
          position: absolute;
          z-index: 4;
          display: grid;
          min-width: 150px;
          gap: 4px;
          padding: 16px 18px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(218, 228, 255, 0.9);
          border-radius: 18px;
          box-shadow: var(--shadow-soft);
          transform: translate3d(calc(var(--float-x) * var(--fx, 1)), calc(var(--float-y) * var(--fy, 1)), 40px);
          transition: transform 0.18s ease;
        }

        .floating-card small {
          color: var(--muted);
          font-size: 12px;
          font-weight: 850;
        }

        .floating-card b {
          font-size: 23px;
          letter-spacing: -0.04em;
        }

        .floating-card.green b {
          color: var(--green);
        }

        .floating-card.blue b {
          color: var(--blue);
        }

        .floating-card.purple b {
          color: var(--purple);
        }

        .floating-card.one {
          top: 0;
          left: 2%;
          --fx: -0.7;
          --fy: 0.8;
        }

        .floating-card.two {
          top: 150px;
          right: 0;
          --fx: 1.1;
          --fy: -0.5;
        }

        .floating-card.three {
          left: 4%;
          bottom: 72px;
          --fx: -1.2;
          --fy: 0.6;
        }

        .floating-card.four {
          right: 3%;
          bottom: 8px;
          --fx: 1.2;
          --fy: 0.8;
        }

        .dashboard-mock {
          overflow: hidden;
          padding: 22px;
          color: var(--ink);
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 28px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }

        .dashboard-mock.compact {
          box-shadow: var(--shadow-soft);
        }

        .mock-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }

        .mock-top b {
          flex: 1;
          font-size: 15px;
          letter-spacing: -0.04em;
        }

        .mock-logo {
          font-size: 22px;
        }

        .mock-dot {
          width: 36px;
          height: 36px;
          background: radial-gradient(circle at 70% 25%, #ff496c 0 4px, transparent 4px), #f6f8ff;
          border: 1px solid #e5ebfb;
          border-radius: 50%;
        }

        .mock-card {
          background: #fff;
          border: 1px solid #e5ebfb;
          border-radius: 18px;
          box-shadow: 0 10px 24px rgba(35, 61, 145, 0.07);
        }

        .mock-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .mock-card-head a {
          color: var(--blue);
          font-size: 12px;
          font-weight: 950;
          text-decoration: none;
        }

        .mock-events {
          padding: 18px;
        }

        .mock-event-row {
          position: relative;
          display: grid;
          grid-template-columns: 54px 1fr;
          gap: 12px;
          align-items: center;
          padding: 12px 0;
          border-top: 1px solid #eef2fb;
        }

        .mock-event-row:first-of-type {
          border-top: 0;
        }

        .mock-event-row b {
          display: block;
          font-size: 14px;
        }

        .mock-event-row small {
          color: var(--muted);
          font-size: 12px;
          font-weight: 760;
        }

        .mock-event-row span {
          position: absolute;
          right: 0;
          bottom: 13px;
          width: min(112px, 32%);
          height: 7px;
          background: #e7edff;
          border-radius: 999px;
        }

        .mock-event-row span::before {
          display: block;
          width: var(--bar);
          height: 100%;
          content: "";
          background: linear-gradient(90deg, var(--blue), #94b5ff);
          border-radius: inherit;
        }

        .mini-photo {
          position: relative;
          display: block;
          width: 54px;
          height: 44px;
          overflow: hidden;
          background: linear-gradient(135deg, #94c7ff, #6257ff);
          border-radius: 12px;
        }

        .mini-photo.green {
          background: linear-gradient(135deg, #44d985, #a8e1ff);
        }

        .mini-photo.orange {
          background: linear-gradient(135deg, #ff9b61, #ffd56c);
        }

        .mini-photo i {
          position: absolute;
          bottom: 7px;
          width: 13px;
          height: 25px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 999px 999px 5px 5px;
        }

        .mini-photo i:nth-child(1) {
          left: 9px;
          height: 18px;
        }

        .mini-photo i:nth-child(2) {
          left: 22px;
          height: 28px;
        }

        .mini-photo i:nth-child(3) {
          right: 8px;
          height: 21px;
        }

        .mock-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 12px;
        }

        .mock-stat,
        .mock-line,
        .mock-roster {
          min-height: 112px;
          padding: 15px;
        }

        .mock-card small {
          color: var(--muted);
          font-size: 12px;
          font-weight: 850;
        }

        .mock-card strong {
          display: block;
          margin: 8px 0 4px;
          font-size: 29px;
          letter-spacing: -0.05em;
        }

        .mock-card em {
          color: var(--green);
          font-size: 12px;
          font-style: normal;
          font-weight: 900;
        }

        .mock-line strong {
          color: var(--green);
          font-size: 22px;
        }

        .mock-roster p {
          display: flex;
          align-items: center;
          margin: 12px 0 0;
        }

        .mock-roster i {
          width: 28px;
          height: 28px;
          margin-right: -8px;
          background: linear-gradient(135deg, #96caff, #ff9ed0);
          border: 2px solid #fff;
          border-radius: 50%;
        }

        .mock-roster b {
          margin-left: 15px;
        }

        .next-event {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          padding: 14px 16px;
        }

        .next-event b {
          flex: 1;
        }

        .next-event span {
          padding: 7px 10px;
          color: var(--blue);
          background: #eef3ff;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
        }

        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }

        .reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .problem {
          padding-top: clamp(92px, 12vw, 160px);
        }

        .problem-head {
          max-width: 780px;
          margin-bottom: 44px;
        }

        .section-title {
          margin-bottom: 20px;
          font-size: clamp(36px, 5.5vw, 70px);
          line-height: 1.14;
          font-weight: 950;
        }

        .flow-stage {
          position: relative;
          display: grid;
          grid-template-columns: minmax(360px, 0.86fr) 120px minmax(360px, 1fr);
          gap: 24px;
          align-items: center;
          min-height: 440px;
        }

        .tool-stack {
          position: relative;
          min-height: 390px;
        }

        .tool-card {
          position: absolute;
          display: grid;
          grid-template-columns: 46px 1fr;
          gap: 12px;
          align-items: center;
          width: 226px;
          min-height: 84px;
          padding: 15px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid var(--line);
          border-radius: 18px;
          box-shadow: var(--shadow-soft);
          transition: transform 0.78s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.78s ease;
        }

        .tool-card:nth-child(1) {
          top: 0;
          left: 0;
          transform: rotate(-5deg);
        }

        .tool-card:nth-child(2) {
          top: 22px;
          right: 8px;
          transform: rotate(3deg);
        }

        .tool-card:nth-child(3) {
          top: 128px;
          left: 40px;
          transform: rotate(4deg);
        }

        .tool-card:nth-child(4) {
          top: 154px;
          right: 34px;
          transform: rotate(-4deg);
        }

        .tool-card:nth-child(5) {
          bottom: 40px;
          left: 16px;
          transform: rotate(-2deg);
        }

        .tool-card:nth-child(6) {
          right: 0;
          bottom: 0;
          transform: rotate(5deg);
        }

        .flow-stage.is-visible .tool-card {
          transform: translateX(clamp(42px, 9vw, 120px)) scale(0.92);
          opacity: 0.72;
        }

        .tool-card span {
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, var(--blue), var(--purple));
          border-radius: 14px;
          font-size: 13px;
          font-weight: 950;
        }

        .tool-card b {
          font-size: 15px;
        }

        .tool-card small {
          display: block;
          margin-top: 4px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 750;
        }

        .flow-arrow {
          position: relative;
          height: 150px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(21, 89, 255, 0.08), rgba(141, 85, 255, 0.34));
          clip-path: polygon(0 34%, 60% 34%, 60% 8%, 100% 50%, 60% 92%, 60% 66%, 0 66%);
        }

        .flow-result {
          transform: scale(0.96);
          transition: transform 0.7s ease;
        }

        .flow-stage.is-visible .flow-result {
          transform: scale(1);
        }

        .flow-copy {
          position: relative;
          z-index: 2;
          margin-top: 34px;
          color: transparent;
          background: linear-gradient(90deg, var(--blue), var(--purple));
          background-clip: text;
          -webkit-background-clip: text;
          font-size: clamp(28px, 4vw, 50px);
          font-weight: 950;
          letter-spacing: -0.07em;
          text-align: center;
        }

        .statement {
          position: relative;
          z-index: 1;
          width: min(100%, 1240px);
          margin-inline: auto;
          padding: clamp(88px, 12vw, 160px) var(--page-x);
          overflow: hidden;
          color: var(--ink);
          background:
            radial-gradient(circle at 15% 18%, rgba(255, 255, 255, 0.9), transparent 28%),
            radial-gradient(circle at 85% 24%, rgba(223, 255, 79, 0.28), transparent 28%),
            radial-gradient(circle at 74% 82%, rgba(255, 202, 231, 0.68), transparent 34%),
            linear-gradient(135deg, #eaf5ff, #f4ebff 54%, #fff3fb);
          border: 1px solid rgba(255, 255, 255, 0.84);
          border-radius: 46px;
          box-shadow: 0 26px 80px rgba(73, 82, 152, 0.16);
        }

        .statement::before {
          position: absolute;
          top: -160px;
          left: 50%;
          width: 780px;
          height: 780px;
          content: "";
          background: conic-gradient(from 90deg, transparent, rgba(91, 148, 255, 0.22), transparent, rgba(255, 154, 211, 0.18), transparent);
          border-radius: 50%;
          filter: blur(24px);
          transform: translateX(-50%);
          animation: glow-spin 18s linear infinite;
        }

        .statement-inner {
          position: relative;
          z-index: 1;
          width: min(930px, 100%);
          margin: 0 auto;
          text-align: center;
        }

        .statement h2 {
          margin-bottom: 28px;
          font-size: clamp(42px, 6vw, 78px);
          line-height: 1.14;
          font-weight: 950;
        }

        .statement h2 span {
          color: var(--blue);
        }

        .statement p {
          color: #53617f;
          font-size: clamp(16px, 2vw, 22px);
          line-height: 2;
          font-weight: 700;
        }

        .statement-list {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin: 34px 0;
        }

        .statement-list span {
          display: grid;
          min-height: 84px;
          place-items: center;
          padding: 12px;
          background: rgba(255, 255, 255, 0.64);
          border: 1px solid rgba(143, 170, 255, 0.24);
          border-radius: 18px;
          font-size: 14px;
          font-weight: 900;
        }

        .features-section .section-head {
          display: grid;
          grid-template-columns: 0.8fr 1fr;
          gap: 26px;
          align-items: end;
          margin-bottom: 30px;
        }

        .feature-track {
          display: grid;
          grid-auto-columns: minmax(290px, 380px);
          grid-auto-flow: column;
          gap: 18px;
          overflow-x: auto;
          overscroll-behavior-inline: contain;
          padding: 6px 2px 24px;
          scrollbar-width: thin;
          scroll-snap-type: x mandatory;
        }

        .feature-card {
          display: grid;
          min-height: 420px;
          align-content: space-between;
          padding: 24px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid var(--line);
          border-radius: 26px;
          box-shadow: var(--shadow-soft);
          scroll-snap-align: start;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }

        .feature-card:active {
          transform: scale(0.985);
        }

        .feature-card h3 {
          margin-bottom: 12px;
          font-size: 23px;
          line-height: 1.35;
          letter-spacing: -0.05em;
        }

        .feature-card p {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.85;
          font-weight: 650;
        }

        .feature-mock {
          min-height: 154px;
          margin: 18px 0;
          padding: 16px;
          background: #fff;
          border: 1px solid #e5ebfb;
          border-radius: 20px;
          box-shadow: 0 14px 28px rgba(35, 61, 145, 0.08);
        }

        .card-mini,
        .blog-mini {
          display: grid;
          grid-template-columns: 62px 1fr;
          gap: 13px;
          align-items: center;
        }

        .card-mini button {
          grid-column: 1 / -1;
          min-height: 44px;
          border: 0;
          color: #fff;
          background: var(--blue);
          border-radius: 999px;
          font-weight: 950;
        }

        .feature-mock b {
          display: block;
          font-size: 15px;
          line-height: 1.5;
        }

        .feature-mock small {
          color: var(--muted);
          font-weight: 760;
        }

        .line-mini {
          display: grid;
          gap: 10px;
          background: linear-gradient(135deg, #eafff2, #eef5ff);
        }

        .line-mini span {
          display: grid;
          width: 52px;
          height: 52px;
          place-items: center;
          color: #fff;
          background: var(--green);
          border-radius: 16px;
          font-weight: 950;
        }

        .line-mini p {
          width: fit-content;
          margin: 0;
          padding: 10px 12px;
          color: var(--ink);
          background: #fff;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 780;
        }

        .pay-mini {
          display: grid;
          align-content: center;
          justify-items: center;
          gap: 8px;
        }

        .pay-mini strong {
          font-size: 42px;
        }

        .pay-mini span {
          padding: 8px 14px;
          color: var(--green);
          background: #eafff2;
          border-radius: 999px;
          font-weight: 950;
        }

        .roster-mini {
          display: grid;
          gap: 8px;
        }

        .roster-mini p {
          display: grid;
          grid-template-columns: 32px 1fr auto;
          gap: 10px;
          align-items: center;
          margin: 0;
          padding: 10px;
          background: #f8faff;
          border-radius: 12px;
        }

        .roster-mini i {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #95c6ff, #ffa8d6);
          border-radius: 50%;
        }

        .roster-mini span {
          color: var(--green);
          font-size: 12px;
          font-weight: 900;
        }

        .calendar-section {
          display: grid;
          grid-template-columns: minmax(320px, 0.82fr) minmax(340px, 1fr);
          gap: clamp(26px, 5vw, 68px);
          align-items: center;
        }

        .calendar-copy {
          max-width: 520px;
        }

        .calendar-card {
          padding: clamp(18px, 3vw, 32px);
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid var(--line);
          border-radius: 30px;
          box-shadow: var(--shadow);
        }

        .calendar-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .calendar-head b {
          font-size: 22px;
        }

        .calendar-head span {
          padding: 8px 12px;
          color: #fff;
          background: var(--blue);
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-bottom: 18px;
          text-align: center;
        }

        .calendar-grid span {
          display: grid;
          min-height: 38px;
          place-items: center;
          border-radius: 50%;
          color: #283452;
          font-weight: 780;
        }

        .calendar-grid .day {
          color: var(--muted);
          font-size: 12px;
        }

        .calendar-grid .active {
          color: var(--blue);
          background: #efeaff;
          outline: 2px solid #a98cff;
        }

        .calendar-list {
          display: grid;
          gap: 10px;
        }

        .calendar-list article {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 12px;
          background: #fff;
          border: 1px solid #e7edfb;
          border-radius: 18px;
          box-shadow: 0 10px 22px rgba(35, 61, 145, 0.07);
        }

        .calendar-list time {
          color: var(--blue);
          font-weight: 950;
        }

        .calendar-list b {
          display: block;
        }

        .calendar-list small {
          color: var(--muted);
          font-weight: 750;
        }

        .event-status {
          padding: 8px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }

        .event-status.blue {
          color: var(--blue);
          background: #eef3ff;
        }

        .event-status.green {
          color: var(--green);
          background: #eafff3;
        }

        .event-status.pink {
          color: var(--pink);
          background: #fff0f8;
        }

        .event-status.gray {
          color: #788198;
          background: #f0f3f8;
        }

        .calendar-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }

        .calendar-cta .button {
          flex: 1 1 180px;
        }

        .line-label {
          display: inline-flex;
          min-height: 46px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 16px;
          color: var(--green);
          background: #eafff3;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 950;
        }

        .asset-section {
          padding-top: 0;
        }

        .asset-grid {
          display: grid;
          grid-template-columns: minmax(320px, 0.8fr) minmax(360px, 1fr);
          gap: clamp(28px, 5vw, 70px);
          align-items: start;
        }

        .timeline {
          position: relative;
          display: grid;
          gap: 16px;
          padding-left: 28px;
        }

        .timeline::before {
          position: absolute;
          top: 16px;
          bottom: 76px;
          left: 8px;
          width: 3px;
          content: "";
          background: linear-gradient(var(--blue), var(--purple));
          border-radius: 999px;
        }

        .timeline-card {
          position: relative;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 14px;
          align-items: center;
          padding: 16px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 18px;
          box-shadow: var(--shadow-soft);
          transition-delay: calc(var(--i) * 90ms);
        }

        .timeline-card::before {
          position: absolute;
          left: -27px;
          width: 14px;
          height: 14px;
          content: "";
          background: var(--blue);
          border: 4px solid #eaf1ff;
          border-radius: 50%;
        }

        .timeline-card time {
          display: grid;
          width: 58px;
          height: 58px;
          place-items: center;
          color: var(--blue);
          background: #eff4ff;
          border-radius: 50%;
          font-weight: 950;
        }

        .timeline-card b {
          display: block;
          margin-bottom: 4px;
        }

        .timeline-card small {
          color: var(--muted);
          font-weight: 760;
        }

        .trust-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 18px;
        }

        .trust-metrics div {
          padding: 18px 12px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 18px;
          box-shadow: var(--shadow-soft);
          text-align: center;
        }

        .trust-metrics b {
          display: block;
          margin-top: 6px;
          color: var(--blue);
          font-size: 30px;
          letter-spacing: -0.05em;
        }

        .trust-message {
          margin-top: 26px;
          padding: 22px;
          color: #fff;
          background: linear-gradient(100deg, var(--blue), var(--purple));
          border-radius: 22px;
          font-size: clamp(20px, 2vw, 28px);
          font-weight: 950;
          text-align: center;
          box-shadow: var(--shadow);
        }

        .line-section {
          display: grid;
          grid-template-columns: minmax(320px, 0.82fr) minmax(320px, 1fr);
          gap: clamp(28px, 5vw, 70px);
          align-items: center;
        }

        .line-phone {
          max-width: 390px;
          margin: 0 auto;
          padding: 18px;
          background: #101932;
          border-radius: 42px;
          box-shadow: 0 28px 70px rgba(18, 28, 70, 0.22);
        }

        .line-screen {
          min-height: 610px;
          padding: 22px 16px 18px;
          background: linear-gradient(180deg, #eaf4ff, #f8fbff);
          border-radius: 30px;
        }

        .line-screen h3 {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 18px;
          font-size: 17px;
        }

        .line-screen h3 span {
          display: grid;
          width: 36px;
          height: 36px;
          place-items: center;
          color: #fff;
          background: var(--green);
          border-radius: 12px;
          font-size: 12px;
        }

        .bubble {
          width: fit-content;
          max-width: 88%;
          margin: 10px 0;
          padding: 13px 15px;
          background: #fff;
          border-radius: 17px 17px 17px 5px;
          box-shadow: 0 8px 18px rgba(28, 64, 130, 0.08);
          font-size: 14px;
          font-weight: 750;
          line-height: 1.65;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.45s ease, transform 0.45s ease;
          transition-delay: calc(var(--i) * 120ms);
        }

        .line-phone.is-visible .bubble {
          opacity: 1;
          transform: translateY(0);
        }

        .benefit-list {
          display: grid;
          gap: 12px;
          margin-top: 24px;
        }

        .benefit-list p {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
          padding: 16px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 16px;
          box-shadow: var(--shadow-soft);
          font-weight: 900;
        }

        .benefit-list span {
          display: grid;
          width: 32px;
          height: 32px;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, var(--blue), var(--purple));
          border-radius: 50%;
          font-size: 13px;
        }

        .future-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 36px;
        }

        .future-card {
          padding: 24px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 24px;
          box-shadow: var(--shadow-soft);
        }

        .future-card span {
          display: grid;
          width: 48px;
          height: 48px;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, var(--blue), var(--purple));
          border-radius: 50%;
          font-weight: 950;
        }

        .future-card h3 {
          margin: 20px 0 10px;
          font-size: 24px;
          letter-spacing: -0.05em;
        }

        .future-card p {
          margin: 0;
          color: var(--muted);
          line-height: 1.8;
          font-weight: 650;
        }

        .future-message {
          margin: 34px 0 0;
          padding: clamp(24px, 4vw, 42px);
          background:
            radial-gradient(circle at 16% 20%, rgba(255, 255, 255, 0.9), transparent 28%),
            linear-gradient(135deg, #edf5ff, #f4eaff 54%, #fff0f8);
          border: 1px solid rgba(255, 255, 255, 0.82);
          border-radius: 30px;
          color: var(--ink);
          text-align: center;
          font-size: clamp(20px, 2.4vw, 32px);
          line-height: 1.7;
          font-weight: 950;
          box-shadow: var(--shadow-soft);
        }

        .future-message strong {
          color: var(--blue);
        }

        .site-footer {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          height: 100dvh;
          padding: 80px var(--page-x) 40px;
          color: var(--muted);
          scroll-snap-align: start;
          scroll-snap-stop: always;
          background: linear-gradient(160deg, #f0f6ff 0%, #f3eeff 50%, #fff2f9 100%);
        }

        .footer-cta {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 20px;
        }

        .footer-cta-eyebrow {
          margin: 0;
          font-size: 13px;
          font-weight: 850;
          letter-spacing: 0.12em;
          color: var(--blue);
          text-transform: uppercase;
        }

        .footer-cta-title {
          margin: 0;
          font-size: clamp(36px, 6vw, 72px);
          font-weight: 950;
          letter-spacing: -0.06em;
          line-height: 1.1;
          color: var(--ink);
        }

        .footer-cta-desc {
          margin: 0;
          font-size: 15px;
          color: var(--muted);
        }

        .footer-cta-btn {
          margin-top: 8px;
          font-size: 17px;
          padding: 18px 48px;
          border-radius: 50px;
        }

        .footer-bottom {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          border-top: 1px solid var(--line);
          width: 100%;
          padding-top: 24px;
        }

        .fixed-mobile-cta {
          position: fixed;
          right: 14px;
          bottom: 14px;
          left: 14px;
          z-index: 60;
          display: none;
          min-height: 56px;
          align-items: center;
          justify-content: center;
          color: #fff;
          background: linear-gradient(95deg, var(--blue), var(--purple));
          border-radius: 999px;
          box-shadow: 0 18px 36px rgba(52, 86, 235, 0.3);
          text-decoration: none;
          font-weight: 950;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .fixed-mobile-cta.is-hidden {
          opacity: 0;
          pointer-events: none;
          transform: translateY(12px);
        }

        @media (hover: hover) and (pointer: fine) {
          body { cursor: none; }

          .button:hover,
          .feature-card:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow);
          }
        }

        @keyframes glow-spin {
          to {
            transform: translateX(-50%) rotate(360deg);
          }
        }

        @media (max-width: 1180px) {
          .desktop-nav {
            display: none;
          }

          .menu-button {
            display: block;
          }

          .hero,
          .flow-stage,
          .calendar-section,
          .asset-grid,
          .line-section {
            grid-template-columns: 1fr;
          }

          .hero {
            gap: 32px;
            padding-top: 116px;
            padding-bottom: 120px;
          }

          .hero-basket {
            top: auto;
            right: clamp(20px, 7vw, 52px);
            bottom: clamp(32px, 7vw, 72px);
            display: block;
            width: clamp(128px, 20vw, 188px);
            height: clamp(96px, 16vw, 138px);
          }

          .hero-copy {
            max-width: 760px;
          }

          .hero h1,
          .hero-lead,
          .hero-sub,
          .hero-desc {
            max-width: 720px;
          }

          .hero-visual {
            min-height: 560px;
          }

          .hero-device {
            top: 36px;
          }

          .floating-card.one {
            left: 0;
          }

          .floating-card.two {
            right: -4px;
          }

          .floating-card.three {
            left: 2%;
          }

          .floating-card.four {
            right: 4%;
          }

          .flow-stage {
            gap: 12px;
          }

          .flow-arrow {
            width: min(260px, 72vw);
            height: 90px;
            margin: 0 auto;
            transform: rotate(90deg);
          }

          .statement-list {
            grid-template-columns: 1fr;
          }

          .features-section .section-head {
            grid-template-columns: 1fr;
          }

          .future-steps {
            grid-template-columns: 1fr;
          }

          .portal-grid,
          .remind-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          :root {
            --page-x: 16px;
            --section-y: 86px;
          }

          .site-header {
            top: 8px;
            width: calc(100% - 16px);
            min-height: 60px;
            padding-left: 12px;
            border-radius: 18px;
          }

          .logo span {
            width: 32px;
            height: 32px;
            border-radius: 10px;
          }

          .logo strong {
            font-size: 20px;
          }

          .hero {
            gap: 26px;
            justify-content: flex-start;
            min-height: 100svh;
            padding-top: 104px;
            padding-bottom: 148px;
            background:
              radial-gradient(circle at 80% 20%, rgba(198, 94, 255, 0.22), transparent 38%),
              radial-gradient(circle at 10% 80%, rgba(91, 148, 255, 0.2), transparent 40%);
            border-radius: 0 0 40px 40px;
          }

          .hero-basket {
            right: 16px;
            bottom: 24px;
            width: 120px;
            height: 94px;
            opacity: 0.9;
          }

          .hero-basket-target {
            inset: 22px 4px 0;
          }

          .hero-basket-rim {
            border-width: 3px;
          }

          .hero-basket-label {
            font-size: 9px;
          }

          .hero-copy {
            width: 100%;
            max-width: 100%;
            overflow: hidden;
          }

          .hero h1 {
            max-width: 100%;
            font-size: clamp(22px, 7vw, 34px);
            line-height: 1.18;
            letter-spacing: -0.04em;
          }

          .title-line {
            white-space: normal;
          }

          .mobile-title-break {
            display: block;
          }

          .hero .hero-fade {
            opacity: 1;
            transform: none;
            animation: none;
          }

          .hero-lead {
            padding-left: 14px;
            font-size: clamp(20px, 5.8vw, 26px);
            line-height: 1.5;
            letter-spacing: -0.055em;
            border-left-color: var(--purple);
          }

          .hero-sub {
            width: min(100%, 340px);
            max-width: 100%;
            font-size: 16px;
            line-height: 1.8;
            overflow-wrap: anywhere;
            word-break: break-all;
          }

          .hero-desc {
            width: min(100%, 332px);
            max-width: 100%;
            font-size: 14px;
            line-height: 1.75;
            overflow-wrap: anywhere;
            word-break: break-all;
          }

          .hero-actions {
            width: min(100%, 340px);
          }

          .hero-actions .button {
            width: 100%;
            max-width: 100%;
            padding-inline: 14px;
          }


          .hero-device {
            position: relative;
            top: auto;
            left: auto;
            grid-column: 1 / -1;
            width: 100%;
            padding: 10px;
            border-radius: 28px;
            transform: none;
          }

          .dashboard-mock {
            padding: 14px;
            border-radius: 22px;
          }

          .mock-grid {
            grid-template-columns: 1fr;
          }

          .mock-event-row span {
            width: 82px;
          }

          .floating-card {
            position: relative;
            inset: auto !important;
            min-width: 0;
            padding: 12px 14px;
            border-radius: 16px;
            transform: none;
          }

          .floating-card b {
            font-size: 18px;
          }

          .section-title {
            font-size: clamp(34px, 11vw, 48px);
            line-height: 1.18;
            letter-spacing: -0.075em;
          }

          .booking-title {
            font-size: clamp(21px, 5.8vw, 30px);
            letter-spacing: -0.09em;
            white-space: nowrap;
          }

          .statement-inner {
            text-align: left;
          }

          .section-desc,
          .hero-desc {
            font-size: 15px;
          }

          .tool-stack {
            display: grid;
            min-height: auto;
            gap: 10px;
          }

          .tool-card,
          .tool-card:nth-child(n) {
            position: relative;
            inset: auto;
            width: 100%;
            transform: none;
          }

          .flow-stage.is-visible .tool-card {
            transform: translateY(0);
            opacity: 1;
          }

          .flow-copy {
            text-align: left;
          }

          .statement {
            border-radius: 30px;
          }

          .feature-track {
            grid-auto-columns: minmax(282px, 86vw);
            margin-inline: calc(var(--page-x) * -1);
            padding-inline: var(--page-x);
          }

          .feature-card {
            min-height: 438px;
          }

          .calendar-list article {
            grid-template-columns: 1fr;
          }

          .calendar-list time {
            color: var(--muted);
          }

          .event-status {
            width: fit-content;
          }

          .trust-metrics {
            grid-template-columns: 1fr;
          }

          .line-phone {
            width: 100%;
            padding: 10px;
            border-radius: 32px;
          }

          .line-screen {
            min-height: 560px;
            border-radius: 24px;
          }

          .fixed-mobile-cta {
            display: flex;
          }

          .site-footer {
            padding-bottom: 90px;
          }

          .phones-grid {
            flex-direction: column;
            align-items: center;
          }

          .phone-type-card {
            max-width: 300px;
          }

          .seo-card {
            border-radius: 28px;
            text-align: left;
          }

          .seo-card .section-desc {
            max-width: 100%;
          }
        }

        /* ② Booking */
        .booking-head {
          max-width: min(100%, 1040px);
          margin: 0 auto clamp(40px, 6vw, 64px);
          text-align: center;
        }

        .booking-title {
          white-space: nowrap;
          font-size: clamp(38px, 4.4vw, 62px);
        }

        .phones-grid {
          display: flex;
          gap: clamp(14px, 3vw, 28px);
          justify-content: center;
          align-items: flex-end;
        }

        .phone-type-card {
          flex: 1;
          max-width: 260px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        .phone-type-img {
          width: 100%;
          display: block;
          border-radius: 20px;
          box-shadow: var(--shadow);
        }

        .phone-type-info {
          text-align: center;
        }

        .phone-type-info b {
          display: block;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: -0.03em;
          margin-bottom: 5px;
        }

        .phone-type-info small {
          display: block;
          color: var(--muted);
          font-size: 13px;
          font-weight: 700;
          line-height: 1.65;
        }

        /* ③ Portal */
        .portal-section {
          padding-top: 0;
        }

        .portal-grid {
          display: grid;
          grid-template-columns: minmax(680px, 1.2fr) minmax(280px, 0.8fr);
          gap: 40px;
          align-items: center;
        }

        .portal-copy {
          max-width: 720px;
        }

        .portal-title {
          max-width: none;
          font-size: 44px;
          line-height: 1.14;
          letter-spacing: -0.06em;
          text-wrap: balance;
        }

        .portal-title .heading-line {
          display: block;
          white-space: nowrap;
        }

        .portal-body {
          display: grid;
          gap: 12px;
          max-width: 680px;
          margin-top: 24px;
          font-size: 17px;
          font-weight: 650;
          line-height: 1.95;
          color: #53617f;
          word-break: keep-all;
          overflow-wrap: break-word;
          text-wrap: pretty;
        }

        .portal-body p {
          margin: 0;
        }

        .portal-body p:first-child {
          color: var(--ink);
          font-weight: 900;
          line-height: 1.75;
        }

        .text-term {
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .portal-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }

          .portal-title {
            font-size: 30px;
            line-height: 1.14;
          }

          .portal-title .heading-line {
            white-space: normal;
          }

          .portal-body {
            font-size: 14px;
            line-height: 1.85;
            gap: 10px;
          }
        }

        .portal-img {
          width: auto;
          height: min(72vh, 720px);
          max-width: 100%;
          display: block;
          border-radius: 24px;
          box-shadow: var(--shadow);
          object-fit: contain;
          margin: 0 auto;
        }

        @media (max-width: 640px) {
          .portal-img {
            width: min(100%, 320px);
            height: auto;
          }
        }

        /* ④ LINE Remind */
        .remind-section {
          padding-top: 0;
        }

        .remind-grid {
          display: flex;
          flex-direction: column;
          gap: 38px;
          align-items: stretch;
        }

        .remind-heading {
          text-align: center;
        }

        .remind-heading .section-label {
          margin-inline: auto;
        }

        .remind-title {
          max-width: none;
          font-size: 46px;
          line-height: 1.14;
          letter-spacing: -0.06em;
          white-space: nowrap;
        }

        .remind-content {
          display: grid;
          grid-template-columns: minmax(500px, 1fr) minmax(340px, 0.92fr);
          gap: 48px;
          align-items: center;
        }

        .remind-copy {
          max-width: 640px;
        }

        .remind-body {
          display: grid;
          gap: 12px;
          color: #53617f;
          font-size: 17px;
          font-weight: 650;
          line-height: 1.95;
          word-break: keep-all;
          overflow-wrap: break-word;
          text-wrap: pretty;
        }

        .remind-body p {
          margin: 0;
        }

        .remind-body p:first-child {
          color: var(--ink);
          font-weight: 900;
          line-height: 1.75;
        }

        .remind-img {
          width: min(100%, 500px);
          display: block;
          border-radius: 24px;
          box-shadow: var(--shadow);
          margin: 0 auto;
        }

        @media (max-width: 640px) {
          .remind-grid {
            gap: 24px;
          }

          .remind-heading {
            text-align: left;
          }

          .remind-heading .section-label {
            margin-inline: 0;
          }

          .remind-title {
            font-size: 30px;
            line-height: 1.14;
            white-space: normal;
          }

          .remind-content {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .remind-body {
            font-size: 14px;
            line-height: 1.85;
            gap: 10px;
          }
        }

        /* ⑤ SEO */
        .seo-card {
          padding: clamp(44px, 7vw, 88px) clamp(28px, 6vw, 88px);
          background:
            radial-gradient(circle at 14% 14%, rgba(255, 255, 255, 0.92), transparent 28%),
            radial-gradient(circle at 86% 18%, rgba(202, 247, 224, 0.8), transparent 30%),
            radial-gradient(circle at 70% 92%, rgba(255, 213, 235, 0.72), transparent 32%),
            linear-gradient(135deg, #dfeaff 0%, #f3e9ff 54%, #fff1f8 100%);
          border: 1px solid rgba(255, 255, 255, 0.82);
          border-radius: 40px;
          color: var(--ink);
          text-align: center;
          box-shadow: 0 26px 80px rgba(73, 82, 152, 0.16);
        }

        .seo-card .section-label {
          background: rgba(255, 255, 255, 0.76);
          border-color: rgba(143, 170, 255, 0.32);
          color: #3353d8;
        }

        .seo-card .section-label::before {
          background: var(--lime);
        }

        .seo-card .section-title {
          color: var(--ink);
        }

        .seo-card .section-desc {
          max-width: 600px;
          margin: 0 auto;
          color: #53617f;
        }

        .website-card {
          display: flex;
          flex-direction: column;
          gap: 38px;
          align-items: stretch;
          text-align: left;
          overflow: hidden;
        }

        .website-heading {
          text-align: center;
        }

        .website-heading .section-label {
          margin-inline: auto;
        }

        .website-copy {
          width: 100%;
          max-width: 640px;
        }

        .website-card .section-title {
          max-width: none;
          font-size: 56px;
          line-height: 1.08;
          white-space: nowrap;
        }

        .website-content {
          display: grid;
          grid-template-columns: minmax(500px, 1.14fr) minmax(340px, 0.86fr);
          gap: 40px;
          align-items: center;
        }

        .website-body {
          display: grid;
          gap: 12px;
          max-width: 620px;
          margin-top: 0;
          color: #53617f;
          font-size: 16px;
          font-weight: 650;
          line-height: 1.9;
          word-break: keep-all;
          overflow-wrap: break-word;
          text-wrap: pretty;
        }

        .website-body p {
          margin: 0;
        }

        .website-body p:first-child {
          color: var(--ink);
          font-size: 17px;
          font-weight: 900;
          line-height: 1.65;
        }

        .website-body .text-term {
          white-space: nowrap;
        }

        .website-mock-wrap {
          width: 100%;
          padding: clamp(10px, 1.6vw, 18px);
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.86);
          border-radius: 28px;
          box-shadow: 0 24px 70px rgba(65, 78, 156, 0.15);
          backdrop-filter: blur(16px);
        }

        .website-mock-img {
          width: 100%;
          display: block;
          border-radius: 20px;
          box-shadow: 0 18px 48px rgba(65, 78, 156, 0.16);
        }

        /* B: Feature story sections — vertical snap */
        .h-scroll-outer,
        .h-scroll-sticky,
        .h-scroll-track {
          display: contents;
        }

        .h-panel {
          position: relative;
          width: 100%;
          height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }

        .h-panel-inner {
          width: 100%;
          max-width: 1180px;
          padding: 0 var(--page-x);
        }

        /* D: panel backgrounds */
        .h-panel:nth-child(1) { background: linear-gradient(135deg, #f0f6ff 0%, #f7efff 52%, #fff3fb 100%); }
        .h-panel:nth-child(2) { background: linear-gradient(135deg, #fff2fa 0%, #f3efff 52%, #eef9ff 100%); }
        .h-panel:nth-child(3) { background: linear-gradient(135deg, #f0fff8 0%, #edf4ff 56%, #fff1f7 100%); }
        .h-panel:nth-child(4) { background: linear-gradient(135deg, #f8fbff 0%, #f5fff8 54%, #fff6ea 100%); }

        .h-panel:nth-child(1) .seo-card,
        .h-panel:nth-child(4) .seo-card {
          background: transparent;
          box-shadow: none;
          border-radius: 0;
          border: none;
          padding: 0;
        }

        /* Page dots — vertical side nav */
        .page-dots {
          position: fixed;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 200;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0;
          margin: 0;
          list-style: none;
        }

        .page-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(7, 16, 51, 0.2);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: background 0.25s, transform 0.25s;
        }

        .page-dot.active {
          background: var(--blue);
          transform: scale(1.5);
        }

        /* Mobile: smaller panels allowed to scroll within */
        @media (max-width: 768px) {
          .h-panel { height: auto; min-height: 100dvh; overflow-y: auto; scroll-snap-align: start; }
          .page-dots { display: none; }
          .website-card {
            gap: 24px;
          }

          .website-heading {
            text-align: left;
          }

          .website-heading .section-label {
            margin-inline: 0;
          }

          .website-card .section-title {
            font-size: 32px;
            white-space: nowrap;
            letter-spacing: -0.07em;
          }

          .website-content {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .website-body {
            font-size: 14px;
            line-height: 1.85;
            gap: 10px;
          }

          .website-body p:first-child {
            font-size: 16px;
          }

          .website-mock-wrap {
            width: 100%;
            border-radius: 22px;
          }

          .website-mock-img {
            border-radius: 16px;
          }

          .h-panel:nth-child(4) .seo-card {
            background:
              radial-gradient(circle at 14% 14%, rgba(255,255,255,0.92), transparent 28%),
              radial-gradient(circle at 86% 18%, rgba(202,247,224,0.8), transparent 30%),
              radial-gradient(circle at 70% 92%, rgba(255,213,235,0.72), transparent 32%),
              linear-gradient(135deg, #dfeaff 0%, #f3e9ff 54%, #fff1f8 100%);
            box-shadow: 0 26px 80px rgba(73,82,152,0.16);
            border-radius: 40px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }

          .reveal,
          .bubble,
          .title-line,
          .hero-fade,
          .lr {
            opacity: 1 !important;
            transform: none !important;
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <main className="comiu-lp" id="top">
        <PageFX />

        <header className="site-header">
          <Logo />
          <nav className="desktop-nav" aria-label="主要ナビゲーション">
            <a href="#future">できること</a>
            <a href="#future">導入メリット</a>
            <a className="nav-cta" href="/register" data-cursor="CREATE">
              無料でCOMIUを始める
            </a>
          </nav>
          <button
            className="menu-button"
            type="button"
            aria-label="メニューを開閉"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </header>

        <nav className={`mobile-nav ${menuOpen ? "is-open" : ""}`} aria-label="モバイルナビゲーション">
          <a href="#future" onClick={closeMenu}>
            できること
          </a>
          <a href="#future" onClick={closeMenu}>
            導入メリット
          </a>
          <a className="nav-cta" href="/register" onClick={closeMenu}>
            無料で団体ページを作る
          </a>
        </nav>

        <section className="lp-section hero hero-slide snap-page">
          <div className="hero-copy">
            <h1>
              <span className="hero-line-wrap"><span className="title-line">イベント・サークルの<br className="mobile-title-break" />集客なら<wbr /><span className="accent">COMIU</span></span></span>
            </h1>
            <p className="hero-sub hero-fade" style={{ "--fd": "0.8s" } as React.CSSProperties}>
              掲載用のホームページなら、もういらない。<br />
              Webサイトを、<strong>育てるWebアプリケーション</strong>へ。
            </p>
            <p className="hero-desc hero-fade" style={{ "--fd": "1.0s" } as React.CSSProperties}>
              サークル活動、ボタンティア団体、スポーツ、新入生歓迎会、ビジネス交流会、パーティー、クラブイベント。
              学生団体からイベント主催者まで、集客と運営をひとつの仕組みに。
            </p>
            <div className="hero-actions hero-fade" style={{ "--fd": "1.2s" } as React.CSSProperties}>
              <a className="button button-primary" href="/register">
                無料でCOMIUを始める
              </a>
            </div>
          </div>
          <div className="hero-basket" aria-hidden="true">
            <span className="hero-basket-glow" />
            <span className="hero-basket-label">GOAL</span>
            <span className="hero-basket-target">
              <span className="hero-basket-body" />
              <span className="hero-basket-rim" />
            </span>
          </div>
        </section>

        {/* Vertical page dots */}
        <nav className="page-dots" aria-label="ページナビゲーション">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              className={`page-dot${activePage === i ? " active" : ""}`}
              aria-label={`ページ ${i + 1}`}
              onClick={() => {
                const pages = document.querySelectorAll<HTMLElement>(".snap-page");
                pages[i]?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          ))}
        </nav>

        {/* B: 縦スナップ — ②③④⑤ */}
        <div className="h-scroll-outer" id="future">
          <div className="h-scroll-sticky">
            <div className="h-scroll-track">

              {/* Panel ②: WEBサイト作成 */}
              <section className="h-panel snap-page" aria-labelledby="seo-title">
                <div className="h-panel-inner">
                  <div className="seo-card website-card">
                    <div className="website-heading">
                      <SectionLabel>WEBサイト作成</SectionLabel>
                      <h2 className="section-title website-title" id="seo-title">
                        WEBサイトを無料作成
                      </h2>
                    </div>
                    <div className="website-content">
                      <div className="website-copy">
                        <div className="website-body">
                          <p>団体の個性に合わせて、自由に編集できる<span className="text-term">ホームページ！</span></p>
                          <p>初めての方は、SEO専任の担当者が初回ヒアリングから、初回<span className="text-term">WEBサイト</span>の作成までサポートします。</p>
                          <p>活動内容、写真、予約導線、ブログをひとつにまとめて、初めて見る人にも雰囲気と信頼が伝わるページへ。</p>
                          <p>作って終わりではなく、更新するほど団体の実績が積み上がる<span className="text-term">WEBサイト</span>です。</p>
                        </div>
                      </div>
                      <div className="website-mock-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/バドミントンサークルウェブデザイン展示.svg" alt="団体WEBサイトの作成イメージ" className="website-mock-img" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Panel ③: ポータル */}
              <section className="h-panel snap-page" aria-labelledby="portal-title">
                <div className="h-panel-inner">
                  <div className="portal-grid">
                    <div className="portal-copy">
                      <SectionLabel>ポータル掲載</SectionLabel>
                      <h2 className="section-title portal-title" id="portal-title">
                        <span className="heading-line">サークルや団体の活動やブログが</span>
                        <span className="heading-line">ポータルサイトに自動反映</span>
                      </h2>
                      <div className="portal-body">
                        <p>イベント募集や活動ブログを更新すると、COMIUのポータルサイトにも自動で掲載されます。</p>
                        <p>InstagramやXの投稿は時間が経つと流れてしまいますが、COMIUなら活動内容や開催実績を、検索される場所に残していけます。</p>
                        <p>新歓、スポーツイベント、交流会、BBQ、ボランティア活動など、日々の活動をこつこつ更新することで、初めて見る人にも団体の雰囲気や信頼感が伝わります。</p>
                        <p>開催するたびに情報が積み上がり、次の参加者に見つけてもらいやすい団体へ育っていきます。</p>
                      </div>
                    </div>
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/COMIUスマホモックアップ.svg" alt="COMIUポータルサイト" className="portal-img" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Panel ④: 公式LINEからワンタップ予約 */}
              <section className="h-panel snap-page" aria-labelledby="booking-title">
                <div className="h-panel-inner">
                  <div className="booking-head">
                    <h2 className="section-title booking-title" id="booking-title">
                      公式LINEからワンタップ予約
                    </h2>
                    <p className="section-desc" style={{ maxWidth: 760, margin: "0 auto" }}>
                      公式LINEのリッチメニューや予約URLから直接予約。<br />
                      3タイプから、活動スタイルに合わせて選べる日程表。LINE認証でユーザーを識別し、ドタキャンが多いユーザーや悪質なユーザーにラベルを貼ることで、COMIU全体で参加者の質を担保します。
                    </p>
                  </div>
                  <div className="phones-grid">
                    {[
                      { src: "/shuttles-calendar.svg", label: "カレンダー", desc: "同じ活動が重なる時や回数が多い主催向け" },
                      { src: "/shuttles-event-cards.svg", label: "カード", desc: "画像でイメージをしっかり伝えたい主催向け" },
                      { src: "/shuttles-schedule-cards.svg", label: "スレッド", desc: "詳細をしっかり見せたい主催向け" },
                    ].map(({ src, label, desc }) => (
                      <div key={label} className="phone-type-card">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={label} className="phone-type-img" />
                        <div className="phone-type-info">
                          <b>{label}</b>
                          <small>{desc}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Panel ⑤: LINEリマインド */}
              <section className="h-panel snap-page" aria-labelledby="remind-title">
                <div className="h-panel-inner">
                  <div className="remind-grid">
                    <div className="remind-heading">
                      <SectionLabel>自動リマインド</SectionLabel>
                      <h2 className="section-title remind-title" id="remind-title">
                        アプリと公式LINEでリマインドを自動化
                      </h2>
                    </div>
                    <div className="remind-content">
                      <div className="remind-copy">
                        <div className="remind-body">
                          <p>予約完了のお知らせ、イベント詳細、前日のリマインドを、アプリと<span className="text-term">公式LINE</span>から自動で届けられます。</p>
                          <p>参加者が30〜100人を超えてくると、個別連絡や確認作業だけで運営が重くなります。COMIUなら案内漏れや「明日ありますか？」という問い合わせを減らせます。</p>
                          <p>事前決済や、PayPay決済確認後の受付承認にも対応。参加者への案内から当日の受付まで、主催者の負担を小さくします。</p>
                          <p>初回は画面共有で使い方のレクチャーも行うので、はじめての団体でも安心して始められます。</p>
                        </div>
                      </div>
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/comiu-line-reminder.svg" alt="LINE自動リマインド" className="remind-img" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>

        <a className="fixed-mobile-cta" href="/register">
          無料で団体ページを作る
        </a>

        <footer className="site-footer snap-page">
          <div className="footer-cta">
            <p className="footer-cta-eyebrow">さあ、始めよう</p>
            <h2 className="footer-cta-title">まずは無料で<br />始めてみよう</h2>
            <p className="footer-cta-desc">クレジットカード不要。団体ページを数分で作れます。</p>
            <a className="button button-primary footer-cta-btn" href="/register">
              無料でCOMIUを始める
            </a>
          </div>
          <div className="footer-bottom">
            <Logo />
            <p>© 2026 COMIU. 団体運営を、続いていくコミュニティへ。</p>
          </div>
        </footer>
      </main>
    </>
  );
}
