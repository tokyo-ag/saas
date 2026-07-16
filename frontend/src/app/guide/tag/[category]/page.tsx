import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

import { ACTIVITY_TAG_EVENT_CATEGORY, buildCategoryAreaPath } from '@/lib/lpTags';
import { HubPage, buildHubMetadata } from '../../_hub/hubPage';

export const revalidate = 60;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ area?: string }>;
}): Promise<Metadata> {
  const { category: raw } = await params;
  const { area: rawArea } = await searchParams;
  const category = decodeURIComponent(raw);
  const area = rawArea ? decodeURIComponent(rawArea) : '';
  if (ACTIVITY_TAG_EVENT_CATEGORY[category]) return {};
  return buildHubMetadata(category, area);
}

export default async function GuideCategoryHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ area?: string }>;
}) {
  const { category: raw } = await params;
  const { area: rawArea } = await searchParams;
  const category = decodeURIComponent(raw);
  const area = rawArea ? decodeURIComponent(rawArea) : '';

  // Activity categories (バドミントン/交流会/フットサル/バスケ/バレー) moved to path-based
  // URLs (/guide/[category]/[area]); this legacy ?area= form permanently redirects there.
  // Team-type categories (学生団体 etc.) have no path slug and keep this route as-is.
  if (ACTIVITY_TAG_EVENT_CATEGORY[category]) {
    permanentRedirect(buildCategoryAreaPath(category, area || undefined));
  }

  return <HubPage category={category} area={area} />;
}
