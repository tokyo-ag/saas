export type UseCaseData = {
  slug: string;
  title: string;
  metaDescription: string;
  ogDescription: string;
  breadcrumbName: string;
  jsonLdDescription: string;
  heroParagraph: string;
  eventsHref: string;
  targetTitle: string;
  targetCards: { icon: string; title: string; body: string }[];
  adminTitle: string;
  ctaTitle: string;
  footerEventsHref: string;
  footerEventsLabel: string;
  faqItems: { question: string; answer: string }[];
};

function createUseCase({
  slug,
  sport,
  eventsHref,
}: {
  slug: string;
  sport: string;
  eventsHref: string;
}): UseCaseData {
  const title = `${sport}サークル 東京 20代`;
  const metaDescription = `東京で20代向けの${sport}サークル・交流イベントを探すならCOMIU。初心者歓迎、社会人向け、ひとり参加しやすいイベントを掲載。LINEで参加予約できます。`;
  const ogDescription = `東京の20代向け${sport}サークル・交流イベントをLINEでかんたんに探せます。`;

  return {
    slug,
    title,
    metaDescription,
    ogDescription,
    breadcrumbName: title,
    jsonLdDescription: metaDescription,
    heroParagraph: `COMIUでは、東京で開催される20代向けの${sport}サークル・交流イベントを探せます。日程、場所、参加費を確認して、気になるイベントにLINEでそのまま参加予約できます。`,
    eventsHref,
    targetTitle: `東京で${sport}サークルを探している20代へ`,
    targetCards: [
      {
        icon: '01',
        title: '同年代と気軽に参加したい',
        body: '20代中心、社会人向け、ひとり参加歓迎のイベントを探しやすく整理しています。',
      },
      {
        icon: '02',
        title: '初心者でも入りやすい',
        body: '初心者歓迎や経験不問のイベントを見つけやすく、初参加でも流れを確認して申し込めます。',
      },
      {
        icon: '03',
        title: '東京のアクセスしやすい場所で探せる',
        body: '池袋、渋谷、新宿、板橋、文京など、東京の主要エリアで開催されるイベントを掲載します。',
      },
      {
        icon: '04',
        title: 'LINEで参加予約できる',
        body: 'イベント詳細を見て、そのままLINEで参加予約できます。リマインドも届くので予定を忘れにくくなります。',
      },
    ],
    adminTitle: `${sport}サークルを主催している方へ`,
    ctaTitle: `東京で${sport}仲間を見つけよう`,
    footerEventsHref: eventsHref,
    footerEventsLabel: `${sport}イベント一覧`,
    faqItems: [
      {
        question: `${sport}サークルに初心者でも参加できますか？`,
        answer:
          '参加条件はイベントごとに異なりますが、初心者歓迎や経験不問のイベントを掲載しています。詳細ページで対象者や持ち物を確認できます。',
      },
      {
        question: '20代社会人でも参加しやすいですか？',
        answer:
          'はい。COMIUでは20代向け、社会人向け、ひとり参加歓迎のイベントを中心に探せます。仕事終わりや休日に参加しやすいイベントを見つけられます。',
      },
      {
        question: '参加申込はどうやって行いますか？',
        answer:
          'イベント詳細ページからLINEの予約画面へ進み、必要事項を入力して申し込めます。イベントによっては満席やキャンセル待ちになる場合があります。',
      },
      {
        question: '参加費は事前に分かりますか？',
        answer:
          'はい。イベント詳細ページに参加費を表示しています。無料イベントや、会場費を参加者で割る形式のイベントもあります。',
      },
    ],
  };
}

export const USE_CASES: Record<string, UseCaseData> = {
  'badminton-tokyo': createUseCase({
    slug: 'badminton-tokyo',
    sport: 'バドミントン',
    eventsHref: '/sports/badminton',
  }),
  'basketball-tokyo': createUseCase({
    slug: 'basketball-tokyo',
    sport: 'バスケ',
    eventsHref: '/sports/basketball',
  }),
  'futsal-tokyo': createUseCase({
    slug: 'futsal-tokyo',
    sport: 'フットサル',
    eventsHref: '/sports/futsal',
  }),
  'volleyball-tokyo': createUseCase({
    slug: 'volleyball-tokyo',
    sport: 'バレー',
    eventsHref: '/sports/volleyball',
  }),
};
