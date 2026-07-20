export const TENANT_TYPE_TAGS = ['インカレサークル', '学生団体', 'イベント団体', '社会人サークル'] as const;

export const ACTIVITY_TAGS = ['交流会', 'バドミントン', 'フットサル', 'バスケ', 'バレー'] as const;

// The 23 wards, shown as a group of children once "東京23区" (a pure UI grouping, not itself
// a savable tag) is picked - mirrors how a ward's own sub-areas appear once the ward is picked.
export const TOKYO_WARDS = [
  '千代田区',
  '中央区',
  '港区',
  '新宿区',
  '文京区',
  '台東区',
  '墨田区',
  '江東区',
  '品川区',
  '目黒区',
  '大田区',
  '世田谷区',
  '渋谷区',
  '中野区',
  '杉並区',
  '豊島区',
  '北区',
  '荒川区',
  '板橋区',
  '練馬区',
  '足立区',
  '葛飾区',
  '江戸川区',
] as const;

// Other prefecture-level tags, selected directly (no ward breakdown for these yet).
export const OTHER_PREFECTURE_TAGS = ['埼玉', '千葉', '神奈川'] as const;

// Finer-grained areas within a ward. Selecting the ward reveals these as additional options;
// picking one is saved alongside the ward tag (not instead of it). Only wards with a confirmed
// list are populated here - unlisted wards simply have no sub-area options yet.
export const WARD_SUBAREAS: Record<string, readonly string[]> = {
  '豊島区': ['千川', '要町', '小竹向原'],
};

// Every real, savable location value (wards + other prefectures) - excludes the "東京23区"
// grouping label itself, which is a UI-only parent, never a tag value on its own.
export const LOCATION_TAGS = [...TOKYO_WARDS, ...OTHER_PREFECTURE_TAGS] as const;

export const ALL_LOCATION_TAGS: readonly string[] = [
  ...LOCATION_TAGS,
  ...Object.values(WARD_SUBAREAS).flat(),
];

export const SEARCH_TAGS = ['初心者大歓迎', '経験者大歓迎', '20代歓迎', '30代歓迎', '1人参加歓迎', 'ラケット貸出有り'] as const;

// 交流会 events use their own event-type tags instead of the sport-oriented SEARCH_TAGS above
// (e.g. "ラケット貸出有り" makes no sense for a 飲み会) - keyed by Event.category slug.
export const MEETUP_SEARCH_TAGS = ['交流会', '新歓', '飲み会', 'パーティー', 'クラブイベント', 'ビジネス交流会', 'ワークショップ'] as const;

export const ARTICLE_THEME_TAGS = ['選び方', '初心者向け', '費用', '持ち物', '雰囲気'] as const;

export const PORTAL_CATEGORY_TAGS = [...ACTIVITY_TAGS];

// Event.category is stored as an English slug (see EventForm's category <select>),
// while article/portal category tags use the Japanese label. Map one to the other
// so article-side category filters can query the events API correctly.
export const ACTIVITY_TAG_EVENT_CATEGORY: Record<string, string> = {
  '交流会': 'meetup',
  'バドミントン': 'badminton',
  'フットサル': 'futsal',
  'バスケ': 'basketball',
  'バレー': 'volleyball',
};

// Reverse of ACTIVITY_TAG_EVENT_CATEGORY: English category slug -> Japanese label.
// Also doubles as the "is this an activity category" check for path-based hub URLs.
export const CATEGORY_SLUG_TO_JAPANESE: Record<string, string> = Object.fromEntries(
  Object.entries(ACTIVITY_TAG_EVENT_CATEGORY).map(([ja, slug]) => [slug, ja]),
);

// Romanized slugs for the 23 wards + other prefectures + confirmed sub-areas, used in the
// path-based hub URLs (/guide/[category]/[ward]/[subarea]). Only areas listed here get a
// path-based URL; anything else falls back to the legacy ?area= query-string form.
export const AREA_SLUGS: Record<string, string> = {
  '千代田区': 'chiyoda', '中央区': 'chuo', '港区': 'minato', '新宿区': 'shinjuku',
  '文京区': 'bunkyo', '台東区': 'taito', '墨田区': 'sumida', '江東区': 'koto',
  '品川区': 'shinagawa', '目黒区': 'meguro', '大田区': 'ota', '世田谷区': 'setagaya',
  '渋谷区': 'shibuya', '中野区': 'nakano', '杉並区': 'suginami', '豊島区': 'toshima',
  '北区': 'kita', '荒川区': 'arakawa', '板橋区': 'itabashi', '練馬区': 'nerima',
  '足立区': 'adachi', '葛飾区': 'katsushika', '江戸川区': 'edogawa',
  '埼玉': 'saitama', '千葉': 'chiba', '神奈川': 'kanagawa',
  '千川': 'senkawa', '要町': 'kanamecho', '小竹向原': 'kotakemukaihara',
};
export const AREA_SLUG_TO_JAPANESE: Record<string, string> = Object.fromEntries(
  Object.entries(AREA_SLUGS).map(([ja, slug]) => [slug, ja]),
);

// Builds the canonical link for a category(+area) hub page. Activity categories (the 5 with a
// known event-category slug) get the new path-based URL; everything else (team-type categories)
// keeps the legacy ?area= query-string form.
export function buildCategoryAreaPath(category: string, area?: string): string {
  const categorySlug = ACTIVITY_TAG_EVENT_CATEGORY[category];
  if (!categorySlug) {
    return `/guide/tag/${encodeURIComponent(category)}${area ? `?area=${encodeURIComponent(area)}` : ''}`;
  }
  if (!area) return `/guide/${categorySlug}`;
  const wardOfSubarea = Object.entries(WARD_SUBAREAS).find(([, subs]) => subs.includes(area))?.[0];
  const parts = wardOfSubarea ? [wardOfSubarea, area] : [area];
  return `/guide/${categorySlug}/${parts.map((p) => AREA_SLUGS[p] ?? p).join('/')}`;
}

export const BLOG_TAG_GROUPS = [
  { label: '団体種別タグ', tags: TENANT_TYPE_TAGS },
  { label: '活動タグ', tags: ACTIVITY_TAGS },
  { label: '記事テーマタグ', tags: ARTICLE_THEME_TAGS },
] as const;

// category is Event.category's English slug ('meetup', 'badminton', ...) - see ACTIVITY_TAG_EVENT_CATEGORY.
export function getEventTagGroups(category: string) {
  return [
    { label: '場所タグ', tags: LOCATION_TAGS, single: true },
    { label: '検索タグ', tags: category === 'meetup' ? MEETUP_SEARCH_TAGS : SEARCH_TAGS, single: false },
  ] as const;
}

export function normalizePortalCategoryTags(tags: string[]) {
  const firstCategory = tags.find((tag) => PORTAL_CATEGORY_TAGS.includes(tag as never));
  return tags.filter((tag) => !PORTAL_CATEGORY_TAGS.includes(tag as never) || tag === firstCategory);
}
