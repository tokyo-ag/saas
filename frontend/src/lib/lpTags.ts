export const TENANT_TYPE_TAGS = ['インカレサークル', '学生団体', 'イベント団体', '社会人サークル'] as const;

export const ACTIVITY_TAGS = ['交流会', 'バドミントン', 'フットサル', 'バスケ', 'バレー'] as const;

export const LOCATION_TAGS = ['東京', '練馬', '豊島区', '池袋', '新宿', '渋谷', '北区', '板橋区', '港区'] as const;

export const LP_SUPPORT_TAGS = [
  '初参加歓迎',
  'ひとり参加歓迎',
  '初心者歓迎',
  '20代限定',
  '30代限定',
  '男女歓迎',
  '社会人',
  '学生歓迎',
  '少人数',
  '駅近',
] as const;

export const PORTAL_CATEGORY_TAGS = [...ACTIVITY_TAGS];

export const BLOG_TAG_GROUPS = [
  { label: '団体種別タグ', tags: TENANT_TYPE_TAGS },
  { label: '活動タグ', tags: ACTIVITY_TAGS },
] as const;

export const EVENT_TAG_GROUPS = [
  { label: '活動タグ', tags: ACTIVITY_TAGS, single: true },
  { label: '場所タグ', tags: LOCATION_TAGS, single: false },
  { label: '補助タグ', tags: LP_SUPPORT_TAGS, single: false },
] as const;

export function normalizePortalCategoryTags(tags: string[]) {
  const firstCategory = tags.find((tag) => PORTAL_CATEGORY_TAGS.includes(tag as never));
  return tags.filter((tag) => !PORTAL_CATEGORY_TAGS.includes(tag as never) || tag === firstCategory);
}
