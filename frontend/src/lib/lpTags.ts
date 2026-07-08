export const TENANT_TYPE_TAGS = ['インカレサークル', '学生団体', 'イベント団体', '社会人サークル'] as const;

export const ACTIVITY_TAGS = ['交流会', 'バドミントン', 'フットサル', 'バスケ', 'バレー'] as const;

export const LOCATION_TAGS = [
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
  '埼玉',
  '千葉',
  '神奈川',
] as const;

export const SEARCH_TAGS = ['初心者大歓迎', '経験者大歓迎', '20代歓迎', '30代歓迎', '1人参加歓迎'] as const;

export const ARTICLE_THEME_TAGS = ['選び方', '初心者向け', '費用', '持ち物', '雰囲気'] as const;

export const PORTAL_CATEGORY_TAGS = [...ACTIVITY_TAGS];

export const BLOG_TAG_GROUPS = [
  { label: '団体種別タグ', tags: TENANT_TYPE_TAGS },
  { label: '活動タグ', tags: ACTIVITY_TAGS },
  { label: '記事テーマタグ', tags: ARTICLE_THEME_TAGS },
] as const;

export const EVENT_TAG_GROUPS = [
  { label: '活動タグ', tags: ACTIVITY_TAGS, single: true },
  { label: '場所タグ', tags: LOCATION_TAGS, single: true },
  { label: '検索タグ', tags: SEARCH_TAGS, single: false },
] as const;

export function normalizePortalCategoryTags(tags: string[]) {
  const firstCategory = tags.find((tag) => PORTAL_CATEGORY_TAGS.includes(tag as never));
  return tags.filter((tag) => !PORTAL_CATEGORY_TAGS.includes(tag as never) || tag === firstCategory);
}
