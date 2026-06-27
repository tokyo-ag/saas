"use client";

import { useEffect, useState } from "react";

const scatteredTools = [
  { icon: "IG", title: "Instagram告知", text: "投稿・DM確認" },
  { icon: "GF", title: "Googleフォーム", text: "申込み受付" },
  { icon: "LN", title: "LINEグループ", text: "連絡・共有" },
  { icon: "SS", title: "スプレッドシート", text: "名簿管理" },
  { icon: "PY", title: "PayPay確認", text: "支払い確認" },
  { icon: "MM", title: "メモ帳", text: "やること管理" },
];

const features = [
  {
    title: "団体ページを無料で作成",
    text: "団体紹介、活動写真、イベント予定、よくある質問、実績。初めて見た人にも、活動の雰囲気と信頼感が伝わるページを作成。",
    type: "site",
  },
  {
    title: "イベント募集をまとめる",
    text: "募集人数、参加費、場所、持ち物をひとつの募集ページに。毎回の告知を、参加につながる導線へ。",
    type: "event",
  },
  {
    title: "COMIUポータルへ掲載",
    text: "イベントを登録すると、COMIU内のポータルにも掲載。新しい参加者に団体を見つけてもらえる機会を増やす。",
    type: "portal",
  },
  {
    title: "予約を管理する",
    text: "参加人数、定員、キャンセル、参加者名簿をまとめて管理。フォームとスプレッドシートを行き来しない運営へ。",
    type: "reserve",
  },
  {
    title: "公式LINEで自動リマインド",
    text: "予約完了後の案内や、イベント前日のリマインドを公式LINEで送信。問い合わせと連絡漏れを減らす。",
    type: "line",
  },
  {
    title: "事前決済に対応",
    text: "申込みから支払いまでをスムーズに。当日の受付、集金、未払い確認を減らして、イベントに集中できる。",
    type: "pay",
  },
  {
    title: "活動ブログと実績を残す",
    text: "イベントレポートや活動写真を残して、団体の魅力を積み上げる。開催するほど、初参加者に選ばれやすくなる。",
    type: "blog",
  },
];

const calendarEvents = [
  { date: "7/13", name: "バドミントン", status: "残り8名", tone: "blue" },
  { date: "7/17", name: "新歓交流会", status: "予約受付中", tone: "green" },
  { date: "7/19", name: "BBQ", status: "女性枠あと3名", tone: "pink" },
  { date: "7/24", name: "フットサル", status: "満員", tone: "gray" },
];

const timeline = [
  { month: "4月", title: "新歓交流会", text: "初参加者 96名" },
  { month: "5月", title: "バドミントン", text: "リピート参加が増加" },
  { month: "6月", title: "スポーツ交流会", text: "活動レポート公開" },
  { month: "7月", title: "BBQ", text: "参加者レビュー蓄積" },
];

const lineBubbles = [
  "ご予約ありがとうございます",
  "7/17 新歓交流会の詳細です",
  "会場：池袋駅東口 徒歩5分",
  "集合時間：18:45",
  "明日はお気をつけてお越しください",
  "参加できなくなった場合は、こちらからキャンセルできます",
];

function Logo() {
  return (
    <a className="logo" href="#top" aria-label="COMIU トップへ">
      <span aria-hidden="true">C</span>
      <strong>COMIU</strong>
    </a>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}

function MiniPhoto({ tone = "blue" }: { tone?: string }) {
  return (
    <span className={`mini-photo ${tone}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function DashboardMock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`dashboard-mock ${compact ? "compact" : ""}`} data-cursor="EXPLORE">
      <div className="mock-top">
        <span className="mock-logo">COMIU</span>
        <b>ダッシュボード</b>
        <span className="mock-dot" />
      </div>

      <div className="mock-card mock-events">
        <div className="mock-card-head">
          <b>イベント一覧</b>
          <a>一覧を見る</a>
        </div>
        {[
          ["新歓スポーツ大会", "参加人数 38 / 50", "78"],
          ["春の交流会", "参加人数 22 / 30", "64"],
          ["BBQイベント", "参加人数 17 / 40", "46"],
        ].map((row, index) => (
          <div className="mock-event-row" key={row[0]}>
            <MiniPhoto tone={index === 2 ? "orange" : "blue"} />
            <div>
              <b>{row[0]}</b>
              <small>{row[1]}</small>
            </div>
            <span style={{ "--bar": `${row[2]}%` } as React.CSSProperties} />
          </div>
        ))}
      </div>

      <div className="mock-grid">
        <div className="mock-card mock-stat">
          <small>新規予約</small>
          <strong>12件</strong>
          <em>今週 +4</em>
        </div>
        <div className="mock-card mock-line">
          <small>LINEリマインド</small>
          <strong>送信済み</strong>
          <em>38人へ配信</em>
        </div>
        <div className="mock-card mock-stat">
          <small>今月のページ閲覧数</small>
          <strong>2,842</strong>
          <em>先月 +284</em>
        </div>
        <div className="mock-card mock-roster">
          <small>参加者名簿</small>
          <p>
            <i />
            <i />
            <i />
            <b>38名</b>
          </p>
        </div>
      </div>

      <div className="mock-card next-event">
        <small>次回イベント</small>
        <b>7/17 新歓交流会</b>
        <span>残り枠 8名</span>
      </div>
    </div>
  );
}

function FeatureMock({ type }: { type: string }) {
  if (type === "line") {
    return (
      <div className="feature-mock line-mini">
        <span>LINE</span>
        <p>明日は新歓交流会です</p>
        <p>会場：池袋駅東口 徒歩5分</p>
      </div>
    );
  }

  if (type === "pay") {
    return (
      <div className="feature-mock pay-mini">
        <small>事前決済</small>
        <strong>¥1,500</strong>
        <span>決済完了</span>
      </div>
    );
  }

  if (type === "reserve") {
    return (
      <div className="feature-mock roster-mini">
        {["山田 太郎", "佐藤 花子", "鈴木 健"].map((name) => (
          <p key={name}>
            <i />
            <b>{name}</b>
            <span>予約済み</span>
          </p>
        ))}
      </div>
    );
  }

  if (type === "blog") {
    return (
      <div className="feature-mock blog-mini">
        <MiniPhoto tone="orange" />
        <div>
          <b>BBQイベントを開催しました</b>
          <small>活動ブログ更新</small>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-mock card-mini">
      <MiniPhoto tone={type === "event" ? "green" : "blue"} />
      <div>
        <b>{type === "portal" ? "人気のイベントに掲載" : type === "event" ? "7/17 新歓交流会" : "団体ページ公開"}</b>
        <small>{type === "portal" ? "閲覧数 +284" : type === "event" ? "残り8名・予約受付中" : "活動写真・FAQ・実績"}</small>
      </div>
      <button type="button">{type === "site" ? "見る" : "予約"}</button>
    </div>
  );
}

export default function ComiuLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const header = document.querySelector<HTMLElement>(".site-header");
    const cursor = document.querySelector<HTMLElement>(".custom-cursor");
    const cursorText = document.querySelector<HTMLElement>(".custom-cursor span");
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

    if (footer) ctaObserver.observe(footer);
    if (finalCta) ctaObserver.observe(finalCta);

    // Lightweight custom cursor for desktop only.
    const moveCursor = (event: MouseEvent) => {
      if (!canHover || !cursor) return;
      cursor.style.setProperty("--x", `${event.clientX}px`);
      cursor.style.setProperty("--y", `${event.clientY}px`);
    };

    const setCursorText = (text = "") => {
      if (!cursor || !cursorText) return;
      cursorText.textContent = text;
      cursor.classList.toggle("has-label", Boolean(text));
    };

    if (canHover && cursor) {
      window.addEventListener("mousemove", moveCursor, { passive: true });
      document.querySelectorAll<HTMLElement>("[data-cursor]").forEach((element) => {
        element.addEventListener("mouseenter", () => setCursorText(element.dataset.cursor));
        element.addEventListener("mouseleave", () => setCursorText(""));
      });
    }

    // Subtle dashboard parallax for desktop. It is disabled for reduced motion.
    const heroVisual = document.querySelector<HTMLElement>(".hero-visual");
    const handleHeroMove = (event: MouseEvent) => {
      if (!canHover || reduceMotion || !heroVisual) return;
      const rect = heroVisual.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      heroVisual.style.setProperty("--tilt-x", `${y * -6}deg`);
      heroVisual.style.setProperty("--tilt-y", `${x * 8}deg`);
      heroVisual.style.setProperty("--float-x", `${x * 16}px`);
      heroVisual.style.setProperty("--float-y", `${y * 16}px`);
    };

    const resetHeroMove = () => {
      heroVisual?.style.setProperty("--tilt-x", "0deg");
      heroVisual?.style.setProperty("--tilt-y", "0deg");
      heroVisual?.style.setProperty("--float-x", "0px");
      heroVisual?.style.setProperty("--float-y", "0px");
    };

    heroVisual?.addEventListener("mousemove", handleHeroMove);
    heroVisual?.addEventListener("mouseleave", resetHeroMove);

    return () => {
      revealObserver.disconnect();
      ctaObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", moveCursor);
      heroVisual?.removeEventListener("mousemove", handleHeroMove);
      heroVisual?.removeEventListener("mouseleave", resetHeroMove);
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
            radial-gradient(circle at 18% 8%, rgba(71, 128, 255, 0.18), transparent 28%),
            radial-gradient(circle at 92% 8%, rgba(150, 84, 255, 0.16), transparent 30%),
            #fbfdff;
        }

        .comiu-lp::before {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          content: "";
          opacity: 0.44;
          background-image: radial-gradient(circle, rgba(36, 93, 255, 0.14) 1px, transparent 1.8px);
          background-size: 22px 22px;
          mask-image: linear-gradient(120deg, transparent 0%, #000 16%, transparent 58%);
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

        .logo span {
          display: grid;
          width: 36px;
          height: 36px;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, var(--blue), var(--purple));
          border-radius: 12px;
          font-size: 18px;
          font-weight: 950;
          box-shadow: 0 10px 24px rgba(46, 92, 255, 0.24);
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
          display: grid;
          min-height: 100svh;
          grid-template-columns: minmax(420px, 0.9fr) minmax(480px, 1.1fr);
          gap: clamp(28px, 6vw, 76px);
          align-items: center;
          padding-top: 142px;
        }

        .hero-copy {
          max-width: 620px;
        }

        .section-label {
          display: inline-flex;
          min-height: 34px;
          align-items: center;
          gap: 9px;
          margin: 0 0 20px;
          padding: 0 14px;
          color: #2652b8;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid #dce7ff;
          border-radius: 999px;
          box-shadow: 0 8px 22px rgba(53, 94, 180, 0.09);
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.08em;
        }

        .section-label::before {
          width: 8px;
          height: 8px;
          content: "";
          background: var(--lime);
          border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(223, 255, 79, 0.24);
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
          max-width: 680px;
          margin-bottom: 22px;
          font-size: clamp(42px, 6vw, 78px);
          line-height: 1.08;
          font-weight: 950;
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
          font-size: 1.12em;
          line-height: 0.96;
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
          max-width: 580px;
          margin-bottom: 18px;
          color: #1a2445;
          font-size: clamp(18px, 2vw, 24px);
          line-height: 1.7;
          font-weight: 820;
          letter-spacing: -0.04em;
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
          background: linear-gradient(100deg, var(--blue), var(--purple));
          box-shadow: 0 18px 38px rgba(39, 80, 255, 0.25);
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

        .custom-cursor {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 200;
          display: grid;
          width: 16px;
          height: 16px;
          place-items: center;
          pointer-events: none;
          border: 1px solid rgba(21, 89, 255, 0.9);
          border-radius: 50%;
          opacity: 0;
          transform: translate(calc(var(--x, -100px) - 50%), calc(var(--y, -100px) - 50%));
          transition: width 0.18s ease, height 0.18s ease, background 0.18s ease, opacity 0.18s ease;
          mix-blend-mode: multiply;
        }

        .custom-cursor span {
          color: #fff;
          font-size: 10px;
          font-weight: 950;
          opacity: 0;
        }

        .custom-cursor.has-label {
          width: 78px;
          height: 78px;
          background: rgba(21, 89, 255, 0.84);
          border-color: transparent;
          mix-blend-mode: normal;
        }

        .custom-cursor.has-label span {
          opacity: 1;
        }

        @media (hover: hover) and (pointer: fine) {
          .custom-cursor {
            opacity: 1;
          }

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
          }

          .hero h1 {
            max-width: 100%;
            font-size: clamp(38px, 11.8vw, 52px);
            line-height: 1.14;
            letter-spacing: -0.075em;
          }

          .hero-lead {
            padding-left: 14px;
            font-size: clamp(21px, 6.2vw, 26px);
            line-height: 1.5;
            letter-spacing: -0.055em;
          }

          .hero-sub {
            font-size: 16px;
            line-height: 1.8;
          }

          .hero-actions .button {
            width: 100%;
          }

          .hero-visual {
            display: grid;
            min-height: auto;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            perspective: none;
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
          .bubble {
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <main className="comiu-lp" id="top">
        <div className="custom-cursor" aria-hidden="true">
          <span />
        </div>

        <header className="site-header">
          <Logo />
          <nav className="desktop-nav" aria-label="主要ナビゲーション">
            <a href="#features">できること</a>
            <a href="#future">導入メリット</a>
            <a className="nav-cta" href="/register" data-cursor="CREATE">
              無料で作成する
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
          <div className="hero-copy reveal">
            <SectionLabel>EVENT & CIRCLE OPERATING APP</SectionLabel>
            <h1>
              <span className="title-line">イベント・サークルの</span>
              <span className="title-line">集客なら</span>
              <span className="title-line accent">COMIU</span>
            </h1>
            <p className="hero-lead">
              団体に合わせたWebサイトを
              <br />
              <strong>無料</strong>で作成
            </p>
            <p className="hero-sub">
              掲載用のホームページなら、もういらない。
              <br />
              Webサイトを、育てるWebアプリケーションへ。
            </p>
            <p className="hero-desc">
              団体ページ、イベント募集、予約管理、活動ブログ、LINE連携。
              運営をまとめて、参加者が集まる仕組みをつくる。
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="/register" data-cursor="CREATE">
                無料で団体ページを作る
              </a>
              <a className="button button-secondary" href="#features">
                COMIUでできることを見る
              </a>
            </div>
          </div>

          <div className="hero-visual reveal" aria-label="COMIU管理画面のイメージ">
            <div className="hero-device">
              <DashboardMock />
            </div>
            <div className="floating-card one blue">
              <small>新規予約</small>
              <b>+12</b>
            </div>
            <div className="floating-card two green">
              <small>LINE通知</small>
              <b>送信済み</b>
            </div>
            <div className="floating-card three purple">
              <small>残り枠</small>
              <b>8名</b>
            </div>
            <div className="floating-card four blue">
              <small>ページ閲覧数</small>
              <b>+284</b>
            </div>
          </div>
        </section>

        <section className="lp-section problem" aria-labelledby="problem-title">
          <div className="problem-head reveal">
            <SectionLabel>BEFORE COMIU</SectionLabel>
            <h2 className="section-title" id="problem-title">
              毎回、ゼロから運営していませんか？
            </h2>
            <p className="section-desc">
              イベントを開催するたびに、Instagramで告知して、Googleフォームを作って、LINEで連絡して、スプレッドシートで名簿を確認する。
              それぞれは便利でも、運営が大きくなるほど、連絡漏れや確認作業が増えていく。
            </p>
          </div>

          <div className="flow-stage" aria-label="バラバラな運営がCOMIUにまとまる流れ">
            <div className="tool-stack">
              {scatteredTools.map((tool) => (
                <div className="tool-card" key={tool.title}>
                  <span>{tool.icon}</span>
                  <b>
                    {tool.title}
                    <small>{tool.text}</small>
                  </b>
                </div>
              ))}
            </div>
            <div className="flow-arrow" aria-hidden="true" />
            <div className="flow-result">
              <DashboardMock compact />
            </div>
          </div>
          <p className="flow-copy reveal">バラバラだった運営を、ひとつの流れへ。</p>
        </section>

        <section className="statement reveal" aria-labelledby="statement-title">
          <div className="statement-inner">
            <SectionLabel>WHY COMIU</SectionLabel>
            <h2 id="statement-title">
              運営が楽になって、
              <br />
              <span>団体が大きくなる。</span>
            </h2>
            <p>
              COMIUは、ただ予約を受け付けるだけのサービスではありません。
              活動の魅力を見せる。イベントを見つけてもらう。参加しやすくする。
              連絡を自動化する。開催するほど、団体の実績が残る。
            </p>
            <div className="statement-list" aria-label="COMIUで起きる変化">
              <span>魅力を見せる</span>
              <span>見つけてもらう</span>
              <span>参加しやすく</span>
              <span>連絡を自動化</span>
              <span>実績が残る</span>
            </div>
            <p>
              イベントを繰り返すたびに、次の参加者に選ばれやすい団体へ。
            </p>
          </div>
        </section>

        <section className="lp-section features-section" id="features" aria-labelledby="features-title">
          <div className="section-head reveal">
            <div>
              <SectionLabel>FEATURES</SectionLabel>
              <h2 className="section-title" id="features-title">
                COMIUにできること
              </h2>
            </div>
            <p className="section-desc">
              募集する。つながる。積み上がる。
              団体運営に必要な仕組みを、ひとつに。
            </p>
          </div>

          <div className="feature-track" data-cursor="DRAG" aria-label="COMIUの機能カード">
            {features.map((feature) => (
              <article className="feature-card" data-cursor="VIEW" key={feature.title}>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
                <FeatureMock type={feature.type} />
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section calendar-section" aria-labelledby="calendar-title">
          <div className="calendar-copy reveal">
            <SectionLabel>EVENT DISCOVERY</SectionLabel>
            <h2 className="section-title" id="calendar-title">
              次のイベントを、迷わず見つけられる。
            </h2>
            <p className="section-desc">
              「次はいつある？」をなくす。活動予定、残り枠、予約状況を、参加者にわかりやすく届ける。
              予約まで迷わないから、問い合わせも減っていく。
            </p>
          </div>
          <div className="calendar-card reveal" data-cursor="EXPLORE">
            <div className="calendar-head">
              <b>2026年7月</b>
              <span>月表示</span>
            </div>
            <div className="calendar-grid" aria-hidden="true">
              {["日", "月", "火", "水", "木", "金", "土", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"].map((item, index) => (
                <span className={index < 7 ? "day" : item === "17" ? "active" : ""} key={`${item}-${index}`}>
                  {item}
                </span>
              ))}
            </div>
            <div className="calendar-list">
              {calendarEvents.map((event) => (
                <article key={event.name}>
                  <time>{event.date}</time>
                  <div>
                    <b>{event.name}</b>
                    <small>詳細・場所・参加費をまとめて表示</small>
                  </div>
                  <span className={`event-status ${event.tone}`}>{event.status}</span>
                </article>
              ))}
            </div>
            <div className="calendar-cta">
              <a className="button button-primary" href="/register" data-cursor="CREATE">
                予約する
              </a>
              <span className="line-label">LINEで前日通知が届きます</span>
            </div>
          </div>
        </section>

        <section className="lp-section asset-section" aria-labelledby="asset-title">
          <div className="asset-grid">
            <div className="reveal">
              <SectionLabel>ASSET</SectionLabel>
              <h2 className="section-title" id="asset-title">
                開催するたび、団体の信頼が残る。
              </h2>
              <p className="section-desc">
                SNS投稿は流れていく。でも、活動レポート、イベント実績、参加者の声は、団体ページに残り続ける。
                開催するほど、初めての人にも「ちゃんと活動している団体」と伝わっていく。
              </p>
            </div>
            <div>
              <div className="timeline" aria-label="活動実績のタイムライン">
                {timeline.map((item, index) => (
                  <article className="timeline-card reveal" style={{ "--i": index } as React.CSSProperties} key={item.month}>
                    <time>{item.month}</time>
                    <div>
                      <b>{item.title}</b>
                      <small>{item.text}</small>
                    </div>
                  </article>
                ))}
              </div>
              <div className="trust-metrics reveal">
                <div>
                  活動ブログ更新
                  <b>18件</b>
                </div>
                <div>
                  参加者レビュー
                  <b>4.8</b>
                </div>
                <div>
                  累計参加者数
                  <b>532名</b>
                </div>
              </div>
              <p className="trust-message reveal">団体の信頼が、次の参加者へつながる。</p>
            </div>
          </div>
        </section>

        <section className="lp-section line-section" aria-labelledby="line-title">
          <div className="line-phone" data-cursor="EXPLORE" aria-label="LINE自動リマインドの画面イメージ">
            <div className="line-screen">
              <h3>
                <span>LINE</span>
                COMIU公式LINE
              </h3>
              {lineBubbles.map((bubble, index) => (
                <p className="bubble" style={{ "--i": index } as React.CSSProperties} key={bubble}>
                  {bubble}
                </p>
              ))}
            </div>
          </div>
          <div className="reveal">
            <SectionLabel>LINE REMIND</SectionLabel>
            <h2 className="section-title" id="line-title">
              連絡を頑張る運営から、参加しやすい仕組みをつくる運営へ。
            </h2>
            <p className="section-desc">
              予約後の案内やイベント前日の通知を、公式LINEで自動化。参加者の不安を減らし、主催者の確認作業も軽くする。
            </p>
            <div className="benefit-list">
              {["案内漏れを減らす", "前日の参加確認を自動化", "当日の問い合わせを減らす", "無断キャンセル対策につながる"].map((item, index) => (
                <p key={item}>
                  <span>{index + 1}</span>
                  {item}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section" id="future" aria-labelledby="future-title">
          <div className="reveal">
            <SectionLabel>AFTER COMIU</SectionLabel>
            <h2 className="section-title" id="future-title">
              イベントを開くたび、次が楽になる。
            </h2>
            <p className="section-desc">
              募集、予約、連絡、実績がひとつにつながると、毎回ゼロから作り直す運営ではなくなる。
            </p>
          </div>
          <div className="future-steps">
            {[
              ["01", "見つけてもらえる", "団体ページとポータル掲載で、新しい参加者に届く。"],
              ["02", "参加しやすくなる", "イベント情報、残り枠、予約、決済、LINE案内がつながる。"],
              ["03", "団体が積み上がる", "活動実績と参加者とのつながりが残り、次の集客につながる。"],
            ].map((step) => (
              <article className="future-card reveal" key={step[0]}>
                <span>{step[0]}</span>
                <h3>{step[1]}</h3>
                <p>{step[2]}</p>
              </article>
            ))}
          </div>
          <p className="future-message reveal">
            COMIUは、イベントを一回成功させるためのツールではない。
            <br />
            <strong>団体を、続いていくコミュニティへ育てるための仕組み。</strong>
          </p>
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
