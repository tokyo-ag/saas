import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { API_URL } from '@/lib/config';

export const revalidate = 60;

type PublicClubRedirectData = {
  code?: string | null;
  pages?: Array<{ slug: string; updatedAt?: string | null }>;
};

async function fetchPrimaryPage(
  tenantCode: string,
): Promise<{ code: string; slug: string } | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    const club = (await res.json()) as PublicClubRedirectData;
    const slug = club.pages?.[0]?.slug ?? null;
    const code = club.code ?? null;
    if (!slug || !code) return null;
    return { code, slug };
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function ClubRedirectPage({
  params,
}: {
  params: Promise<{ tenantCode: string }>;
}) {
  const { tenantCode } = await params;
  const result = await fetchPrimaryPage(tenantCode);
  // Always redirect to the canonical numeric-code URL to preserve link equity.
  permanentRedirect(result ? `/clubs/${result.code}/${result.slug}` : '/');
}
