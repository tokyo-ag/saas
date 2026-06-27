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

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const header = document.querySelector<HTMLElement>(".site-header");
    const fixedCta = document.querySelector<HTMLElement>(".fixed-mobile-cta");
    const footer = document.querySelector<HTMLElement>(".site-footer");
    const finalCta = document.querySelector<HTMLElement>(".final-cta");

    // Reveal sections and staged UI pieces as they enter the viewport.
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" }
    );

    document.querySelectorAll<HTMLElement>(".reveal, .flow-stage, .line-phone").forEach((element) => {
      revealObserver.observe(element);
    });

    // Keep the header readable after scrolling.
    const handleScroll = () => {
      header?.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    // Hide the mobile fixed CTA near the final CTA/footer so it does not cover content.
    const ctaObserver = new IntersectionObserver(
      (entries) => {
        const shouldHide = entries.some((entry) => entry.isIntersecting);
        fixedCta?.classList.toggle("is-hidden", shouldHide);
      },
      { threshold: 0.1 }
    );

    const heroActions = document.querySelector<HTMLElement>(".hero-actions");
    if (heroActions) ctaObserver.observe(heroActions);
    if (footer) ctaObserver.observe(footer);
    if (finalCta) ctaObserver.observe(finalCta);

    return () => {
      revealObserver.disconnect();
      ctaObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);
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
        }

        body {
          margin: 0;
          overflow-x: hidden;
          background: #fbfdff;
          color: var(--ink);
          font-family: Inter, "Noto Sans JP", system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        body:has(.comiu-lp) {
          background: #fbfdff;
        }

        a {
          color: inherit;
        }

        button {
          font: inherit;
        }

        .comiu-lp {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(circle at var(--g1x, 12%) var(--g1y, 5%),  rgba(91, 148, 255, 0.32), transparent 26%),
            radial-gradient(circle at var(--g2x, 90%) var(--g2y, 8%),  rgba(198, 94, 255, 0.26), transparent 28%),
            radial-gradient(circle at var(--g3x, 52%) var(--g3y, 95%), rgba(255, 110, 190, 0.18), transparent 32%),
            radial-gradient(circle at var(--g4x, 8%)  var(--g4y, 68%), rgba(19, 200, 106, 0.12), transparent 24%),
            #f8f9ff;
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
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 100svh;
          padding-top: 142px;
          padding-bottom: 60px;
        }

        .hero-copy {
          max-width: 860px;
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
        .statement h2,
        .final h2 {
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
          color: #fff;
          background:
            radial-gradient(circle at 15% 18%, rgba(114, 141, 255, 0.45), transparent 28%),
            radial-gradient(circle at 85% 24%, rgba(223, 255, 79, 0.16), transparent 28%),
            linear-gradient(135deg, #081037, #17215a 54%, #3d2b8c);
          border-radius: 46px;
          box-shadow: 0 26px 80px rgba(12, 18, 58, 0.22);
        }

        .statement::before {
          position: absolute;
          top: -160px;
          left: 50%;
          width: 780px;
          height: 780px;
          content: "";
          background: conic-gradient(from 90deg, transparent, rgba(255, 255, 255, 0.17), transparent, rgba(223, 255, 79, 0.14), transparent);
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
          color: var(--lime);
        }

        .statement p {
          color: rgba(255, 255, 255, 0.78);
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
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.16);
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
          background: linear-gradient(135deg, #081037, #1c2b71);
          border-radius: 30px;
          color: #fff;
          text-align: center;
          font-size: clamp(20px, 2.4vw, 32px);
          line-height: 1.7;
          font-weight: 950;
        }

        .future-message strong {
          color: var(--lime);
        }

        .final {
          width: min(1180px, calc(100% - var(--page-x) * 2));
          margin: 0 auto var(--section-y);
          padding: clamp(44px, 7vw, 84px) clamp(22px, 6vw, 80px);
          overflow: hidden;
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.34), transparent 22%),
            radial-gradient(circle at 84% 30%, rgba(223, 255, 79, 0.28), transparent 28%),
            linear-gradient(120deg, #125bff, #8f4dff);
          border-radius: 38px;
          color: #fff;
          text-align: center;
          box-shadow: 0 34px 84px rgba(66, 85, 235, 0.28);
        }

        .final h2 {
          margin-bottom: 20px;
          font-size: clamp(38px, 6vw, 72px);
          line-height: 1.18;
          font-weight: 950;
        }

        .final p {
          width: min(680px, 100%);
          margin: 0 auto 28px;
          color: rgba(255, 255, 255, 0.84);
          font-size: clamp(16px, 2vw, 22px);
          line-height: 1.9;
          font-weight: 750;
        }

        .final .button-primary {
          min-height: 66px;
          padding-inline: 34px;
          color: var(--ink);
          background: var(--yellow);
          box-shadow: 0 18px 38px rgba(255, 242, 62, 0.28);
        }

        .free-tags {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-top: 24px;
        }

        .free-tags span {
          min-height: 44px;
          padding: 12px 18px;
          color: #fff;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 999px;
          font-weight: 900;
        }

        .site-footer {
          position: relative;
          z-index: 1;
          width: min(1180px, calc(100% - var(--page-x) * 2));
          margin: 0 auto;
          padding: 28px 0 42px;
          color: var(--muted);
          border-top: 1px solid var(--line);
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
            padding-top: 104px;
            padding-bottom: 56px;
            background:
              radial-gradient(circle at 80% 20%, rgba(198, 94, 255, 0.22), transparent 38%),
              radial-gradient(circle at 10% 80%, rgba(91, 148, 255, 0.2), transparent 40%);
            border-radius: 0 0 40px 40px;
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

          .hero-lead {
            padding-left: 14px;
            font-size: clamp(20px, 5.8vw, 26px);
            line-height: 1.5;
            letter-spacing: -0.055em;
            border-left-color: var(--purple);
          }

          .hero-sub {
            font-size: 16px;
            line-height: 1.8;
          }

          .hero-actions .button {
            width: 100%;
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

          .statement-inner,
          .final {
            text-align: left;
          }

          .final .button-primary {
            width: 100%;
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

          .feature-pair {
            grid-template-columns: 1fr;
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
          max-width: 720px;
          margin: 0 auto clamp(40px, 6vw, 64px);
          text-align: center;
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
          grid-template-columns: 0.85fr 1fr;
          gap: clamp(36px, 6vw, 80px);
          align-items: center;
        }

        .portal-img {
          width: 100%;
          display: block;
          border-radius: 24px;
          box-shadow: var(--shadow);
        }

        /* ④ LINE Remind */
        .remind-section {
          padding-top: 0;
        }

        .remind-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(36px, 6vw, 80px);
          align-items: center;
        }

        .remind-img {
          width: 100%;
          display: block;
          border-radius: 24px;
          box-shadow: var(--shadow);
        }

        /* ⑤ SEO */
        .seo-card {
          padding: clamp(44px, 7vw, 88px) clamp(28px, 6vw, 88px);
          background:
            radial-gradient(circle at 15% 18%, rgba(114, 141, 255, 0.45), transparent 28%),
            linear-gradient(135deg, #081037, #17215a 54%, #3d2b8c);
          border-radius: 40px;
          color: #fff;
          text-align: center;
          box-shadow: 0 26px 80px rgba(12, 18, 58, 0.22);
        }

        .seo-card .section-label {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.18);
          color: rgba(255, 255, 255, 0.88);
        }

        .seo-card .section-label::before {
          background: var(--lime);
        }

        .seo-card .section-title {
          color: #fff;
        }

        .seo-card .section-desc {
          max-width: 600px;
          margin: 0 auto;
          color: rgba(255, 255, 255, 0.76);
        }

        /* ⑥ Feature pair */
        .feature-pair {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 36px;
        }

        .pair-card {
          padding: clamp(28px, 4vw, 42px);
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 28px;
          box-shadow: var(--shadow-soft);
        }

        .pair-card-icon {
          display: inline-flex;
          min-height: 40px;
          align-items: center;
          padding: 0 14px;
          color: #fff;
          background: linear-gradient(135deg, var(--blue), var(--purple));
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.04em;
          margin-bottom: 20px;
          box-shadow: 0 8px 20px rgba(46, 92, 255, 0.22);
        }

        .pair-card h3 {
          font-size: clamp(19px, 2vw, 24px);
          line-height: 1.42;
          letter-spacing: -0.04em;
          margin-bottom: 12px;
        }

        .pair-card p {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.85;
          font-weight: 650;
          margin: 0;
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
            <a href="#features">できること</a>
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
          <a href="#features" onClick={closeMenu}>
            できること
          </a>
          <a href="#future" onClick={closeMenu}>
            導入メリット
          </a>
          <a className="nav-cta" href="/register" onClick={closeMenu}>
            無料で団体ページを作る
          </a>
        </nav>

        <section className="lp-section hero">
          <div className="hero-copy">
            <h1>
              <span className="hero-line-wrap"><span className="title-line">イベント・サークルの集客なら<wbr /><span className="accent">COMIU</span></span></span>
            </h1>
            <p className="hero-sub hero-fade" style={{ "--fd": "0.8s" } as React.CSSProperties}>
              掲載用のホームページなら、もういらない。<br />
              Webサイトを、<strong>育てるWebアプリケーション</strong>へ。
            </p>
            <p className="hero-desc hero-fade" style={{ "--fd": "1.0s" } as React.CSSProperties}>
              サークル活動、ボタンティア団体、スポーツ、新入生歓迎会、ビジネス交流会、パーティー、クラブイベント。<br />
              学生団体からイベント主催者まで、集客と運営をひとつの仕組みに。
            </p>
            <div className="hero-actions hero-fade" style={{ "--fd": "1.2s" } as React.CSSProperties}>
              <a className="button button-primary" href="/register">
                無料でCOMIUを始める
              </a>
            </div>
          </div>
        </section>

        {/* ② 公式LINEからワンタップ予約 */}
        <section className="lp-section" aria-labelledby="booking-title">
          <div className="booking-head reveal">
            <SectionLabel>ONE-TAP BOOKING</SectionLabel>
            <h2 className="section-title" id="booking-title">
              <span className="lr-wrap"><span className="lr">公式LINEから、</span></span>
              <span className="lr-wrap"><span className="lr">ワンタップで予約</span></span>
            </h2>
            <p className="section-desc" style={{ maxWidth: 640, margin: "0 auto" }}>
              <span className="lr-wrap"><span className="lr">公式LINEのリッチメニューや予約URLから直接予約。</span></span>
              <span className="lr-wrap"><span className="lr">３タイプから、活動スタイルに合わせて選べる日程表！</span></span>
            </p>
          </div>
          <div className="phones-grid reveal">
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
        </section>

        {/* ③ 活動実績・ブログ → ポータルサイト */}
        <section className="lp-section portal-section" aria-labelledby="portal-title">
          <div className="portal-grid">
            <div className="reveal">
              <SectionLabel>PORTAL & BLOG</SectionLabel>
              <h2 className="section-title" id="portal-title">
                活動実績やブログが、直接ポータルサイトに反映。
              </h2>
              <p className="section-desc">
                コツコツ活動するほど、集客力や認知拡大につながります。SNS投稿は流れていく。でも、COMIUに積み上がった実績は残り続ける。
              </p>
            </div>
            <div className="reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/comiu_portal_mockup.svg" alt="COMIUポータルサイト" className="portal-img" />
            </div>
          </div>
        </section>

        {/* ④ 公式LINEリマインド */}
        <section className="lp-section remind-section" aria-labelledby="remind-title">
          <div className="remind-grid">
            <div className="reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/comiu-line-reminder.svg" alt="LINE自動リマインド" className="remind-img" />
            </div>
            <div className="reveal">
              <SectionLabel>LINE REMIND</SectionLabel>
              <h2 className="section-title" id="remind-title">
                公式LINEのリマインドサービス
              </h2>
              <p className="section-desc">
                予約完了後の案内から、イベント前日のリマインドまで公式LINEで自動送信。参加者の不安を減らし、直前キャンセルも防げます。
              </p>
            </div>
          </div>
        </section>

        {/* ⑤ SEO・初回無料サポート */}
        <section className="lp-section" aria-labelledby="seo-title">
          <div className="seo-card reveal">
            <SectionLabel>FREE SUPPORT</SectionLabel>
            <h2 className="section-title" id="seo-title">
              初めての主催でも、安心してスタート。
            </h2>
            <p className="section-desc">
              SEO専任担当者による丁寧なカウンセリングと、初回Webサイト構築を無料でサポート。イベントやサークルの主催が初めての方でも、すぐに始められます。
            </p>
          </div>
        </section>

        {/* ⑥ 予約管理・事前決済 + LINE認証 */}
        <section className="lp-section" id="features" aria-labelledby="features-title">
          <div className="reveal">
            <SectionLabel>FEATURES</SectionLabel>
            <h2 className="section-title" id="features-title">
              運営をまとめて、団体を育てる
            </h2>
          </div>
          <div className="feature-pair">
            <div className="pair-card reveal">
              <div className="pair-card-icon">予約</div>
              <h3>イベントの予約管理・事前決済</h3>
              <p>参加人数・キャンセル・参加者名簿・事前決済をひとつにまとめて管理。フォームとスプレッドシートを行き来しない運営へ。</p>
            </div>
            <div className="pair-card reveal">
              <div className="pair-card-icon">LINE</div>
              <h3>LINE認証でユーザーを管理できる</h3>
              <p>LINE認証を使った参加者管理で、なりすましや複数申込み問題を解消。安心して予約を受け付けられます。</p>
            </div>
          </div>
        </section>

        <section className="final final-cta reveal" aria-labelledby="final-title">
          <h2 id="final-title">あなたの団体を、次の参加者に選ばれる場所へ。</h2>
          <p>
            団体ページ、イベント募集、予約管理、LINE連携。
            まずは無料で、あなたの団体に合ったページを作成しましょう。
          </p>
          <a className="button button-primary" href="/register" data-cursor="CREATE">
            無料で団体ページを作る
          </a>
          <div className="free-tags" aria-label="無料で始めやすい理由">
            <span>登録無料</span>
            <span>初期費用なし</span>
            <span>専門知識不要</span>
          </div>
        </section>

        <footer className="site-footer">
          <Logo />
          <p>© 2026 COMIU. 団体運営を、続いていくコミュニティへ。</p>
        </footer>

        <a className="fixed-mobile-cta" href="/register">
          無料で団体ページを作る
        </a>
      </main>
    </>
  );
}
