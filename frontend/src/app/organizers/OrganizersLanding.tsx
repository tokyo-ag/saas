"use client";

const toolCards = [
  ["📸", "Instagram 告知", "告知"],
  ["📝", "Googleフォーム", "申込み受付"],
  ["💬", "LINEグループ", "連絡・共有"],
  ["🟩", "スプレッドシート", "名簿管理"],
  ["🅿️", "PayPay", "支払い確認"],
  ["🗒️", "メモ帳", "タスク・メモ"],
];

const eventRows = [
  ["新歓スポーツ大会", "2025.05.24 (土)", "128 / 200", "88%"],
  ["春のボランティア活動", "2025.05.31 (土)", "86 / 150", "68%"],
  ["BBQパーティー", "2025.06.14 (土)", "42 / 80", "52%"],
];

const memberRows = [
  ["山田 太郎", "経済学部 3年", "参加確定"],
  ["佐藤 花子", "文学部 2年", "参加確定"],
  ["鈴木 健", "工学部 1年", "キャンセル待ち"],
  ["田中 美咲", "法学部 2年", "未対応"],
];

const featureCards = [
  {
    no: "1",
    title: "団体ページを無料で作成",
    text: "団体の紹介・ビジョン・SNS・実績などをひとつのページで発信できます。",
    mock: "profile",
  },
  {
    no: "2",
    title: "イベント募集をまとめる",
    text: "複数のイベントを一覧で掲載。参加者はカンタンに申し込み可能です。",
    mock: "event",
  },
  {
    no: "3",
    title: "公式LINEで自動リマインド",
    text: "イベント前に自動でお知らせ。参加率アップとドタキャン防止に。",
    mock: "line",
  },
  {
    no: "4",
    title: "事前決済と予約管理",
    text: "参加費の事前決済でスムーズに運営。申込者の管理も一画面で完結します。",
    mock: "payment",
  },
];

function Logo() {
  return <span className="logo-word">COMIU</span>;
}

function PageBadge({ page }: { page: string }) {
  return <span className="page-badge">{page} / 5</span>;
}

function EventThumb({ tone = "blue" }: { tone?: "blue" | "green" | "orange" | "pink" }) {
  return (
    <span className={`event-thumb ${tone}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function DashboardMock() {
  return (
    <div className="dashboard-mock">
      <div className="mock-head">
        <Logo />
        <b>ダッシュボード</b>
        <span>🔔</span>
        <span>☰</span>
      </div>

      <div className="mock-panel event-panel">
        <div className="panel-title">
          <b>イベント一覧</b>
          <a>一覧を見る</a>
        </div>
        {eventRows.map((event, index) => (
          <div className="event-row" key={event[0]}>
            <EventThumb tone={index === 2 ? "orange" : "blue"} />
            <div>
              <b>{event[0]}</b>
              <small>{event[1]}</small>
            </div>
            <span>申込数</span>
            <strong>{event[2]}</strong>
            <em style={{ width: event[3] }} />
          </div>
        ))}
      </div>

      <div className="mock-grid">
        <div className="mock-panel stat-chart">
          <div className="panel-title">
            <b>予約・申込の状況</b>
            <a>一覧を見る</a>
          </div>
          <span>今日の申込</span>
          <strong>28件</strong>
          <small>+12件（前日比）</small>
          <div className="spark">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>

        <div className="mock-panel notice-list">
          <div className="panel-title">
            <b>お知らせ</b>
            <a>一覧を見る</a>
          </div>
          {["新着メンバー募集！", "持ち物について", "会場アクセス", "雨天時の対応"].map((item, index) => (
            <p key={item}>
              <span>▣</span>
              <b>{item}</b>
              <small>05.{10 - index}</small>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemberListCard() {
  return (
    <div className="float-card members-card">
      <div className="panel-title">
        <b>参加者リスト</b>
        <a>一覧を見る</a>
      </div>
      {memberRows.map((member, index) => (
        <p key={member[0]}>
          <span className={`face face-${index + 1}`} />
          <b>{member[0]}</b>
          <small>{member[1]}</small>
          <em>{member[2]}</em>
        </p>
      ))}
      <strong>+ 284 人を見る</strong>
    </div>
  );
}

function NoticeCard() {
  return (
    <div className="float-card notice-card">
      <div className="panel-title">
        <b>お知らせ</b>
        <a>一覧を見る</a>
      </div>
      {["新着メンバー募集！", "持ち物について", "会場アクセス", "雨天時の対応"].map((item, index) => (
        <p key={item}>
          <span>▣</span>
          <b>{item}</b>
          <small>05.{10 - index}</small>
        </p>
      ))}
      <strong>すべてのお知らせを見る</strong>
    </div>
  );
}

function FeatureMock({ type }: { type: string }) {
  if (type === "profile") {
    return (
      <div className="feature-profile">
        <EventThumb tone="green" />
        <div>
          <b>NEXUS 大学生団体</b>
          <small>つながる、動き出す、未来をつくる。</small>
          <p>
            <span>メンバー 128人</span>
            <span>イベント 24件</span>
            <span>フォロワー 342人</span>
          </p>
        </div>
      </div>
    );
  }

  if (type === "event") {
    return (
      <div className="feature-event">
        <EventThumb tone="green" />
        <div>
          <em>募集中</em>
          <b>海岸清掃ボランティア</b>
          <small>6/22（日）9:00 - 12:00</small>
          <p>参加予定 46人</p>
        </div>
        <button>詳しく見る</button>
      </div>
    );
  }

  if (type === "line") {
    return (
      <div className="feature-line">
        <i>LINE</i>
        <p>こんにちは！NEXUSです 🌱</p>
        <p>
          海岸清掃ボランティア
          <br />
          開催まであと2日です！
        </p>
        <button>詳細を確認する</button>
      </div>
    );
  }

  return (
    <div className="feature-payment">
      <div>
        <span>参加費</span>
        <b>¥2,000</b>
        <small>税込</small>
        <button>支払って申し込む</button>
      </div>
      <div>
        <span>申込者一覧（46人）</span>
        {memberRows.slice(0, 4).map((member, index) => (
          <p key={member[0]}>
            <span className={`face face-${index + 1}`} />
            <b>{member[0]}</b>
          </p>
        ))}
      </div>
    </div>
  );
}

function CalendarMock() {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dates = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 1, 2];
  return (
    <div className="calendar-card">
      <div className="calendar-head">
        <button>‹</button>
        <b>2025年7月</b>
        <button>›</button>
        <em>月表示⌄</em>
      </div>
      <div className="calendar-grid days">
        {days.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {dates.map((date, index) => (
          <span className={date === 16 ? "selected" : index % 5 === 0 ? "with-dot" : ""} key={`${date}-${index}`}>
            {date}
          </span>
        ))}
      </div>
      <div className="calendar-events">
        {[
          ["7/13", "バドミントン", "残り8名", "blue"],
          ["7/17", "新歓交流会", "予約受付中", "green"],
          ["7/19", "BBQ", "女性枠あと3名", "pink"],
        ].map((event, index) => (
          <p key={event[1]}>
            <EventThumb tone={index === 2 ? "orange" : "blue"} />
            <b>{event[0]}　{event[1]}</b>
            <em className={`pill-${event[3]}`}>{event[2]}</em>
            <span>›</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function ProfilePhone() {
  return (
    <div className="profile-phone">
      <div className="phone-topbar">
        <span>9:41</span>
        <i />
      </div>
      <Logo />
      <div className="profile-cover">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="profile-body">
        <span className="profile-logo">COMIU</span>
        <h3>青空スポーツクラブ</h3>
        <p>スポーツを通じて、地域のつながりと笑顔をつくるコミュニティです。</p>
        <div className="profile-stats">
          <span>メンバー<br /><b>132名</b></span>
          <span>イベント<br /><b>24件</b></span>
          <span>フォロワー<br /><b>256人</b></span>
        </div>
        <button>フォローする</button>
        <div className="next-event">
          <EventThumb tone="green" />
          <div>
            <b>春の交流フットサル大会</b>
            <small>2025/06/15（日）9:00-12:00</small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComiuLandingPage() {
  return (
    <>
      <style jsx global>{`
        :root {
          --ink: #070d2f;
          --muted: #5f6985;
          --blue: #1557ff;
          --blue2: #3655ff;
          --purple: #9946ff;
          --violet: #7554ff;
          --green: #08c35e;
          --soft-blue: #edf5ff;
          --line: #dfe7fb;
          --shadow: 0 22px 58px rgba(39, 68, 159, 0.16);
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          color: var(--ink);
          background: #f6f9ff;
          font-family: Inter, "Noto Sans JP", system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        button,
        input,
        textarea {
          font: inherit;
        }

        a {
          color: inherit;
        }

        .story-page {
          overflow: hidden;
          background:
            radial-gradient(circle at 22% 6%, rgba(98, 149, 255, 0.2), transparent 32%),
            radial-gradient(circle at 82% 16%, rgba(162, 76, 255, 0.13), transparent 28%),
            #f8fbff;
        }

        .story-slide {
          position: relative;
          min-height: 100vh;
          padding: 38px clamp(24px, 4vw, 56px) 48px;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 0%, rgba(221, 237, 255, 0.95), transparent 36%),
            linear-gradient(135deg, #ffffff 0%, #f8fbff 48%, #f3edff 100%);
          border-bottom: 1px solid rgba(213, 224, 255, 0.7);
        }

        .story-slide::before,
        .story-slide::after {
          position: absolute;
          content: "";
          pointer-events: none;
        }

        .story-slide::before {
          right: 64px;
          top: 18px;
          width: 220px;
          height: 180px;
          opacity: 0.34;
          background-image: radial-gradient(circle, #bf86ff 2px, transparent 2.5px);
          background-size: 18px 18px;
        }

        .story-slide::after {
          left: -90px;
          bottom: -130px;
          width: 118%;
          height: 300px;
          background:
            radial-gradient(circle at 14% 58%, rgba(65, 123, 255, 0.26), transparent 22%),
            linear-gradient(165deg, rgba(36, 102, 255, 0.2), rgba(160, 86, 255, 0.17) 60%, transparent 61%);
          transform: rotate(4deg);
        }

        .slide-inner {
          position: relative;
          z-index: 2;
          width: min(1180px, 100%);
          min-height: calc(100vh - 86px);
          margin: 0 auto;
        }

        .logo-word {
          display: inline-block;
          color: transparent;
          background: linear-gradient(90deg, #0959ff 4%, #2350ff 48%, #ac3eff 100%);
          background-clip: text;
          -webkit-background-clip: text;
          font-size: clamp(34px, 4.1vw, 54px);
          font-weight: 950;
          letter-spacing: -0.08em;
          line-height: 1;
        }

        .page-badge {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 5;
          min-width: 106px;
          padding: 14px 22px;
          color: var(--ink);
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid #dfe6fb;
          border-radius: 22px;
          box-shadow: 0 10px 28px rgba(59, 84, 159, 0.1);
          font-size: 25px;
          font-weight: 950;
          text-align: center;
        }

        .page-badge::first-letter {
          color: var(--blue);
        }

        .page-badge.gradient {
          color: #fff;
          background: linear-gradient(100deg, #1259ff, #a442ff);
          border-color: transparent;
        }

        .hero-one .slide-inner {
          display: grid;
          grid-template-columns: minmax(430px, 0.92fr) minmax(470px, 1fr);
          gap: 30px;
          align-items: start;
        }

        .hero-copy {
          position: relative;
          padding-top: 110px;
        }

        .hero-one .hero-copy > .logo-word {
          position: absolute;
          top: 0;
          left: 0;
        }

        .hero-title {
          margin: 0 0 28px;
          font-size: clamp(52px, 6.5vw, 88px);
          line-height: 1.18;
          font-weight: 950;
          letter-spacing: -0.08em;
        }

        .hero-title strong,
        .section-title strong,
        .blue-gradient {
          color: transparent;
          background: linear-gradient(90deg, #1557ff, #9c45ff);
          background-clip: text;
          -webkit-background-clip: text;
        }

        .hero-title .comiu-big {
          display: block;
          margin-top: 4px;
          font-size: clamp(95px, 11vw, 152px);
          line-height: 0.94;
          letter-spacing: -0.06em;
        }

        .hero-lead {
          display: grid;
          grid-template-columns: 6px 1fr;
          gap: 22px;
          align-items: center;
          margin: 0 0 30px;
          font-size: clamp(24px, 2.6vw, 36px);
          line-height: 1.35;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .hero-lead::before {
          width: 6px;
          height: 86px;
          content: "";
          background: var(--blue);
          border-radius: 999px;
        }

        .hero-lead strong {
          color: var(--blue);
        }

        .hero-desc {
          max-width: 520px;
          margin: 0 0 28px;
          color: #17213f;
          font-size: 23px;
          line-height: 1.75;
          font-weight: 850;
          letter-spacing: -0.05em;
        }

        .big-cta {
          display: inline-flex;
          min-height: 86px;
          align-items: center;
          justify-content: center;
          gap: 32px;
          padding: 0 46px;
          color: #fff;
          background: linear-gradient(95deg, #075cff, #a63dff);
          border: 7px solid rgba(255, 255, 255, 0.94);
          border-radius: 999px;
          box-shadow: 0 18px 42px rgba(55, 77, 235, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.28);
          text-decoration: none;
          font-size: clamp(21px, 2.5vw, 34px);
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .hero-one .big-cta {
          position: absolute;
          bottom: 96px;
          left: 50%;
          z-index: 7;
          width: min(820px, calc(100% - 160px));
          transform: translateX(-50%);
        }

        .big-cta span:first-child {
          display: grid;
          width: 58px;
          height: 58px;
          place-items: center;
          border: 5px solid rgba(255, 255, 255, 0.88);
          border-radius: 16px;
          font-size: 28px;
        }

        .hero-visual {
          position: relative;
          min-height: 1020px;
          padding-top: 110px;
        }

        .phone-shell {
          position: absolute;
          right: 12px;
          top: 86px;
          width: 470px;
          height: 930px;
          padding: 22px;
          background: linear-gradient(180deg, #ffffff, #f7f9ff);
          border: 10px solid rgba(238, 243, 255, 0.94);
          border-radius: 70px;
          box-shadow: 0 30px 70px rgba(44, 66, 151, 0.23);
        }

        .phone-shell::before {
          position: absolute;
          top: 16px;
          left: 50%;
          width: 126px;
          height: 28px;
          content: "";
          background: #0b102c;
          border-radius: 0 0 20px 20px;
          transform: translateX(-50%);
        }

        .phone-screen {
          height: 100%;
          padding: 52px 24px 24px;
          overflow: hidden;
          background: #fff;
          border-radius: 50px;
        }

        .float-side {
          position: absolute;
          right: -8px;
          top: 430px;
          z-index: 4;
          display: grid;
          gap: 22px;
        }

        .side-stat {
          display: grid;
          width: 122px;
          min-height: 126px;
          place-items: center;
          padding: 16px 12px;
          color: var(--green);
          background: rgba(255, 255, 255, 0.92);
          border: 2px solid #baffd5;
          border-radius: 20px;
          box-shadow: 0 18px 38px rgba(18, 194, 104, 0.18);
          text-align: center;
          font-size: 18px;
          font-weight: 950;
        }

        .side-stat b {
          color: var(--ink);
          font-size: 29px;
        }

        .side-stat small {
          color: var(--green);
          font-size: 16px;
        }

        .float-card {
          position: absolute;
          z-index: 5;
          padding: 20px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #e3eaff;
          border-radius: 22px;
          box-shadow: var(--shadow);
        }

        .members-card {
          left: -410px;
          bottom: 126px;
          width: 360px;
        }

        .notice-card {
          left: -30px;
          bottom: 154px;
          width: 360px;
        }

        .panel-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
          font-size: 16px;
          font-weight: 950;
        }

        .panel-title a {
          color: var(--blue);
          font-size: 13px;
          font-weight: 950;
          text-decoration: none;
        }

        .members-card p,
        .notice-card p {
          display: grid;
          grid-template-columns: 45px 1fr auto;
          gap: 10px 12px;
          align-items: center;
          margin: 0;
          padding: 10px 0;
          border-bottom: 1px solid #edf1fb;
        }

        .notice-card p {
          grid-template-columns: 24px 1fr auto;
        }

        .members-card small {
          grid-column: 2;
          color: var(--muted);
          font-weight: 750;
        }

        .members-card em {
          grid-row: 1 / span 2;
          grid-column: 3;
          padding: 5px 9px;
          color: #0cbf64;
          background: #e9fff2;
          border-radius: 8px;
          font-size: 12px;
          font-style: normal;
          font-weight: 900;
        }

        .members-card > strong,
        .notice-card > strong {
          display: block;
          margin-top: 14px;
          color: var(--blue);
          text-align: center;
          font-size: 17px;
        }

        .face,
        .event-thumb {
          display: block;
          overflow: hidden;
          background: linear-gradient(135deg, #9cc8ff, #f7a6d7);
          border-radius: 12px;
        }

        .face {
          width: 42px;
          height: 42px;
        }

        .face-2 {
          background: linear-gradient(135deg, #ffe3a0, #9dcaff);
        }

        .face-3 {
          background: linear-gradient(135deg, #b9f1d2, #7b8cff);
        }

        .face-4 {
          background: linear-gradient(135deg, #ffb0b0, #ffe099);
        }

        .event-thumb {
          position: relative;
          width: 62px;
          height: 48px;
          flex: 0 0 auto;
        }

        .event-thumb i {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.72);
        }

        .event-thumb i:nth-child(1) {
          left: 8px;
          top: 10px;
          width: 14px;
          height: 14px;
        }

        .event-thumb i:nth-child(2) {
          left: 27px;
          top: 16px;
          width: 19px;
          height: 19px;
        }

        .event-thumb i:nth-child(3) {
          right: 7px;
          bottom: 8px;
          width: 24px;
          height: 8px;
          border-radius: 999px;
        }

        .event-thumb.green {
          background: linear-gradient(135deg, #31d681, #8bd3ff);
        }

        .event-thumb.orange {
          background: linear-gradient(135deg, #f09446, #ffd76f);
        }

        .event-thumb.pink {
          background: linear-gradient(135deg, #fd84c4, #8d91ff);
        }

        .dashboard-mock {
          color: var(--ink);
        }

        .mock-head {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }

        .mock-head .logo-word {
          font-size: 24px;
        }

        .mock-head b {
          flex: 1;
          font-size: 17px;
          letter-spacing: -0.04em;
        }

        .mock-panel {
          background: #fff;
          border: 1px solid #e4eafd;
          border-radius: 18px;
          box-shadow: 0 12px 25px rgba(46, 68, 150, 0.08);
        }

        .event-panel {
          padding: 20px;
        }

        .event-row {
          position: relative;
          display: grid;
          grid-template-columns: 62px 1fr auto auto;
          gap: 12px;
          align-items: center;
          padding: 13px 0;
          border-top: 1px solid #edf1fb;
          font-size: 13px;
        }

        .event-row:first-of-type {
          border-top: 0;
        }

        .event-row small,
        .event-row span {
          color: var(--muted);
          font-weight: 800;
        }

        .event-row strong {
          font-weight: 950;
        }

        .event-row em {
          position: absolute;
          right: 0;
          bottom: 8px;
          height: 7px;
          max-width: 115px;
          background: linear-gradient(90deg, #0f5cff, #97b9ff);
          border-radius: 999px;
        }

        .mock-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 26px;
        }

        .stat-chart,
        .notice-list {
          min-height: 200px;
          padding: 18px;
        }

        .stat-chart > span {
          color: var(--muted);
          font-weight: 800;
        }

        .stat-chart > strong {
          display: block;
          margin: 10px 0 0;
          font-size: 46px;
          letter-spacing: -0.06em;
        }

        .stat-chart > small {
          color: var(--blue);
          font-size: 16px;
          font-weight: 950;
        }

        .spark {
          display: flex;
          height: 48px;
          align-items: end;
          gap: 8px;
          margin-top: 22px;
        }

        .spark i {
          flex: 1;
          height: 22px;
          background: linear-gradient(180deg, #7f5fff, #115cff);
          border-radius: 999px 999px 4px 4px;
        }

        .spark i:nth-child(2) {
          height: 31px;
        }

        .spark i:nth-child(3) {
          height: 27px;
        }

        .spark i:nth-child(4) {
          height: 42px;
        }

        .spark i:nth-child(5) {
          height: 35px;
        }

        .notice-list p {
          display: grid;
          grid-template-columns: 28px 1fr auto;
          gap: 10px;
          align-items: center;
          margin: 0;
          padding: 11px 0;
          border-top: 1px solid #edf1fb;
          font-size: 14px;
        }

        .notice-list small {
          color: var(--muted);
        }

        .bottom-count {
          position: absolute;
          left: 50%;
          bottom: 0;
          z-index: 5;
          min-width: 160px;
          padding: 16px 26px;
          background: #fff;
          border: 1px solid #e0e7fb;
          border-radius: 20px;
          box-shadow: var(--shadow);
          transform: translateX(-50%);
          text-align: center;
          font-size: 35px;
          font-weight: 950;
        }

        .bottom-count span:first-child {
          color: var(--blue);
        }

        .sparkle {
          position: absolute;
          color: #9fc5ff;
          font-size: 80px;
          filter: drop-shadow(0 10px 28px rgba(61, 121, 255, 0.3));
        }

        .sparkle.one {
          left: 68px;
          bottom: 365px;
        }

        .slide-two .slide-inner {
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 34px;
        }

        .problem-title {
          margin: 86px 0 0;
          max-width: 920px;
          font-size: clamp(42px, 5.4vw, 70px);
          line-height: 1.35;
          letter-spacing: -0.07em;
        }

        .problem-sub {
          margin: 0;
          font-size: clamp(22px, 2.4vw, 32px);
          line-height: 1.75;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .before-after {
          display: grid;
          grid-template-columns: minmax(380px, 0.9fr) 150px minmax(460px, 1.2fr);
          gap: 24px;
          align-items: center;
        }

        .tool-cloud {
          position: relative;
          min-height: 300px;
        }

        .tool-card {
          position: absolute;
          display: grid;
          grid-template-columns: 46px 1fr;
          gap: 14px;
          align-items: center;
          width: 240px;
          min-height: 88px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #e1e8fb;
          border-radius: 16px;
          box-shadow: var(--shadow);
          font-weight: 950;
          transform: rotate(-4deg);
        }

        .tool-card span {
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          font-size: 29px;
        }

        .tool-card small {
          display: block;
          margin-top: 4px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 800;
        }

        .tool-card:nth-child(1) {
          left: 0;
          top: 0;
        }

        .tool-card:nth-child(2) {
          left: 270px;
          top: 0;
          transform: rotate(0deg);
        }

        .tool-card:nth-child(3) {
          right: 0;
          top: 24px;
          transform: rotate(5deg);
        }

        .tool-card:nth-child(4) {
          left: 20px;
          top: 130px;
          transform: rotate(-5deg);
        }

        .tool-card:nth-child(5) {
          left: 320px;
          top: 142px;
          transform: rotate(3deg);
        }

        .tool-card:nth-child(6) {
          right: 20px;
          top: 154px;
          transform: rotate(7deg);
        }

        .arrow-flow {
          width: 145px;
          height: 245px;
          background: linear-gradient(90deg, rgba(94, 83, 255, 0.14), rgba(132, 69, 255, 0.56));
          clip-path: polygon(0 27%, 61% 27%, 61% 0, 100% 50%, 61% 100%, 61% 73%, 0 73%);
          filter: drop-shadow(0 18px 35px rgba(93, 73, 255, 0.24));
        }

        .unified-title {
          align-self: end;
          color: transparent;
          background: linear-gradient(100deg, var(--blue), var(--purple));
          background-clip: text;
          -webkit-background-clip: text;
          font-size: clamp(38px, 4.5vw, 60px);
          font-weight: 950;
          line-height: 1.35;
          letter-spacing: -0.07em;
        }

        .full-dashboard {
          padding: 28px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid #e4eafd;
          border-radius: 30px;
          box-shadow: var(--shadow);
        }

        .wide-band {
          position: relative;
          z-index: 3;
          margin: 20px auto 0;
          padding: 24px 36px;
          color: #fff;
          background: linear-gradient(95deg, var(--blue), #a64bff);
          border-radius: 999px;
          text-align: center;
          font-size: clamp(24px, 2.8vw, 38px);
          font-weight: 950;
          letter-spacing: 0.08em;
        }

        .slide-three .slide-inner,
        .slide-four .slide-inner,
        .slide-five .slide-inner {
          padding-top: 32px;
        }

        .section-title {
          margin: 64px 0 14px;
          text-align: center;
          font-size: clamp(52px, 6.4vw, 88px);
          line-height: 1.1;
          font-weight: 950;
          letter-spacing: -0.08em;
        }

        .section-title.left {
          text-align: left;
        }

        .section-subtitle {
          margin: 0 0 52px;
          color: #49536d;
          text-align: center;
          font-size: clamp(25px, 2.6vw, 36px);
          font-weight: 900;
          letter-spacing: 0.06em;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 28px;
        }

        .feature-card {
          min-height: 445px;
          padding: 38px 38px 32px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #e4eafd;
          border-radius: 28px;
          box-shadow: var(--shadow);
        }

        .feature-heading {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 30px;
        }

        .feature-heading span {
          display: grid;
          width: 54px;
          height: 54px;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, var(--blue), var(--purple));
          border-radius: 50%;
          box-shadow: 0 12px 28px rgba(72, 73, 255, 0.24);
          font-size: 29px;
          font-weight: 950;
        }

        .feature-heading h3 {
          margin: 0;
          font-size: clamp(25px, 2.4vw, 35px);
          letter-spacing: -0.06em;
        }

        .feature-heading strong {
          color: var(--blue);
        }

        .feature-card > p {
          margin: 26px 0 0;
          color: #1f2948;
          font-size: clamp(19px, 1.9vw, 25px);
          line-height: 1.6;
          text-align: center;
          font-weight: 850;
        }

        .feature-profile,
        .feature-event,
        .feature-line,
        .feature-payment {
          min-height: 190px;
          padding: 24px;
          background: #fff;
          border: 1px solid #e4eafd;
          border-radius: 22px;
          box-shadow: 0 14px 32px rgba(60, 82, 160, 0.11);
        }

        .feature-profile {
          display: grid;
          grid-template-columns: 148px 1fr;
          gap: 22px;
          align-items: center;
        }

        .feature-profile .event-thumb {
          width: 148px;
          height: 128px;
          border-radius: 16px;
        }

        .feature-profile b {
          display: block;
          font-size: 25px;
        }

        .feature-profile small {
          color: var(--muted);
          font-weight: 850;
        }

        .feature-profile p {
          display: flex;
          gap: 22px;
          margin: 18px 0 0;
          color: #314169;
          font-size: 14px;
          font-weight: 900;
        }

        .feature-event {
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 22px;
          align-items: center;
          position: relative;
        }

        .feature-event .event-thumb {
          width: 160px;
          height: 138px;
          border-radius: 16px;
        }

        .feature-event em {
          display: inline-block;
          margin-bottom: 8px;
          padding: 7px 16px;
          color: var(--blue);
          background: #eaf0ff;
          border-radius: 999px;
          font-style: normal;
          font-weight: 950;
        }

        .feature-event b {
          display: block;
          font-size: 24px;
        }

        .feature-event small {
          display: block;
          margin: 9px 0;
          color: #293653;
          font-weight: 850;
        }

        .feature-event p {
          margin: 0;
          color: var(--blue);
          font-weight: 950;
        }

        .feature-event button,
        .feature-payment button {
          border: 0;
          color: #fff;
          background: var(--blue);
          border-radius: 999px;
          font-weight: 950;
        }

        .feature-event button {
          position: absolute;
          right: 22px;
          bottom: 22px;
          padding: 12px 22px;
        }

        .feature-line {
          position: relative;
          display: grid;
          gap: 12px;
          background: linear-gradient(135deg, #cfe1ff, #87b3ff);
        }

        .feature-line i {
          position: absolute;
          left: -40px;
          top: 64px;
          display: grid;
          width: 76px;
          height: 76px;
          place-items: center;
          color: #fff;
          background: #13c45c;
          border-radius: 50%;
          box-shadow: 0 14px 30px rgba(19, 196, 92, 0.26);
          font-style: normal;
          font-size: 17px;
          font-weight: 950;
        }

        .feature-line p {
          width: fit-content;
          max-width: 82%;
          margin: 0;
          padding: 14px 18px;
          background: #fff;
          border-radius: 16px;
          font-size: 18px;
          font-weight: 850;
        }

        .feature-line button {
          width: fit-content;
          margin-top: 2px;
          padding: 13px 46px;
          border: 1px solid #dbe5ff;
          color: var(--blue);
          background: #fff;
          border-radius: 12px;
          font-weight: 950;
        }

        .feature-payment {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .feature-payment > div {
          padding: 18px;
          background: #fff;
          border: 1px solid #e8eefb;
          border-radius: 16px;
        }

        .feature-payment span {
          color: #293653;
          font-weight: 900;
        }

        .feature-payment b {
          display: block;
          margin: 10px 0;
          font-size: 34px;
        }

        .feature-payment small {
          color: var(--muted);
        }

        .feature-payment button {
          width: 100%;
          margin-top: 20px;
          padding: 14px;
        }

        .feature-payment p {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 10px 0;
          font-size: 14px;
        }

        .feature-payment .face {
          width: 34px;
          height: 34px;
        }

        .note-line {
          position: relative;
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 26px;
          margin: 50px auto 0;
          color: var(--blue);
          font-size: clamp(24px, 2.4vw, 34px);
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .note-line span {
          display: grid;
          width: 74px;
          height: 74px;
          place-items: center;
          background: #fff;
          border: 1px solid #e2e9fb;
          border-radius: 50%;
          box-shadow: var(--shadow);
        }

        .note-line strong {
          color: transparent;
          background: linear-gradient(90deg, #1557ff, #9c45ff);
          background-clip: text;
          -webkit-background-clip: text;
        }

        .slide-four .section-title {
          margin-top: 54px;
        }

        .operation-card {
          display: grid;
          grid-template-columns: 0.85fr 1.15fr;
          gap: 32px;
          align-items: center;
          margin-top: 40px;
          padding: 40px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #e4eafd;
          border-radius: 30px;
          box-shadow: var(--shadow);
        }

        .operation-copy {
          padding: 20px 0;
        }

        .number-orb {
          display: grid;
          width: 88px;
          height: 88px;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, var(--blue), var(--purple));
          border-radius: 50%;
          box-shadow: 0 18px 38px rgba(80, 73, 255, 0.28);
          font-size: 38px;
          font-weight: 950;
        }

        .operation-copy h3 {
          margin: 40px 0 22px;
          font-size: clamp(38px, 4.5vw, 62px);
          line-height: 1.28;
          letter-spacing: -0.08em;
        }

        .operation-copy h3 strong {
          color: var(--blue);
        }

        .operation-copy p {
          color: #1d2948;
          font-size: clamp(20px, 2vw, 28px);
          line-height: 1.8;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .line-remind {
          display: flex;
          max-width: 430px;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 50px;
          padding: 20px 26px;
          background: #fff;
          border: 1px solid #e4eafd;
          border-radius: 18px;
          box-shadow: 0 15px 32px rgba(58, 78, 160, 0.12);
          font-size: 22px;
          font-weight: 950;
        }

        .line-remind i {
          display: grid;
          width: 58px;
          height: 58px;
          place-items: center;
          color: #fff;
          background: #12c45d;
          border-radius: 16px;
          font-style: normal;
          font-size: 15px;
        }

        .line-remind span {
          color: #9b84ff;
          font-size: 28px;
        }

        .calendar-card {
          padding: 30px;
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid #e4eafd;
          border-radius: 28px;
          box-shadow: var(--shadow);
        }

        .calendar-head {
          display: flex;
          align-items: center;
          gap: 22px;
          margin-bottom: 28px;
          font-size: 26px;
          font-weight: 950;
        }

        .calendar-head button {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border: 0;
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 8px 20px rgba(44, 68, 145, 0.1);
          font-size: 28px;
        }

        .calendar-head b {
          flex: 1;
        }

        .calendar-head em {
          padding: 10px 18px;
          color: #fff;
          background: var(--blue);
          border-radius: 999px;
          font-size: 18px;
          font-style: normal;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          text-align: center;
        }

        .calendar-grid.days {
          margin-bottom: 12px;
          font-weight: 950;
        }

        .calendar-grid span {
          position: relative;
          display: grid;
          min-height: 46px;
          place-items: center;
          border-radius: 50%;
          font-size: 20px;
          font-weight: 850;
        }

        .calendar-grid .selected {
          color: var(--blue);
          background: #efe9ff;
          outline: 3px solid #9f83ff;
        }

        .calendar-grid .with-dot::after {
          position: absolute;
          bottom: 2px;
          width: 7px;
          height: 7px;
          content: "";
          background: var(--green);
          border-radius: 50%;
        }

        .calendar-events {
          margin-top: 24px;
        }

        .calendar-events p {
          display: grid;
          grid-template-columns: 76px 1fr auto 20px;
          gap: 16px;
          align-items: center;
          margin: 12px 0;
          padding: 12px 18px;
          background: #fff;
          border: 1px solid #e6ecfb;
          border-radius: 18px;
          box-shadow: 0 10px 22px rgba(58, 78, 160, 0.08);
        }

        .calendar-events .event-thumb {
          width: 72px;
          height: 58px;
        }

        .calendar-events b {
          font-size: 24px;
        }

        .calendar-events em {
          padding: 10px 18px;
          border-radius: 999px;
          font-size: 17px;
          font-style: normal;
          font-weight: 950;
        }

        .pill-blue {
          color: var(--blue);
          background: #eef3ff;
        }

        .pill-green {
          color: #0fa856;
          background: #eafff1;
        }

        .pill-pink {
          color: #ff3d94;
          background: #fff0f8;
        }

        .timeline-list {
          display: grid;
          gap: 15px;
        }

        .timeline-row {
          display: grid;
          grid-template-columns: 70px 16px 108px 1fr auto;
          gap: 16px;
          align-items: center;
        }

        .timeline-row time {
          display: grid;
          width: 60px;
          height: 60px;
          place-items: center;
          color: var(--blue);
          background: #fff;
          border: 1px solid #e4eafd;
          border-radius: 50%;
          font-size: 21px;
          font-weight: 950;
          box-shadow: 0 10px 22px rgba(58, 78, 160, 0.08);
        }

        .timeline-row .dot {
          width: 12px;
          height: 12px;
          background: var(--blue);
          border-radius: 50%;
          box-shadow: 0 0 0 5px #e8efff;
        }

        .timeline-row .event-thumb {
          width: 100px;
          height: 64px;
        }

        .timeline-row p {
          margin: 0;
          font-size: 20px;
          font-weight: 950;
        }

        .timeline-row small {
          display: block;
          margin-top: 5px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 850;
        }

        .timeline-row em {
          color: #293653;
          font-style: normal;
          font-weight: 950;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 30px;
        }

        .stats-row div {
          padding: 22px;
          background: #fff;
          border: 1px solid #e4eafd;
          border-radius: 18px;
          box-shadow: 0 10px 22px rgba(58, 78, 160, 0.08);
          text-align: center;
          font-size: 18px;
          font-weight: 950;
        }

        .stats-row strong {
          display: block;
          margin-top: 8px;
          color: var(--blue);
          font-size: 42px;
          letter-spacing: -0.04em;
        }

        .slide-dots {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 28px;
        }

        .slide-dots i {
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #81a9ff, #a64bff);
          border-radius: 50%;
        }

        .final-layout {
          display: grid;
          grid-template-columns: minmax(500px, 1fr) minmax(420px, 0.88fr);
          gap: 44px;
          align-items: center;
          margin-top: 80px;
        }

        .final-copy h1 {
          margin: 0;
          font-size: clamp(54px, 6.1vw, 82px);
          line-height: 1.45;
          letter-spacing: -0.08em;
        }

        .final-copy h1 strong {
          color: transparent;
          background: linear-gradient(90deg, #8e40ff, #175cff);
          background-clip: text;
          -webkit-background-clip: text;
        }

        .final-copy p {
          margin: 38px 0 0;
          font-size: clamp(26px, 2.5vw, 36px);
          line-height: 1.82;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .final-copy p strong {
          color: var(--blue);
        }

        .phone-stage {
          position: relative;
          min-height: 650px;
        }

        .profile-phone {
          position: absolute;
          right: 74px;
          top: 0;
          width: 350px;
          min-height: 625px;
          padding: 16px;
          background: #101831;
          border-radius: 42px;
          box-shadow: 0 26px 60px rgba(35, 61, 145, 0.25);
          transform: rotate(9deg);
        }

        .profile-phone::before {
          position: absolute;
          top: 13px;
          left: 50%;
          width: 110px;
          height: 30px;
          content: "";
          background: #070a17;
          border-radius: 0 0 18px 18px;
          transform: translateX(-50%);
        }

        .profile-phone > .logo-word,
        .phone-topbar,
        .profile-cover,
        .profile-body {
          position: relative;
          z-index: 1;
        }

        .phone-topbar {
          display: flex;
          justify-content: space-between;
          padding: 8px 16px 14px;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
        }

        .phone-topbar i {
          width: 48px;
          height: 12px;
          background: #fff;
          border-radius: 999px;
        }

        .profile-phone > .logo-word {
          margin: 8px 0 12px 16px;
          font-size: 26px;
        }

        .profile-cover {
          height: 165px;
          overflow: hidden;
          background: linear-gradient(135deg, #7cc4ff, #b7f1b1);
          border-radius: 24px 24px 0 0;
        }

        .profile-cover i {
          position: absolute;
          bottom: 22px;
          width: 30px;
          height: 54px;
          background: rgba(255, 255, 255, 0.75);
          border-radius: 999px 999px 8px 8px;
        }

        .profile-cover i:nth-child(1) {
          left: 62px;
          height: 70px;
        }

        .profile-cover i:nth-child(2) {
          left: 122px;
          height: 88px;
        }

        .profile-cover i:nth-child(3) {
          left: 182px;
          height: 66px;
        }

        .profile-cover i:nth-child(4) {
          left: 242px;
          height: 82px;
        }

        .profile-body {
          min-height: 390px;
          padding: 18px;
          background: #fff;
          border-radius: 0 0 28px 28px;
        }

        .profile-logo {
          display: grid;
          width: 70px;
          height: 70px;
          place-items: center;
          margin-top: -54px;
          color: var(--blue);
          background: #fff;
          border: 3px solid #edf3ff;
          border-radius: 50%;
          font-size: 15px;
          font-weight: 950;
        }

        .profile-body h3 {
          margin: 12px 0 8px;
          font-size: 22px;
        }

        .profile-body p {
          color: #303b5d;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.55;
        }

        .profile-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin: 16px 0;
          color: #5d6680;
          font-size: 12px;
          font-weight: 850;
        }

        .profile-stats b {
          color: var(--ink);
          font-size: 15px;
        }

        .profile-body button {
          width: 100%;
          padding: 15px;
          border: 0;
          color: #fff;
          background: linear-gradient(90deg, #115cff, #1aa1ff);
          border-radius: 999px;
          font-weight: 950;
        }

        .next-event {
          display: grid;
          grid-template-columns: 76px 1fr;
          gap: 12px;
          align-items: center;
          margin-top: 18px;
          padding: 12px;
          border: 1px solid #e6ecfb;
          border-radius: 14px;
        }

        .next-event .event-thumb {
          width: 76px;
          height: 54px;
        }

        .next-event small {
          color: var(--muted);
          font-weight: 800;
        }

        .floating-chip {
          position: absolute;
          display: grid;
          place-items: center;
          width: 94px;
          height: 94px;
          color: #7f68ff;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 22px;
          box-shadow: 0 18px 42px rgba(60, 84, 165, 0.14);
          font-size: 42px;
          transform: rotate(-10deg);
        }

        .chip-line {
          left: 8px;
          top: 300px;
          color: #0fc45d;
        }

        .chip-calendar {
          right: 0;
          top: 270px;
          transform: rotate(11deg);
        }

        .chip-member {
          right: 40px;
          bottom: 128px;
          transform: rotate(-4deg);
        }

        .final-message {
          position: relative;
          z-index: 5;
          width: min(900px, 100%);
          margin: 8px auto 26px;
          padding: 26px 34px;
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(255, 255, 255, 0.96);
          border-radius: 18px;
          box-shadow: var(--shadow);
          text-align: center;
          font-size: clamp(21px, 2.2vw, 30px);
          line-height: 1.65;
          font-weight: 950;
        }

        .final-message strong {
          color: var(--blue);
        }

        .final-cta-panel {
          position: relative;
          z-index: 4;
          width: min(1120px, 100%);
          margin: 0 auto;
          padding: 30px 58px 34px;
          overflow: hidden;
          background:
            radial-gradient(circle at 12% 20%, rgba(255, 255, 255, 0.35), transparent 18%),
            linear-gradient(105deg, #115cff, #9d3fff);
          border-radius: 32px;
          box-shadow: 0 26px 64px rgba(67, 79, 220, 0.28);
        }

        .yellow-cta {
          display: flex;
          width: min(720px, 100%);
          min-height: 88px;
          align-items: center;
          justify-content: center;
          gap: 34px;
          margin: 0 auto 28px;
          color: var(--ink);
          background: linear-gradient(180deg, #ffff3c, #ffe914);
          border-radius: 999px;
          box-shadow: 0 12px 30px rgba(255, 232, 22, 0.34);
          text-decoration: none;
          font-size: clamp(26px, 2.8vw, 39px);
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .final-badges {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }

        .final-badges span {
          display: flex;
          min-height: 84px;
          align-items: center;
          justify-content: center;
          gap: 18px;
          color: var(--ink);
          background: rgba(255, 255, 255, 0.86);
          border-radius: 22px;
          font-size: clamp(22px, 2.2vw, 30px);
          font-weight: 950;
        }

        @media (max-width: 1100px) {
          .story-slide {
            padding-inline: 22px;
          }

          .hero-one .slide-inner,
          .before-after,
          .operation-card,
          .final-layout {
            grid-template-columns: 1fr;
          }

          .hero-copy {
            padding-top: 70px;
          }

          .hero-visual {
            min-height: 980px;
          }

          .phone-shell {
            right: 50%;
            transform: translateX(50%);
          }

          .members-card {
            left: 4%;
          }

          .notice-card {
            left: auto;
            right: 4%;
          }

          .arrow-flow {
            width: 100%;
            height: 110px;
            transform: rotate(90deg) scale(0.7);
            justify-self: center;
          }

          .tool-cloud {
            min-height: 380px;
          }
        }

        @media (max-width: 820px) {
          .story-slide {
            min-height: auto;
            padding: 24px 16px 42px;
          }

          .slide-inner {
            min-height: auto;
          }

          .story-slide::before {
            right: -20px;
            width: 160px;
          }

          .logo-word {
            font-size: 34px;
          }

          .page-badge {
            min-width: 82px;
            padding: 10px 14px;
            font-size: 18px;
          }

          .hero-title {
            font-size: 46px;
          }

          .hero-title .comiu-big {
            font-size: 76px;
          }

          .hero-lead {
            font-size: 23px;
          }

          .hero-desc {
            font-size: 17px;
          }

          .big-cta {
            width: 100%;
            min-height: 68px;
            gap: 16px;
            padding: 0 22px;
            font-size: 21px;
          }

          .hero-one .big-cta {
            position: relative;
            bottom: auto;
            left: auto;
            width: 100%;
            transform: none;
          }

          .big-cta span:first-child {
            width: 44px;
            height: 44px;
            font-size: 20px;
          }

          .hero-visual {
            min-height: 800px;
            transform: scale(0.78);
            transform-origin: top center;
            margin-bottom: -160px;
          }

          .phone-shell {
            width: 430px;
          }

          .float-side {
            right: -32px;
          }

          .members-card,
          .notice-card {
            width: 310px;
          }

          .bottom-count {
            bottom: 18px;
          }

          .problem-title,
          .section-title,
          .final-copy h1 {
            font-size: 42px;
          }

          .problem-sub {
            font-size: 19px;
          }

          .tool-cloud {
            min-height: 560px;
          }

          .tool-card {
            position: relative;
            left: auto !important;
            right: auto !important;
            top: auto !important;
            width: 100%;
            margin-bottom: 12px;
            transform: none !important;
          }

          .full-dashboard {
            padding: 16px;
            overflow: hidden;
          }

          .mock-grid,
          .features-grid,
          .feature-payment,
          .stats-row,
          .final-badges {
            grid-template-columns: 1fr;
          }

          .feature-card {
            min-height: auto;
            padding: 24px;
          }

          .feature-profile,
          .feature-event {
            grid-template-columns: 1fr;
          }

          .feature-profile .event-thumb,
          .feature-event .event-thumb {
            width: 100%;
          }

          .operation-card {
            padding: 24px;
          }

          .calendar-events p {
            grid-template-columns: 62px 1fr;
          }

          .calendar-events em,
          .calendar-events span {
            grid-column: 2;
          }

          .timeline-row {
            grid-template-columns: 56px 12px 80px 1fr;
          }

          .timeline-row em {
            grid-column: 4;
          }

          .profile-phone {
            right: 50%;
            transform: translateX(50%) rotate(4deg) scale(0.86);
          }

          .phone-stage {
            min-height: 560px;
          }

          .floating-chip {
            transform: scale(0.8);
          }

          .final-copy p {
            font-size: 21px;
          }

          .final-cta-panel {
            padding: 24px 18px;
          }

          .yellow-cta {
            min-height: 70px;
            font-size: 23px;
          }
        }
      `}</style>

      <main className="story-page">
        <section className="story-slide hero-one" id="top">
          <div className="slide-inner">
            <div className="hero-copy">
              <Logo />
              <h1 className="hero-title">
                イベント・サークルの
                <br />
                集客なら
                <strong className="comiu-big">COMIU</strong>
              </h1>
              <p className="hero-lead">
                <span>
                  団体に合わせた<strong>Webサイト</strong>を
                  <br />
                  <strong>無料</strong>で作成
                </span>
              </p>
              <p className="hero-desc">
                掲載用のホームページなら、もういらない。
                <br />
                Webサイトを、育てるWebアプリケーションへ。
              </p>
            </div>

            <div className="hero-visual" aria-hidden="true">
              <div className="phone-shell">
                <div className="phone-screen">
                  <DashboardMock />
                </div>
                <MemberListCard />
                <NoticeCard />
              </div>
              <div className="float-side">
                <div className="side-stat">
                  <small>LINE</small>
                  <span>リマインド</span>
                </div>
                <div className="side-stat">
                  <small>ページ閲覧数</small>
                  <b>2,842</b>
                </div>
                <div className="side-stat">
                  <small>申込数</small>
                  <b>+12</b>
                </div>
              </div>
            </div>

            <span className="sparkle one">✦</span>
            <a className="big-cta" href="/register">
              <span>↗</span>
              無料で団体ページを作る
              <span>›</span>
            </a>
            <div className="bottom-count">
              <span>1</span> / 5
            </div>
          </div>
        </section>

        <section className="story-slide slide-two">
          <div className="slide-inner">
            <Logo />
            <PageBadge page="2" />
            <div>
              <h2 className="problem-title">毎回、ゼロから運営していませんか？</h2>
              <p className="problem-sub">
                告知、申込み、連絡、名簿管理がバラバラだと、
                <br />
                運営が大きくなるほど大変になる。
              </p>
            </div>

            <div className="before-after">
              <div className="tool-cloud">
                {toolCards.map((tool) => (
                  <div className="tool-card" key={tool[1]}>
                    <span>{tool[0]}</span>
                    <b>
                      {tool[1]}
                      <small>{tool[2]}</small>
                    </b>
                  </div>
                ))}
              </div>
              <div className="arrow-flow" aria-hidden="true" />
              <div className="full-dashboard">
                <DashboardMock />
              </div>
            </div>

            <div className="unified-title">
              バラバラだった
              <br />
              運営を、
              <br />
              ひとつの流れへ。
            </div>
            <div className="wide-band">すべてをつなげて、迷わず進める運営へ。</div>
          </div>
        </section>

        <section className="story-slide slide-three" id="features">
          <div className="slide-inner">
            <Logo />
            <PageBadge page="3" />
            <h2 className="section-title">
              <strong>COMIU</strong> にできること
            </h2>
            <p className="section-subtitle">募集する。つながる。積み上がる。</p>

            <div className="features-grid">
              {featureCards.map((feature) => (
                <article className="feature-card" key={feature.no}>
                  <div className="feature-heading">
                    <span>{feature.no}</span>
                    <h3>
                      {feature.title.split("無料").length > 1 ? (
                        <>
                          団体ページを<strong>無料</strong>で作成
                        </>
                      ) : feature.title.split("自動").length > 1 ? (
                        <>
                          公式LINEで<strong>自動リマインド</strong>
                        </>
                      ) : feature.title.split("決済").length > 1 ? (
                        <>
                          事前<strong>決済</strong>と予約管理
                        </>
                      ) : (
                        <>
                          イベント募集を<strong>まとめる</strong>
                        </>
                      )}
                    </h3>
                  </div>
                  <FeatureMock type={feature.mock} />
                  <p>{feature.text}</p>
                </article>
              ))}
            </div>

            <div className="note-line">
              <span>▣</span>
              活動ブログや実績も蓄積できます。
            </div>
          </div>
        </section>

        <section className="story-slide slide-four">
          <div className="slide-inner">
            <Logo />
            <PageBadge page="4" />
            <h2 className="section-title">
              運営が楽になって、<strong>団体が大きくなる。</strong>
            </h2>

            <div className="operation-card">
              <div className="operation-copy">
                <div className="number-orb">1</div>
                <h3>
                  次のイベントを、
                  <br />
                  <strong>迷わず</strong>見つけられる。
                </h3>
                <p>
                  カレンダーとリストで、予定がひと目でわかる。
                  <br />
                  募集も残り枠もすぐに確認できるから、
                  <br />
                  参加のきっかけを逃さない。
                </p>
                <div className="line-remind">
                  <i>LINE</i>
                  LINEで前日通知が届きます
                  <span>🔔</span>
                </div>
              </div>
              <CalendarMock />
            </div>

            <div className="operation-card">
              <div className="operation-copy">
                <div className="number-orb">2</div>
                <h3>
                  開催するたび、
                  <br />
                  団体の<strong>信頼</strong>が残る。
                </h3>
                <p>
                  開催履歴やレポートが自動で積み上がる。
                  <br />
                  活動の見える化が、メンバーの安心や
                  <br />
                  新しい仲間の参加につながる。
                </p>
              </div>
              <div>
                <div className="timeline-list">
                  {[
                    ["4月", "新歓交流会", "参加者 96名"],
                    ["5月", "バドミントン", "参加者 42名"],
                    ["6月", "スポーツ交流会", "参加者 85名"],
                    ["7月", "BBQ", "参加者 71名"],
                  ].map((item, index) => (
                    <div className="timeline-row" key={item[0]}>
                      <time>{item[0]}</time>
                      <span className="dot" />
                      <EventThumb tone={index === 3 ? "orange" : "blue"} />
                      <p>
                        {item[1]}
                        <small>開催レポートが残りました</small>
                      </p>
                      <em>{item[2]}</em>
                    </div>
                  ))}
                </div>
                <div className="stats-row">
                  <div>
                    活動ブログ更新
                    <strong>18件</strong>
                  </div>
                  <div>
                    参加者レビュー
                    <strong>4.8</strong>
                  </div>
                  <div>
                    累計参加者数
                    <strong>532名</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="note-line">
              イベントを開くたび、<strong>次が楽になる。</strong>
            </div>
            <div className="slide-dots">
              <i />
              <i />
              <i />
            </div>
          </div>
        </section>

        <section className="story-slide slide-five">
          <div className="slide-inner">
            <Logo />
            <PageBadge page="5" />
            <div className="final-layout">
              <div className="final-copy">
                <h1>
                  あなたの団体を、
                  <br />
                  次の参加者に
                  <br />
                  <strong>選ばれる場所へ。</strong>
                </h1>
                <p>
                  団体ページ、イベント募集、
                  <br />
                  予約管理、LINE連携。
                  <br />
                  まずは<strong>無料</strong>で、あなたの団体に
                  <br />
                  合ったページを作成しましょう。
                </p>
              </div>
              <div className="phone-stage">
                <ProfilePhone />
                <span className="floating-chip chip-line">LINE</span>
                <span className="floating-chip chip-calendar">📅</span>
                <span className="floating-chip chip-member">👥</span>
              </div>
            </div>

            <div className="final-message">
              <strong>COMIU</strong>は、イベントを一回成功させるためのツールではない。
              <br />
              団体を、続いていく<strong>コミュニティ</strong>へ育てるための仕組み。
            </div>

            <div className="final-cta-panel">
              <a className="yellow-cta" href="/register">
                無料で団体ページを作る <span>›</span>
              </a>
              <div className="final-badges">
                <span>¥ 登録無料</span>
                <span>▣ 初期費用なし</span>
                <span>◆ 専門知識不要</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
