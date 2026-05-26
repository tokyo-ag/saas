import type { Metadata } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const NO_INDEX = { robots: { index: false, follow: false } } satisfies Partial<Metadata>;

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string }> }): Promise<Metadata> {
  try {
    const { tenantId } = await params;
    const tenant = await fetch(`${API_URL}/api/liff/${tenantId}`, { next: { revalidate: 60 } })
      .then(r => r.ok ? r.json() : null);
    if (!tenant) return NO_INDEX;

    const name = tenant.lineDisplayName ?? tenant.name;
    const description = tenant.description ?? `${name}のイベント・交流会情報`;

    return {
      ...NO_INDEX,
      title: name,
      description,
      openGraph: {
        title: name,
        description,
        images: (tenant.linePictureUrl ?? tenant.iconUrl) ? [{ url: tenant.linePictureUrl ?? tenant.iconUrl }] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: name,
        description,
        images: (tenant.linePictureUrl ?? tenant.iconUrl) ? [tenant.linePictureUrl ?? tenant.iconUrl] : [],
      },
    };
  } catch {
    return NO_INDEX;
  }
}

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
