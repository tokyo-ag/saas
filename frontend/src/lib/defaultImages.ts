export const DEFAULT_EVENT_IMAGE = '/defaults/events/default.webp';

// Category-specific fallbacks shown when an event has no image/content card of its own.
// Keyed by Event.category's English slug (see ACTIVITY_TAG_EVENT_CATEGORY in lpTags.ts).
// Categories without an entry here fall back to DEFAULT_EVENT_IMAGE.
const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  meetup: '/defaults/events/交流会.webp',
  badminton: '/defaults/events/バドミントン.webp',
  futsal: '/defaults/events/フットサル.webp',
  basketball: '/defaults/events/バスケ.webp',
  volleyball: '/defaults/events/バレー.webp',
  tabletennis: '/defaults/events/卓球.webp',
};

export function getDefaultEventImage(category?: string | null): string {
  if (category && CATEGORY_DEFAULT_IMAGES[category]) return CATEGORY_DEFAULT_IMAGES[category];
  return DEFAULT_EVENT_IMAGE;
}
