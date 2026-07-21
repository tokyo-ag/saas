import { ALL_LOCATION_TAGS } from '@/lib/lpTags';

const LOCATION_TAG_SET = new Set<string>(ALL_LOCATION_TAGS);

export type TenantSeoProfile = {
  typeTags: string[];
  activityTags: string[];
  areas: string[];
};

// Pure - built from an already-fetched tenant JSON (as returned by /api/public/tenants/:code),
// so callers that already have that response (e.g. the own-circle embed block) don't need a
// second fetch just to compute the same SEO profile.
export function buildSeoProfileFromTenant(tenant: { typeTags?: string[]; activityTags?: string[]; events?: { tags?: string[] }[] }): TenantSeoProfile {
  const areaCounts = new Map<string, number>();
  for (const event of tenant.events ?? []) {
    for (const tag of event.tags ?? []) {
      if (LOCATION_TAG_SET.has(tag)) areaCounts.set(tag, (areaCounts.get(tag) ?? 0) + 1);
    }
  }
  const areas = Array.from(areaCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([area]) => area);
  return { typeTags: tenant.typeTags ?? [], activityTags: tenant.activityTags ?? [], areas };
}

// Used only when the organizer hasn't typed a SEO title/description themselves - built from
// whatever structured tenant data is available (name, activity category, audience, and areas
// inferred from the tenant's own events), rather than just echoing the page's display title.
export function buildAutoSeoTitle(tenantName: string, profile: TenantSeoProfile | null): string {
  const area = profile?.areas.join('・');
  const category = profile?.activityTags[0];
  const audience = profile?.typeTags.join('・');
  const descriptor = [area, category ? `${category}サークル` : undefined].filter(Boolean).join('の');
  const base = descriptor ? `${descriptor}${tenantName}` : tenantName;
  return audience ? `${base}｜${audience}` : base;
}

export function buildAutoSeoDescription(tenantName: string, profile: TenantSeoProfile | null): string {
  const area = profile?.areas.join('・');
  const category = profile?.activityTags[0];
  const audience = profile?.typeTags.join('・');
  const categoryLabel = category ? `${category}サークル` : '団体';
  const areaPhrase = area ? `${area}を中心に活動する` : '';
  const audiencePhrase = audience ? `${audience}が参加しています。` : '';
  return `${tenantName}は、${areaPhrase}${categoryLabel}です。${audiencePhrase}COMIUで詳細を確認してLINEから参加できます。`;
}
