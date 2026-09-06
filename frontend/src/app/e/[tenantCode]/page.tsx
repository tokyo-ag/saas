import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';

import PublicFooter from '@/components/public/PublicFooter';
import { ReservationViewShowcase, ReservationShowcaseEvent } from '@/components/public/ReservationViewShowcase';
import { SITE_URL, API_URL } from '@/lib/config';

type TenantEventsData = {
  code?: string | null;
  name: string;
  lineDisplayName?: string | null;
  linePictureUrl?: string | null;
  pages?: Array<{ slug: string }>;
  events: ReservationShowcaseEvent[];
};

type TenantPageStyle = {
  accentColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  reserveViewStyle?: string | null;
};

async function fetchTenant(tenantCode: string): Promise<TenantEventsData | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchPageStyle(tenantCode: string, slug: string): Promise<TenantPageStyle | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants/${tenantCode}/pages/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantCode: string }>;
}): Promise<Metadata> {
  const { tenantCode } = await params;
  const tenant = await fetchTenant(tenantCode);
  if (!tenant) {
    return { title: '団体が見つかりません', robots: { index: false, follow: false } };
  }
  const name = tenant.lineDisplayName || tenant.name;
  const title = `${name}の予約スケジュール | COMIU`;
  const description = `${name}が開催するイベントの予約スケジュール一覧です。LINEなしでもご覧いただけます。`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/e/${tenantCode}` },
    openGraph: { title, description, url: `${SITE_URL}/e/${tenantCode}` },
  };
}

export default async function TenantEventsPage({
  params,
}: {
  params: Promise<{ tenantCode: string }>;
}) {
  const { tenantCode } = await params;
  const tenant = await fetchTenant(tenantCode);
  if (!tenant) notFound();

  const slug = tenant.pages?.[0]?.slug;
  const page = slug ? await fetchPageStyle(tenantCode, slug) : null;

  const accentColor = page?.accentColor || '#06C755';
  const backgroundColor = page?.backgroundColor || '#F7F8FA';
  const textColor = page?.textColor || '#111827';
  const name = tenant.lineDisplayName || tenant.name;
  const icon = tenant.linePictureUrl;
  const events = tenant.events ?? [];

  return (
    <div style={{ backgroundColor, minHeight: '100vh' }}>
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          {icon && (
            <Link href={`/clubs/${tenantCode}`} className="shrink-0">
              <img src={icon} alt="" className="h-12 w-12 rounded-full object-cover" />
            </Link>
          )}
          <div className="min-w-0">
            <Link href={`/clubs/${tenantCode}`} className="block truncate text-lg font-bold" style={{ color: textColor }}>
              {name}
            </Link>
            {slug && (
              <Link href={`/clubs/${tenantCode}/${slug}`} className="block text-xs underline" style={{ color: accentColor }}>
                団体ページを見る
              </Link>
            )}
          </div>
        </div>

        <h1 className="mb-4 text-sm font-bold" style={{ color: textColor }}>予約スケジュール</h1>

        {events.length === 0 ? (
          <p className="text-sm text-gray-400">現在受付中のイベントはありません。</p>
        ) : (
          <ReservationViewShowcase
            accentColor={accentColor}
            buttonLabel="予約する"
            viewStyle={page?.reserveViewStyle}
            events={events}
            tenantCode={tenantCode}
            showButton={false}
          />
        )}
      </div>
      <PublicFooter />
    </div>
  );
}
