"use client";

import { useEffect, useState } from "react";

const features = [
  {
    no: "01",
    title: "団体ページを\n無料で作成",
    text: "活動写真、イベント予定、よくある質問、実績。初めての人にも、雰囲気と信頼感が伝わる場所を。",
    type: "site",
    color: "blue",
  },
  {
    no: "02",
    title: "イベント募集を\nまとめる",
    text: "募集人数、参加費、場所、持ち物をひとつのページに。毎回の告知を、参加につながる導線へ。",
    type: "event",
    color: "lime",
  },
  {
    no: "03",
    title: "ポータルで\n見つけてもらう",
    text: "イベントを登録すると、COMIU内のポータルにも掲載。新しい参加者に届く機会を増やします。",
    type: "portal",
    color: "purple",
  },
  {
    no: "04",
    title: "予約を\n管理する",
    text: "参加人数、定員、キャンセル、参加者名簿をまとめて管理。フォームと表を行き来しない運営へ。",
    type: "list",
    color: "orange",
  },
  {
    no: "05",
    title: "公式LINEで\n自動リマインド",
    text: "予約後の案内やイベント前日の通知を自動化。問い合わせと連絡漏れを減らします。",
    type: "line",
    color: "green",
  },
  {
    no: "06",
    title: "事前決済に\n対応",
    text: "申込みから支払いまでスムーズに。当日の集金・未払い確認を減らして、イベントに集中。",
    type: "payment",
    color: "pink",
  },
];

function Logo() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <i />
        <i />
        <i />
      </span>
      <strong>COMIU</strong>
    </span>
  );
}

function MiniMock({ type }: { type: string }) {
  if (type === "site") {
    return (
      <div className="mini-mock mini-site">
        <div className="mini-cover" />
        <b>インカレサークル BELL</b>
        <span>活動中のイベント　3件</span>
        <div className="mini-tags">
          <em>バドミントン</em>
          <em>交流会</em>
        </div>
      </div>
    );
  }

  if (type === "event") {
    return (
      <div className="mini-mock mini-event">
        <small>7 / 13 SUN</small>
        <b>バドミントン交流会</b>
        <span>残り8名</span>
        <button>予約する →</button>
      </div>
    );
  }

  if (type === "portal") {
    return (
      <div className="mini-mock mini-portal">
        <small>人気のイベント</small>
        <b>週末のスポーツ交流会</b>
        <span>初心者歓迎　池袋</span>
        <div className="portal-avatars">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    );
  }

  if (type === "list") {
    return (
      <div className="mini-mock mini-list">
        <span>
          <i /> 佐藤 みなみ <b>初参加</b>
        </span>
        <span>
          <i /> 田中 こうた <b>予約済み</b>
        </span>
        <span>
          <i /> 鈴木 りお <b>決済済み</b>
        </span>
      </div>
    );
  }

  if (type === "line") {
    return (
      <div className="mini-mock mini-line">
        <small>COMIU公式LINE</small>
        <b>明日はバドミントン交流会です！</b>
        <span>会場：池袋駅東口 徒歩5分</span>
        <em>既読 38　18:02</em>
      </div>
    );
  }

  return (
    <div className="mini-mock mini-payment">
      <small>お支払い完了</small>
      <b>¥ 1,500</b>
      <span>✓</span>
      <em>カード決済済み</em>
    </div>
  );
}

export default function ComiuLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    const fixedCta = document.querySelector<HTMLElement>(".mobile-fixed-cta");
    const cta = document.querySelector<HTMLElement>("#cta");
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const onScroll = () => {
      header?.classList.toggle("scrolled", window.scrollY > 10);
    };

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll<HTMLElement>(".reveal").forEach((element) => {
      revealObserver.observe(element);
    });

    const ctaObserver = new IntersectionObserver(
      (entries) => {
        fixedCta?.classList.toggle("hide", entries[0].isIntersecting);
      },
      { threshold: 0.15 }
    );

    if (cta) ctaObserver.observe(cta);

    const stage = document.querySelector<HTMLElement>(".hero-stage");
    const dashboard = document.querySelector<HTMLElement>(".dashboard-card");

    const moveDashboard = (event: MouseEvent) => {
      if (!stage || !dashboard || !canHover) return;

      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      dashboard.style.transform = `
        translateX(-50%)
        rotateY(${x * 8}deg)
        rotateX(${y * -7}deg)
        translateZ(8px)
      `;
    };

    const resetDashboard = () => {
      if (dashboard) {
        dashboard.style.transform =
          "translateX(-50%) rotateY(0deg) rotateX(0deg) translateZ(0)";
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    if (canHover && stage) {
      stage.addEventListener("mousemove", moveDashboard);
      stage.addEventListener("mouseleave", resetDashboard);
    }

    onScroll();

    return () => {
      revealObserver.disconnect();
      ctaObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      stage?.removeEventListener("mousemove", moveDashboard);
      stage?.removeEventListener("mouseleave", resetDashboard);
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        :root {
          --ink: #111a3b;
          --muted: #68728f;
          --blue: #4263ff;
          --purple: #7f68ff;
          --lime: #d7ff55;
          --orange: #ff9b60;
          --pink: #ff76b6;
          --green: #29c76f;
          --line: #e7eaf8;
          --surface: #f7f8ff;
          --shadow: 0 22px 60px rgba(42, 56, 130, 0.14);
          --radius: 28px;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #fff;
          color: var(--ink);
          font-family: Inter, "Noto Sans JP", system-ui, sans-serif;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        a {
          color: inherit;
        }

        button {
          font: inherit;
        }

        .page-noise {
          position: fixed;
          inset: 0;
          z-index: 100;
          pointer-events: none;
          opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        .shell {
          width: min(1160px, calc(100% - 48px));
          margin: 0 auto;
        }

        .site-header {
          position: fixed;
          top: 13px;
          left: 50%;
          z-index: 50;
          width: min(1200px, calc(100% - 32px));
          height: 72px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transform: translateX(-50%);
          border: 1px solid transparent;
          transition: 0.28s ease;
        }

        .site-header.scrolled {
          border-color: rgba(215, 220, 242, 0.9);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 10px 30px rgba(37, 48, 110, 0.08);
          backdrop-filter: blur(18px);
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          font-size: 20px;
          letter-spacing: -0.07em;
        }

        .brand-mark {
          display: inline-flex;
          align-items: flex-end;
          gap: 3px;
          width: 24px;
          height: 24px;
        }

        .brand-mark i {
          display: block;
          width: 6px;
          border-radius: 8px;
          background: var(--blue);
          transform: skewY(-12deg);
        }

        .brand-mark i:nth-child(1) {
          height: 11px;
        }

        .brand-mark i:nth-child(2) {
          height: 18px;
          background: var(--purple);
        }

        .brand-mark i:nth-child(3) {
          height: 23px;
          background: var(--lime);
        }

        .nav {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav a {
          color: #394361;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
        }

        .nav-cta {
          padding: 11px 15px;
          color: #fff !important;
          background: var(--ink);
          border-radius: 12px;
        }

        .nav-cta b {
          color: var(--lime);
          font-size: 16px;
        }

        .menu-button,
        .mobile-menu {
          display: none;
        }

        .hero {
          position: relative;
          min-height: 940px;
          padding-top: 185px;
          display: grid;
          grid-template-columns: 0.95fr 1.05fr;
          align-items: center;
          gap: 30px;
        }

        .hero-glow {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          filter: blur(45px);
        }

        .hero-glow.a {
          top: 160px;
          left: -170px;
          width: 460px;
          height: 460px;
          background: rgba(155, 180, 255, 0.31);
        }

        .hero-glow.b {
          top: 270px;
          right: -135px;
          width: 400px;
          height: 400px;
          background: rgba(215, 255, 110, 0.28);
        }

        .eyebrow {
          margin: 0 0 18px;
          color: #647096;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
          letter-spacing: 0.09em;
        }

        .eyebrow-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          margin-right: 8px;
          border-radius: 50%;
          background: var(--lime);
          box-shadow: 0 0 0 4px rgba(215, 255, 85, 0.25);
        }

        h1,
        h2,
        h3,
        p {
          margin-top: 0;
        }

        .hero h1 {
          margin-bottom: 26px;
          font-size: clamp(42px, 4.8vw, 68px);
          line-height: 1.25;
          letter-spacing: -0.085em;
        }

        .gradient-text {
          background: linear-gradient(105deg, var(--blue), var(--purple));
          color: transparent;
          background-clip: text;
          -webkit-background-clip: text;
        }

        .highlight {
          background: linear-gradient(
            transparent 70%,
            rgba(215, 255, 85, 0.85) 70%
          );
        }

        .hero-sub {
          margin-bottom: 13px;
          font-size: 20px;
          line-height: 1.8;
          letter-spacing: -0.04em;
        }

        .hero-desc {
          max-width: 500px;
          margin-bottom: 27px;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.95;
        }

        .hero-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 22px;
        }

        .hero-tags span {
          padding: 7px 10px;
          color: #4d5a82;
          background: #f3f5ff;
          border: 1px solid #e7eafe;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 11px;
          align-items: center;
        }

        .button {
          display: inline-flex;
          min-height: 52px;
          align-items: center;
          justify-content: center;
          gap: 15px;
          padding: 0 20px;
          border-radius: 15px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 850;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }

        .button:hover {
          transform: translateY(-3px);
        }

        .button:active {
          transform: scale(0.98);
        }

        .button-primary {
          color: #fff;
          background: var(--ink);
          box-shadow: 0 13px 25px rgba(17, 26, 59, 0.2);
        }

        .button-primary b {
          color: var(--lime);
          font-size: 19px;
        }

        .button-quiet {
          color: var(--ink);
          background: #fff;
          border: 1px solid #e2e6f5;
        }

        .hero-note {
          margin: 16px 0 0;
          color: #929bb5;
          font-size: 11px;
        }

        .hero-stage {
          position: relative;
          height: 555px;
          perspective: 1000px;
          transform-style: preserve-3d;
        }

        .dashboard-card {
          position: absolute;
          top: 53px;
          left: 50%;
          width: 412px;
          padding: 21px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.95);
          border-radius: 26px;
          box-shadow: 0 33px 76px rgba(39, 55, 135, 0.22);
          backdrop-filter: blur(18px);
          transform: translateX(-50%);
          transition: transform 0.2s ease;
        }

        .dash-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .dash-top p {
          margin-bottom: 3px;
          color: var(--muted);
          font-size: 11px;
        }

        .dash-top h3 {
          margin: 0;
          font-size: 18px;
          letter-spacing: -0.06em;
        }

        .avatar {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, var(--blue), var(--purple));
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
        }

        .dash-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 18px;
        }

        .dash-stats > div {
          padding: 13px;
          background: #f6f7ff;
          border-radius: 15px;
        }

        .dash-stats small {
          display: block;
          color: #7c87a9;
          font-size: 10px;
        }

        .dash-stats b {
          display: inline-block;
          margin-top: 4px;
          font-size: 23px;
        }

        .dash-stats em {
          float: right;
          margin-top: 10px;
          color: #39a56a;
          font-size: 9px;
          font-style: normal;
        }

        .dash-chart {
          margin-top: 10px;
          padding: 14px 15px 10px;
          border: 1px solid #ebedf8;
          border-radius: 15px;
        }

        .chart-title {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
        }

        .chart-title span {
          color: #8a93ac;
        }

        .chart-bars {
          display: flex;
          height: 80px;
          align-items: flex-end;
          gap: 8px;
          padding: 8px 4px;
        }

        .chart-bars i {
          flex: 1;
          display: block;
          background: linear-gradient(180deg, var(--purple), var(--blue));
          border-radius: 5px 5px 1px 1px;
        }

        .chart-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          color: #98a1bc;
          font-size: 8px;
          text-align: center;
        }

        .event-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
        }

        .event-icon {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border-radius: 12px;
          font-size: 15px;
        }

        .event-icon.blue {
          background: #eaf0ff;
        }

        .event-icon.purple {
          background: #f0ecff;
        }

        .event-row > div {
          flex: 1;
        }

        .event-row b,
        .event-row small {
          display: block;
        }

        .event-row b {
          font-size: 11px;
        }

        .event-row small {
          color: #8e97b0;
          font-size: 9px;
        }

        .event-row > strong {
          font-size: 12px;
        }

        .floating-card {
          position: absolute;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 13px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.92);
          border-radius: 14px;
          box-shadow: 0 12px 28px rgba(40, 58, 136, 0.13);
          font-size: 10px;
        }

        .floating-card b {
          display: block;
          color: #7b849e;
          font-weight: 650;
        }

        .floating-card strong {
          display: block;
          color: var(--ink);
          font-size: 13px;
        }

        .floating-card > span {
          display: grid;
          width: 27px;
          height: 27px;
          place-items: center;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 900;
        }

        .fc-a {
          top: 18px;
          left: 0;
        }

        .fc-b {
          top: 365px;
          right: 0;
        }

        .fc-c {
          bottom: 7px;
          left: 66px;
        }

        .fc-a > span {
          background: var(--lime);
        }

        .fc-b > span {
          color: var(--purple);
          background: #eeeaff;
        }

        .fc-c > span {
          color: #ff7133;
          background: #fff0e7;
        }

        .hero-scroll {
          position: absolute;
          bottom: 35px;
          left: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #8d97b3;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 9px;
          letter-spacing: 0.16em;
        }

        .hero-scroll span {
          display: block;
          width: 56px;
          height: 1px;
          background: #b8c0dd;
        }

        .section-head {
          max-width: 720px;
          margin: 0 auto 50px;
          text-align: center;
        }

        .section-head h2,
        .calendar-copy h2,
        .trust-head h2,
        .line-copy h2,
        .journey h2 {
          margin-bottom: 18px;
          font-size: clamp(34px, 4vw, 52px);
          line-height: 1.3;
          letter-spacing: -0.085em;
        }

        .section-head > p:last-child,
        .calendar-copy > p,
        .trust-head > p,
        .line-copy > p {
          color: var(--muted);
          font-size: 15px;
          line-height: 2;
        }

        .problem {
          padding: 140px 0;
        }

        .merge-demo {
          display: grid;
          grid-template-columns: 1fr 130px 1fr;
          gap: 20px;
          align-items: center;
        }

        .tool-cloud {
          position: relative;
          height: 350px;
        }

        .tool-card {
          position: absolute;
          padding: 13px 15px;
          background: #fff;
          border: 1px solid #e7ebfa;
          border-radius: 14px;
          box-shadow: 0 13px 27px rgba(58, 72, 147, 0.1);
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .tool-card span {
          display: inline-grid;
          width: 19px;
          height: 19px;
          margin-right: 6px;
          place-items: center;
          color: var(--blue);
          background: #eef0ff;
          border-radius: 6px;
        }

        .tool-card:nth-child(1) {
          top: 22px;
          left: 11%;
          transform: rotate(-4deg);
        }

        .tool-card:nth-child(2) {
          top: 68px;
          right: 4%;
          transform: rotate(5deg);
        }

        .tool-card:nth-child(3) {
          top: 151px;
          left: 0;
          transform: rotate(3deg);
        }

        .tool-card:nth-child(4) {
          top: 193px;
          right: 10%;
          transform: rotate(-5deg);
        }

        .tool-card:nth-child(5) {
          bottom: 24px;
          left: 18%;
          transform: rotate(-2deg);
        }

        .tool-card:nth-child(6) {
          right: 3%;
          bottom: 1px;
          transform: rotate(6deg);
        }

        .merge-arrow {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
          color: #8b94af;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
        }

        .merge-arrow i {
          color: var(--blue);
          font-size: 39px;
          font-style: normal;
        }

        .merge-core {
          min-height: 280px;
          padding: 32px;
          color: #fff;
          background: linear-gradient(135deg, #1c285d, #3f46be);
          border-radius: 30px;
          box-shadow: var(--shadow);
        }

        .core-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 25px;
          font-weight: 850;
          letter-spacing: -0.07em;
        }

        .core-logo .brand-mark i {
          background: #fff;
        }

        .core-logo .brand-mark i:nth-child(2) {
          background: #bec7ff;
        }

        .core-logo .brand-mark i:nth-child(3) {
          background: var(--lime);
        }

        .merge-core > p {
          margin: 7px 0 20px;
          color: #c0c8ff;
          font-size: 11px;
        }

        .core-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .core-grid span {
          padding: 13px 11px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 11px;
          font-size: 12px;
        }

        .center-tag {
          margin: 42px 0 0;
          text-align: center;
          font-size: 14px;
          font-weight: 800;
        }

        .center-tag i {
          display: inline-block;
          width: 9px;
          height: 9px;
          margin-right: 7px;
          background: var(--lime);
          border-radius: 50%;
        }

        .statement {
          position: relative;
          min-height: 660px;
          padding: 110px 9% 94px;
          overflow: hidden;
          color: #fff;
          background: var(--ink);
          border-radius: 42px;
        }

        .statement::after {
          position: absolute;
          top: -360px;
          right: -200px;
          width: 680px;
          height: 680px;
          content: "";
          background: radial-gradient(
            circle,
            rgba(97, 120, 255, 0.48),
            transparent 66%
          );
          border-radius: 50%;
        }

        .statement .eyebrow {
          position: relative;
          z-index: 1;
          color: #c1c7ff;
        }

        .statement h2 {
          position: relative;
          z-index: 1;
          margin-bottom: 46px;
          font-size: clamp(42px, 5vw, 69px);
          line-height: 1.2;
          letter-spacing: -0.09em;
        }

        .statement h2 span {
          color: var(--lime);
        }

        .statement-grid {
          position: relative;
          z-index: 1;
          display: grid;
          max-width: 700px;
          grid-template-columns: repeat(2, 1fr);
          gap: 13px 30px;
        }

        .statement-grid p {
          margin: 0;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          font-size: 18px;
        }

        .statement-note {
          position: relative;
          z-index: 1;
          margin: 35px 0 0;
          color: #c6ccdf;
          font-size: 15px;
        }

        .features {
          padding: 145px 0 130px;
        }

        .feature-track {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .feature-card {
          position: relative;
          min-height: 390px;
          padding: 24px;
          overflow: hidden;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 24px;
          box-shadow: 0 12px 27px rgba(45, 58, 123, 0.06);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .feature-card:hover {
          transform: translateY(-7px);
          box-shadow: 0 22px 42px rgba(45, 58, 123, 0.12);
        }

        .feature-card::before {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 5px;
          content: "";
        }

        .feature-card.blue::before {
          background: var(--blue);
        }

        .feature-card.lime::before {
          background: var(--lime);
        }

        .feature-card.purple::before {
          background: var(--purple);
        }

        .feature-card.orange::before {
          background: var(--orange);
        }

        .feature-card.green::before {
          background: var(--green);
        }

        .feature-card.pink::before {
          background: var(--pink);
        }

        .feature-number {
          color: #919ab4;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
        }

        .feature-card h3 {
          margin: 15px 0 12px;
          white-space: pre-line;
          font-size: 23px;
          line-height: 1.35;
          letter-spacing: -0.07em;
        }

        .feature-card > p {
          min-height: 76px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.85;
        }

        .mini-mock {
          position: absolute;
          right: 22px;
          bottom: 22px;
          left: 22px;
          min-height: 115px;
          padding: 14px;
          overflow: hidden;
          border-radius: 16px;
        }

        .mini-site {
          color: #fff;
          background: linear-gradient(135deg, #3349c8, #7486ff);
        }

        .mini-cover {
          position: absolute;
          top: -20px;
          right: -20px;
          width: 130px;
          height: 90px;
          background: radial-gradient(circle, #d7ff55, transparent 62%);
          opacity: 0.7;
        }

        .mini-site b,
        .mini-site span,
        .mini-event b,
        .mini-event span,
        .mini-portal b,
        .mini-portal span,
        .mini-line b,
        .mini-line span,
        .mini-payment b {
          display: block;
        }

        .mini-site b {
          position: relative;
          margin-top: 18px;
          font-size: 13px;
        }

        .mini-site span {
          position: relative;
          margin-top: 4px;
          color: #d5dcff;
          font-size: 10px;
        }

        .mini-tags {
          position: relative;
          display: flex;
          gap: 5px;
          margin-top: 10px;
        }

        .mini-tags em {
          padding: 4px 7px;
          color: #fff;
          background: rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          font-size: 8px;
          font-style: normal;
        }

        .mini-event {
          color: #26304b;
          background: #edffac;
        }

        .mini-event small,
        .mini-portal small,
        .mini-line small,
        .mini-payment small {
          display: block;
          margin-bottom: 6px;
          font-size: 9px;
          font-weight: 800;
        }

        .mini-event b {
          font-size: 15px;
        }

        .mini-event span {
          margin-top: 7px;
          color: #60721f;
          font-size: 10px;
        }

        .mini-event button {
          position: absolute;
          right: 13px;
          bottom: 13px;
          padding: 7px 9px;
          color: #fff;
          background: var(--ink);
          border: 0;
          border-radius: 9px;
          font-size: 9px;
          font-weight: 800;
        }

        .mini-portal {
          color: #fff;
          background: linear-gradient(135deg, #7b66e9, #b6a8ff);
        }

        .mini-portal small {
          color: #e9e5ff;
        }

        .mini-portal b {
          font-size: 14px;
        }

        .mini-portal span {
          margin-top: 5px;
          color: #eeeaff;
          font-size: 10px;
        }

        .portal-avatars {
          position: absolute;
          right: 15px;
          bottom: 14px;
          display: flex;
        }

        .portal-avatars i {
          width: 22px;
          height: 22px;
          margin-left: -4px;
          background: #ffc892;
          border: 2px solid #9d8cf4;
          border-radius: 50%;
        }

        .portal-avatars i:nth-child(2) {
          background: #b9edff;
        }

        .portal-avatars i:nth-child(3) {
          background: #ffc1d6;
        }

        .portal-avatars i:nth-child(4) {
          background: #d7ff55;
        }

        .mini-list {
          padding: 11px;
          background: #fff4e9;
        }

        .mini-list span {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 0;
          border-bottom: 1px solid #f4dfcc;
          font-size: 10px;
        }

        .mini-list span:last-child {
          border-bottom: 0;
        }

        .mini-list i {
          width: 16px;
          height: 16px;
          background: #ffba7c;
          border-radius: 50%;
        }

        .mini-list b {
          margin-left: auto;
          padding: 3px 5px;
          color: #a86023;
          background: #ffe0c1;
          border-radius: 6px;
          font-size: 8px;
        }

        .mini-line {
          color: #294b34;
          background: #e5fbe9;
        }

        .mini-line small {
          color: #5c9469;
        }

        .mini-line b {
          font-size: 12px;
        }

        .mini-line span {
          margin-top: 6px;
          font-size: 10px;
        }

        .mini-line em {
          position: absolute;
          right: 14px;
          bottom: 12px;
          color: #6fa67a;
          font-size: 8px;
          font-style: normal;
        }

        .mini-payment {
          color: #45324f;
          background: #ffe8f3;
        }

        .mini-payment b {
          margin-top: 7px;
          font-size: 26px;
          letter-spacing: -0.06em;
        }

        .mini-payment span {
          position: absolute;
          top: 16px;
          right: 16px;
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          color: #fff;
          background: var(--pink);
          border-radius: 50%;
          font-weight: 900;
        }

        .mini-payment em {
          position: absolute;
          right: 14px;
          bottom: 13px;
          color: #ab6088;
          font-size: 9px;
          font-style: normal;
        }

        .scroll-hint {
          margin: 22px 0 0;
          color: #8993ae;
          text-align: center;
          font-size: 12px;
        }

        .scroll-hint span {
          color: var(--blue);
          font-weight: 900;
        }

        .calendar-section {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 80px;
          align-items: center;
          padding: 130px 0;
        }

        .calendar-copy ul {
          display: grid;
          gap: 11px;
          padding: 0;
          list-style: none;
        }

        .calendar-copy li {
          color: #465170;
          font-size: 13px;
          font-weight: 750;
        }

        .calendar-copy li::before {
          margin-right: 9px;
          color: var(--blue);
          content: "✓";
        }

        .calendar-mock {
          padding: 23px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 26px;
          box-shadow: var(--shadow);
        }

        .cal-head,
        .cal-event-list > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .cal-head {
          margin-bottom: 18px;
          font-size: 14px;
        }

        .cal-head span {
          color: #7f88a5;
        }

        .cal-days,
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
        }

        .cal-days {
          margin-bottom: 8px;
          color: #9ca4bc;
          font-size: 10px;
        }

        .cal-grid {
          gap: 4px;
        }

        .cal-grid i {
          display: grid;
          min-height: 42px;
          place-items: center;
          color: #63708f;
          border-radius: 10px;
          font-size: 11px;
          font-style: normal;
        }

        .cal-grid .active {
          position: relative;
          color: var(--blue);
          background: #eaf0ff;
          font-weight: 900;
        }

        .cal-grid .purple {
          color: var(--purple);
          background: #f0edff;
        }

        .cal-grid .orange {
          color: #e57227;
          background: #fff0e5;
        }

        .cal-grid em {
          position: absolute;
          bottom: 1px;
          font-size: 9px;
          font-style: normal;
        }

        .cal-grid .full {
          color: #a5abbc;
          text-decoration: line-through;
        }

        .cal-event-list {
          display: grid;
          gap: 9px;
          margin-top: 20px;
        }

        .cal-event-list > div {
          padding: 10px;
          background: #f8f9ff;
          border-radius: 12px;
        }

        .dot {
          width: 8px;
          height: 8px;
          margin-right: 9px;
          border-radius: 50%;
        }

        .dot.blue {
          background: var(--blue);
        }

        .dot.purple {
          background: var(--purple);
        }

        .dot.orange {
          background: var(--orange);
        }

        .cal-event-list p {
          flex: 1;
          margin: 0;
        }

        .cal-event-list b,
        .cal-event-list small {
          display: block;
        }

        .cal-event-list b {
          font-size: 11px;
        }

        .cal-event-list small {
          margin-top: 2px;
          color: #8490ac;
          font-size: 9px;
        }

        .cal-event-list button {
          min-height: 31px;
          padding: 0 8px;
          color: #fff;
          background: var(--ink);
          border: 0;
          border-radius: 8px;
          font-size: 9px;
          font-weight: 800;
        }

        .cal-line-label {
          margin-top: 14px;
          padding: 10px;
          color: #4f9463;
          background: #e9fbed;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 800;
          text-align: center;
        }

        .cal-line-label span {
          display: inline-grid;
          width: 15px;
          height: 15px;
          margin-left: 5px;
          place-items: center;
          color: #fff;
          background: var(--green);
          border-radius: 50%;
          font-size: 9px;
        }

        .trust-section {
          padding: 130px 0 150px;
        }

        .trust-head {
          max-width: 590px;
          margin: 0 auto 72px;
          text-align: center;
        }

        .timeline {
          position: relative;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
        }

        .timeline-line {
          position: absolute;
          top: 65px;
          right: 8%;
          left: 8%;
          height: 2px;
          background: linear-gradient(90deg, var(--pink), var(--blue), var(--lime), var(--orange), var(--ink));
        }

        .timeline-card {
          position: relative;
          z-index: 1;
          min-height: 185px;
          padding: 16px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 18px;
          box-shadow: 0 11px 25px rgba(45, 58, 123, 0.06);
        }

        .timeline-card time {
          color: #8e97b1;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
        }

        .timeline-icon {
          display: grid;
          width: 40px;
          height: 40px;
          margin: 14px 0;
          place-items: center;
          border-radius: 14px;
          font-size: 17px;
        }

        .timeline-icon.pink {
          background: #ffe7f2;
        }

        .timeline-icon.blue {
          background: #eaf0ff;
        }

        .timeline-icon.lime {
          background: #efffc0;
        }

        .timeline-icon.orange {
          background: #fff0e5;
        }

        .timeline-icon.dark {
          color: #fff;
          background: var(--ink);
        }

        .timeline-card h3 {
          margin-bottom: 6px;
          font-size: 14px;
        }

        .timeline-card p {
          margin: 0;
          color: var(--muted);
          font-size: 10px;
          line-height: 1.7;
        }

        .trust-end {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 45px;
          font-size: 15px;
          text-align: center;
        }

        .trust-end span {
          width: 10px;
          height: 10px;
          margin-top: 5px;
          background: var(--lime);
          border-radius: 50%;
        }

        .line-section {
          display: grid;
          grid-template-columns: 0.8fr 1.2fr;
          gap: 110px;
          align-items: center;
          padding: 120px 0 150px;
        }

        .phone-wrap {
          display: flex;
          justify-content: center;
        }

        .phone {
          position: relative;
          width: 285px;
          min-height: 520px;
          overflow: hidden;
          background: #f2f4f7;
          border: 8px solid #18213e;
          border-radius: 37px;
          box-shadow: 0 25px 55px rgba(28, 37, 82, 0.24);
        }

        .phone-notch {
          position: absolute;
          top: 0;
          left: 50%;
          width: 110px;
          height: 22px;
          background: #18213e;
          border-radius: 0 0 15px 15px;
          transform: translateX(-50%);
        }

        .phone-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 32px 14px 12px;
          background: #fff;
          font-size: 10px;
        }

        .phone-top b {
          font-size: 12px;
        }

        .chat-area {
          min-height: 470px;
          padding: 14px 10px;
          background: #dcecf5;
        }

        .chat-date {
          margin-bottom: 16px;
          color: #6c7b86;
          font-size: 9px;
          text-align: center;
        }

        .bubble {
          max-width: 91%;
          margin-bottom: 10px;
          padding: 10px;
          border-radius: 4px 14px 14px 14px;
          background: #fff;
          box-shadow: 0 4px 12px rgba(61, 80, 91, 0.08);
          font-size: 10px;
          line-height: 1.7;
        }

        .bubble b {
          color: #547b5f;
          font-size: 9px;
        }

        .bubble p {
          margin: 0;
        }

        .chat-read {
          color: #71808b;
          font-size: 8px;
          text-align: right;
        }

        .line-copy h2 span {
          color: var(--blue);
        }

        .benefit-list {
          display: grid;
          gap: 10px;
          margin-top: 28px;
        }

        .benefit-list div {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: #f7f9ff;
          border-radius: 13px;
        }

        .benefit-list i {
          color: var(--blue);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
          font-style: normal;
          font-weight: 900;
        }

        .benefit-list b {
          font-size: 13px;
        }

        .journey {
          padding: 120px 0;
        }

        .journey-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .journey-step {
          min-height: 220px;
          padding: 26px;
          background: #f8f9ff;
          border-radius: 22px;
        }

        .journey-step span {
          color: var(--blue);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px;
          font-weight: 900;
        }

        .journey-step h3 {
          margin: 34px 0 10px;
          font-size: 22px;
          letter-spacing: -0.06em;
        }

        .journey-step p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.8;
        }

        .journey-end {
          margin: 48px 0 0;
          font-size: 17px;
          line-height: 2;
          text-align: center;
        }

        .journey-end strong {
          color: var(--blue);
        }

        .cta-section {
          position: relative;
          min-height: 590px;
          padding: 120px 24px;
          overflow: hidden;
          color: #fff;
          background: linear-gradient(125deg, #162458, #3f48c5 58%, #7869ef);
          text-align: center;
        }

        .cta-section::before {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          height: 100px;
          content: "";
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.08));
        }

        .cta-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(8px);
        }

        .cta-orb.a {
          top: -120px;
          left: -80px;
          width: 370px;
          height: 370px;
          background: rgba(215, 255, 85, 0.25);
        }

        .cta-orb.b {
          right: -80px;
          bottom: -150px;
          width: 420px;
          height: 420px;
          background: rgba(255, 129, 195, 0.24);
        }

        .cta-content {
          position: relative;
          z-index: 1;
          max-width: 760px;
          margin: 0 auto;
        }

        .cta-content .eyebrow {
          color: #d9deff;
        }

        .cta-content h2 {
          margin-bottom: 20px;
          font-size: clamp(38px, 5vw, 62px);
          line-height: 1.25;
          letter-spacing: -0.085em;
        }

        .cta-content > p {
          margin-bottom: 29px;
          color: #d9defe;
          font-size: 15px;
          line-height: 2;
        }

        .button-white {
          color: var(--ink);
          background: var(--lime);
          box-shadow: 0 15px 32px rgba(5, 10, 40, 0.25);
        }

        .button-white b {
          color: var(--blue);
          font-size: 19px;
        }

        .cta-content small {
          display: block;
          margin-top: 18px;
          color: #d6dcff;
          font-size: 11px;
        }

        footer {
          display: flex;
          width: min(1160px, calc(100% - 48px));
          margin: 0 auto;
          padding: 33px 0 70px;
          align-items: center;
          justify-content: space-between;
        }

        footer p,
        footer small {
          margin: 0;
          color: #858ea8;
          font-size: 11px;
        }

        .mobile-fixed-cta {
          display: none;
        }

        .reveal {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }

        .reveal.in-view {
          opacity: 1;
          transform: translateY(0);
        }

        @media (max-width: 900px) {
          .shell {
            width: min(100% - 32px, 620px);
          }

          .site-header {
            width: calc(100% - 24px);
          }

          .nav {
            display: none;
          }

          .menu-button {
            display: grid;
            width: 43px;
            height: 43px;
            place-items: center;
            background: #fff;
            border: 1px solid #e7eaf8;
            border-radius: 13px;
          }

          .menu-button span,
          .menu-button::before,
          .menu-button::after {
            width: 18px;
            height: 2px;
            content: "";
            background: var(--ink);
            transition: 0.2s ease;
          }

          .menu-button {
            position: relative;
          }

          .menu-button::before,
          .menu-button::after {
            position: absolute;
          }

          .menu-button::before {
            transform: translateY(-6px);
          }

          .menu-button::after {
            transform: translateY(6px);
          }

          .menu-button.open span {
            opacity: 0;
          }

          .menu-button.open::before {
            transform: rotate(45deg);
          }

          .menu-button.open::after {
            transform: rotate(-45deg);
          }

          .mobile-menu {
            position: fixed;
            top: 93px;
            right: 12px;
            left: 12px;
            z-index: 49;
            display: grid;
            gap: 3px;
            padding: 15px;
            pointer-events: none;
            opacity: 0;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #e7eaf8;
            border-radius: 20px;
            box-shadow: 0 22px 46px rgba(35, 45, 107, 0.14);
            transform: translateY(-12px);
            transition: 0.22s ease;
            backdrop-filter: blur(20px);
          }

          .mobile-menu.open {
            pointer-events: auto;
            opacity: 1;
            transform: translateY(0);
          }

          .mobile-menu a {
            padding: 14px;
            color: var(--ink);
            text-decoration: none;
            border-radius: 11px;
            font-size: 14px;
            font-weight: 800;
          }

          .mobile-menu a:last-child {
            color: #fff;
            background: var(--ink);
          }

          .hero {
            min-height: auto;
            padding: 145px 0 110px;
            grid-template-columns: 1fr;
          }

          .hero h1 {
            font-size: clamp(43px, 12vw, 58px);
          }

          .hero-sub {
            font-size: 18px;
          }

          .hero-stage {
            height: 470px;
            margin-top: 10px;
          }

          .dashboard-card {
            top: 45px;
            width: min(100%, 390px);
          }

          .fc-a {
            left: -5px;
          }

          .fc-b {
            right: -4px;
          }

          .fc-c {
            left: 28px;
          }

          .hero-scroll {
            display: none;
          }

          .problem,
          .features,
          .trust-section,
          .journey {
            padding: 95px 0;
          }

          .merge-demo {
            grid-template-columns: 1fr;
          }

          .tool-cloud {
            height: 300px;
          }

          .merge-arrow {
            flex-direction: row;
            justify-content: center;
          }

          .merge-arrow i {
            font-size: 31px;
          }

          .statement {
            min-height: auto;
            padding: 78px 26px;
            border-radius: 28px;
          }

          .statement-grid {
            grid-template-columns: 1fr;
          }

          .statement-grid p {
            font-size: 16px;
          }

          .feature-track {
            display: flex;
            width: calc(100vw - 16px);
            padding: 4px 0 16px 0;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
          }

          .feature-track::-webkit-scrollbar {
            display: none;
          }

          .feature-card {
            min-width: min(82vw, 340px);
            scroll-snap-align: start;
          }

          .calendar-section {
            padding: 100px 0;
            grid-template-columns: 1fr;
            gap: 36px;
          }

          .timeline {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .timeline-line {
            top: 5%;
            bottom: 5%;
            left: 35px;
            width: 2px;
            height: auto;
            background: linear-gradient(
              var(--pink),
              var(--blue),
              var(--lime),
              var(--orange),
              var(--ink)
            );
          }

          .timeline-card {
            display: grid;
            min-height: 0;
            grid-template-columns: 80px 55px 1fr;
            align-items: center;
          }

          .timeline-card time {
            grid-column: 1;
          }

          .timeline-icon {
            grid-column: 2;
            margin: 0;
          }

          .timeline-card h3,
          .timeline-card p {
            grid-column: 3;
          }

          .timeline-card h3 {
            margin: 0 0 3px;
          }

          .timeline-card p {
            grid-row: 1;
            align-self: end;
            margin-bottom: 26px;
          }

          .line-section {
            padding: 95px 0;
            grid-template-columns: 1fr;
            gap: 48px;
          }

          .phone {
            width: 276px;
          }

          .journey-grid {
            grid-template-columns: 1fr;
          }

          footer {
            width: min(100% - 32px, 620px);
            padding: 28px 0 94px;
            flex-wrap: wrap;
            gap: 15px;
          }

          footer p {
            width: 100%;
            order: 3;
          }

          .mobile-fixed-cta {
            position: fixed;
            right: 14px;
            bottom: 14px;
            left: 14px;
            z-index: 45;
            display: flex;
            min-height: 52px;
            align-items: center;
            justify-content: space-between;
            padding: 0 18px;
            color: #fff;
            background: var(--ink);
            border-radius: 15px;
            box-shadow: 0 14px 34px rgba(17, 26, 59, 0.25);
            text-decoration: none;
            font-size: 14px;
            font-weight: 850;
            transition: opacity 0.2s ease, transform 0.2s ease;
          }

          .mobile-fixed-cta span {
            color: var(--lime);
            font-size: 19px;
          }

          .mobile-fixed-cta.hide {
            pointer-events: none;
            opacity: 0;
            transform: translateY(14px);
          }
        }

        @media (max-width: 480px) {
          .shell {
            width: calc(100% - 28px);
          }

          .hero {
            padding-top: 132px;
          }

          .hero h1 {
            font-size: 42px;
          }

          .hero-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .button {
            width: 100%;
          }

          .dashboard-card {
            padding: 17px;
            transform: translateX(-50%) scale(0.92);
            transform-origin: top center;
          }

          .hero-stage {
            height: 438px;
          }

          .fc-a {
            top: 9px;
          }

          .fc-b {
            top: 322px;
          }

          .fc-c {
            bottom: -3px;
          }

          .floating-card {
            padding: 9px 10px;
            font-size: 9px;
          }

          .section-head h2,
          .calendar-copy h2,
          .trust-head h2,
          .line-copy h2,
          .journey h2 {
            font-size: 34px;
          }

          .calendar-mock {
            padding: 16px;
          }

          .cal-grid i {
            min-height: 38px;
          }

          .cta-section {
            min-height: 510px;
            padding: 90px 18px;
          }

          .cta-content h2 {
            font-size: 40px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            transition-duration: 0.001ms !important;
            animation-duration: 0.001ms !important;
          }

          .reveal {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>

      <div className="page-noise" />

      <header className="site-header">
        <a href="#top" aria-label="COMIU トップへ">
          <Logo />
        </a>

        <nav className="nav">
          <a href="#features">できること</a>
          <a href="#future">導入メリット</a>
          <a href="#calendar">運営の流れ</a>
          <a href="#faq">よくある質問</a>
          <a className="nav-cta" href="/register">
            無料で作成 <b>→</b>
          </a>
        </nav>

        <button
          className={`menu-button ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="メニューを開く"
          aria-expanded={menuOpen}
        >
          <span />
        </button>
      </header>

      <nav className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <a href="#features" onClick={() => setMenuOpen(false)}>
          COMIUにできること
        </a>
        <a href="#future" onClick={() => setMenuOpen(false)}>
          導入メリット
        </a>
        <a href="#calendar" onClick={() => setMenuOpen(false)}>
          運営の流れ
        </a>
        <a href="/register" onClick={() => setMenuOpen(false)}>
          無料で団体ページを作る →
        </a>
      </nav>

      <main id="top">
        <section className="shell hero">
          <div className="hero-glow a" />
          <div className="hero-glow b" />

          <div className="hero-copy reveal">
            <p className="eyebrow">
              <span className="eyebrow-dot" />
              FOR EVENT ORGANIZERS
            </p>

            <h1>
              イベント・サークルの
              <br />
              <span className="gradient-text">集客ならCOMIU</span>
              <br />
              団体に合わせたWebサイトを
              <br />
              <span className="highlight">無料で作成。</span>
            </h1>

            <p className="hero-sub">
              掲載用のホームページなら、もういらない。
              <br />
              Webサイトを、育てるWebアプリケーションへ。
            </p>

            <p className="hero-desc">
              団体ページ、イベント募集、予約管理、活動ブログ、LINE連携。
              運営をまとめて、参加者が集まる仕組みをつくる。
            </p>

            <div className="hero-tags">
              <span>団体ページ</span>
              <span>イベント募集</span>
              <span>予約管理</span>
              <span>LINE連携</span>
              <span>事前決済</span>
            </div>

            <div className="hero-actions">
              <a className="button button-primary" href="/register">
                無料で団体ページを作る <b>→</b>
              </a>
              <a className="button button-quiet" href="#features">
                COMIUでできることを見る ↓
              </a>
            </div>

            <p className="hero-note">登録無料・初期費用なし・専門知識不要</p>
          </div>

          <div className="hero-stage reveal">
            <div className="floating-card fc-a">
              <span>＋</span>
              <div>
                <b>新規予約</b>
                <strong>+12</strong>
              </div>
            </div>

            <div className="floating-card fc-b">
              <span>✓</span>
              <div>
                <b>LINE通知</b>
                <strong>送信済み</strong>
              </div>
            </div>

            <div className="floating-card fc-c">
              <span>¥</span>
              <div>
                <b>決済ステータス</b>
                <strong>完了</strong>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="dash-top">
                <div>
                  <p>おかえりなさい、BELL</p>
                  <h3>団体運営ダッシュボード</h3>
                </div>
                <div className="avatar">B</div>
              </div>

              <div className="dash-stats">
                <div>
                  <small>今月のページ閲覧数</small>
                  <b>2,842</b>
                  <em>+18.4%</em>
                </div>
                <div>
                  <small>新規申込み</small>
                  <b>128</b>
                  <em>+12</em>
                </div>
              </div>

              <div className="dash-chart">
                <div className="chart-title">
                  <b>イベント申込み推移</b>
                  <span>今週</span>
                </div>

                <div className="chart-bars">
                  <i style={{ height: "35%" }} />
                  <i style={{ height: "58%" }} />
                  <i style={{ height: "45%" }} />
                  <i style={{ height: "72%" }} />
                  <i style={{ height: "88%" }} />
                  <i style={{ height: "66%" }} />
                  <i style={{ height: "97%" }} />
                </div>

                <div className="chart-days">
                  <span>月</span>
                  <span>火</span>
                  <span>水</span>
                  <span>木</span>
                  <span>金</span>
                  <span>土</span>
                  <span>日</span>
                </div>
              </div>

              <div className="event-row">
                <span className="event-icon blue">🏸</span>
                <div>
                  <b>バドミントン交流会</b>
                  <small>7/13（日）・池袋</small>
                </div>
                <strong>38 / 50</strong>
              </div>

              <div className="event-row">
                <span className="event-icon purple">✦</span>
                <div>
                  <b>新歓交流会</b>
                  <small>7/17（木）・新宿</small>
                </div>
                <strong>予約中</strong>
              </div>
            </div>
          </div>

          <div className="hero-scroll">
            SCROLL <span />
          </div>
        </section>

        <section className="shell problem">
          <div className="section-head reveal">
            <p className="eyebrow">THE CURRENT WAY</p>
            <h2>
              毎回、ゼロから
              <br />
              運営していませんか？
            </h2>
            <p>
              告知、フォーム、LINE、名簿、決済。
              <br />
              便利なツールは増えたのに、主催者の確認作業は減らない。
            </p>
          </div>

          <div className="merge-demo reveal">
            <div className="tool-cloud">
              <div className="tool-card">
                <span>◎</span>Instagram告知
              </div>
              <div className="tool-card">
                <span>▣</span>Googleフォーム
              </div>
              <div className="tool-card">
                <span>◔</span>LINEグループ
              </div>
              <div className="tool-card">
                <span>▤</span>スプレッドシート
              </div>
              <div className="tool-card">
                <span>¥</span>PayPay確認
              </div>
              <div className="tool-card">
                <span>▱</span>メモ帳
              </div>
            </div>

            <div className="merge-arrow">
              <span>散らばる</span>
              <i>→</i>
              <span>まとまる</span>
            </div>

            <div className="merge-core">
              <div className="core-logo">
                <span className="brand-mark">
                  <i />
                  <i />
                  <i />
                </span>
                COMIU
              </div>
              <p>団体運営ダッシュボード</p>
              <div className="core-grid">
                <span>イベント</span>
                <span>予約</span>
                <span>LINE</span>
                <span>名簿</span>
              </div>
            </div>
          </div>

          <p className="center-tag reveal">
            <i /> バラバラだった運営を、ひとつの流れへ。
          </p>
        </section>

        <section className="shell statement" id="future">
          <p className="eyebrow reveal">NOT JUST A BOOKING TOOL</p>
          <h2 className="reveal">
            運営が楽になって、
            <br />
            <span>団体が大きくなる。</span>
          </h2>

          <div className="statement-grid reveal">
            <p>活動の魅力を見せる。</p>
            <p>イベントを見つけてもらう。</p>
            <p>参加しやすくする。</p>
            <p>連絡を自動化する。</p>
            <p>開催するほど、実績が残る。</p>
          </div>

          <p className="statement-note reveal">
            イベントを繰り返すたびに、次の参加者に選ばれやすい団体へ。
          </p>
        </section>

        <section className="shell features" id="features">
          <div className="section-head reveal">
            <p className="eyebrow">ALL-IN-ONE PLATFORM</p>
            <h2>COMIUにできること</h2>
            <p>
              募集する。つながる。積み上がる。
              <br />
              団体運営に必要な仕組みを、ひとつに。
            </p>
          </div>

          <div className="feature-track">
            {features.map((feature) => (
              <article
                key={feature.no}
                className={`feature-card ${feature.color} reveal`}
              >
                <div className="feature-number">{feature.no}</div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <MiniMock type={feature.type} />
              </article>
            ))}
          </div>

          <p className="scroll-hint">
            <span>←</span> 横にスワイプして見る <span>→</span>
          </p>
        </section>

        <section className="shell calendar-section" id="calendar">
          <div className="calendar-copy reveal">
            <p className="eyebrow">EASY TO JOIN</p>
            <h2>
              次のイベントを、
              <br />
              迷わず見つけられる。
            </h2>
            <p>
              「次はいつある？」をなくす。
              <br />
              活動予定、残り枠、予約状況を、参加者にわかりやすく届ける。
            </p>

            <ul>
              <li>予定と募集状況が、ひと目で分かる</li>
              <li>そのまま予約まで進める</li>
              <li>前日のLINE通知で、参加を後押し</li>
            </ul>
          </div>

          <div className="calendar-mock reveal">
            <div className="cal-head">
              <b>2026年 7月</b>
              <span>‹　›</span>
            </div>

            <div className="cal-days">
              <span>日</span>
              <span>月</span>
              <span>火</span>
              <span>水</span>
              <span>木</span>
              <span>金</span>
              <span>土</span>
            </div>

            <div className="cal-grid">
              <i />
              <i />
              <i />
              <i>1</i>
              <i>2</i>
              <i>3</i>
              <i>4</i>
              <i>5</i>
              <i>6</i>
              <i>7</i>
              <i>8</i>
              <i>9</i>
              <i>10</i>
              <i>11</i>
              <i>12</i>
              <i className="active">
                13<em>🏸</em>
              </i>
              <i>14</i>
              <i>15</i>
              <i>16</i>
              <i className="active purple">
                17<em>✦</em>
              </i>
              <i>18</i>
              <i className="active orange">
                19<em>☀</em>
              </i>
              <i>20</i>
              <i>21</i>
              <i>22</i>
              <i>23</i>
              <i className="full">24</i>
              <i>25</i>
            </div>

            <div className="cal-event-list">
              <div>
                <span className="dot blue" />
                <p>
                  <b>7/13 バドミントン</b>
                  <small>残り8名</small>
                </p>
                <button>予約する</button>
              </div>

              <div>
                <span className="dot purple" />
                <p>
                  <b>7/17 新歓交流会</b>
                  <small>予約受付中</small>
                </p>
                <button>予約する</button>
              </div>

              <div>
                <span className="dot orange" />
                <p>
                  <b>7/19 BBQ</b>
                  <small>女性枠あと3名</small>
                </p>
                <button>予約する</button>
              </div>
            </div>

            <div className="cal-line-label">
              LINEで前日通知が届きます <span>✓</span>
            </div>
          </div>
        </section>

        <section className="shell trust-section">
          <div className="trust-head reveal">
            <p className="eyebrow">BUILD TRUST OVER TIME</p>
            <h2>
              開催するたび、
              <br />
              団体の信頼が残る。
            </h2>
            <p>
              SNS投稿は流れていく。
              <br />
              でも、活動レポート、イベント実績、参加者の声は団体ページに残り続ける。
            </p>
          </div>

          <div className="timeline">
            <div className="timeline-line" />

            <article className="timeline-card reveal">
              <time>2026.04</time>
              <div className="timeline-icon pink">✦</div>
              <h3>新歓交流会</h3>
              <p>初参加者 42名</p>
            </article>

            <article className="timeline-card reveal">
              <time>2026.05</time>
              <div className="timeline-icon blue">🏸</div>
              <h3>バドミントン</h3>
              <p>月2回の定期開催へ</p>
            </article>

            <article className="timeline-card reveal">
              <time>2026.06</time>
              <div className="timeline-icon lime">●</div>
              <h3>スポーツ交流会</h3>
              <p>累計参加者 180名</p>
            </article>

            <article className="timeline-card reveal">
              <time>2026.07</time>
              <div className="timeline-icon orange">☀</div>
              <h3>夏のBBQ</h3>
              <p>参加者レビュー 34件</p>
            </article>

            <article className="timeline-card reveal">
              <time>NOW</time>
              <div className="timeline-icon dark">↗</div>
              <h3>次の参加者へ</h3>
              <p>「ここなら行ってみたい」が増える</p>
            </article>
          </div>

          <div className="trust-end reveal">
            <span />
            <strong>開催するほど、次の参加者に選ばれやすい団体へ。</strong>
          </div>
        </section>

        <section className="shell line-section">
          <div className="phone-wrap reveal">
            <div className="phone">
              <div className="phone-notch" />

              <div className="phone-top">
                <span>9:41</span>
                <b>COMIU公式LINE</b>
                <span>•••</span>
              </div>

              <div className="chat-area">
                <p className="chat-date">7月16日（木）</p>

                <div className="bubble">
                  <b>COMIU公式LINE</b>
                  <p>ご予約ありがとうございます！</p>
                </div>

                <div className="bubble">
                  <p>
                    7/17 新歓交流会の詳細です ✦
                    <br />
                    会場：池袋駅東口 徒歩5分
                    <br />
                    集合時間：18:45
                  </p>
                </div>

                <div className="bubble">
                  <p>
                    明日はお気をつけてお越しください。
                    <br />
                    参加できなくなった場合は、こちらからキャンセルできます。
                  </p>
                </div>

                <div className="chat-read">既読 38　18:02</div>
              </div>
            </div>
          </div>

          <div className="line-copy reveal">
            <p className="eyebrow">AUTOMATIC LINE REMINDERS</p>
            <h2>
              連絡を頑張る運営から、
              <br />
              <span>参加しやすい仕組み</span>を
              <br />
              つくる運営へ。
            </h2>

            <p>
              予約後の案内やイベント前日のリマインドを、公式LINEで自動化。
              参加者の不安をなくし、主催者の確認作業も減らします。
            </p>

            <div className="benefit-list">
              <div>
                <i>01</i>
                <b>案内漏れを減らす</b>
              </div>
              <div>
                <i>02</i>
                <b>前日の参加確認を自動化</b>
              </div>
              <div>
                <i>03</i>
                <b>当日の問い合わせを減らす</b>
              </div>
              <div>
                <i>04</i>
                <b>無断キャンセル対策につながる</b>
              </div>
            </div>
          </div>
        </section>

        <section className="shell journey">
          <div className="section-head reveal">
            <p className="eyebrow">WHAT CHANGES NEXT</p>
            <h2>
              イベントを開くたび、
              <br />
              次が楽になる。
            </h2>
          </div>

          <div className="journey-grid">
            <article className="journey-step reveal">
              <span>01</span>
              <h3>見つけてもらえる</h3>
              <p>団体ページとポータル掲載で、新しい参加者に届く。</p>
            </article>

            <article className="journey-step reveal">
              <span>02</span>
              <h3>参加しやすくなる</h3>
              <p>予定、残り枠、予約、決済、LINE案内がつながる。</p>
            </article>

            <article className="journey-step reveal">
              <span>03</span>
              <h3>団体が積み上がる</h3>
              <p>活動実績とつながりが残り、次の集客につながる。</p>
            </article>
          </div>

          <p className="journey-end reveal">
            COMIUは、イベントを一回成功させるためのツールではない。
            <br />
            <strong>団体を、続いていくコミュニティへ育てるための仕組み。</strong>
          </p>
        </section>

        <section className="cta-section" id="cta">
          <div className="cta-orb a" />
          <div className="cta-orb b" />

          <div className="cta-content reveal">
            <p className="eyebrow">START FOR FREE</p>
            <h2>
              あなたの団体を、
              <br />
              次の参加者に選ばれる場所へ。
            </h2>

            <p>
              団体ページ、イベント募集、予約管理、LINE連携。
              <br />
              まずは無料で、あなたの団体に合ったページを作成しましょう。
            </p>

            <a
              className="button button-white"
              href="/register"
            >
              無料で団体ページを作る <b>→</b>
            </a>

            <small>登録無料　・　初期費用なし　・　専門知識不要</small>
          </div>
        </section>
      </main>

      <footer id="faq">
        <a href="#top" aria-label="COMIU トップへ">
          <Logo />
        </a>
        <p>運営が楽になって、団体が大きくなる。</p>
        <small>© 2026 COMIU</small>
      </footer>

      <a className="mobile-fixed-cta" href="/register">
        無料で団体ページを作る <span>→</span>
      </a>
    </>
  );
}
