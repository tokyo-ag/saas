import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function ClubRedirectPage({
  params,
}: {
  params: Promise<{ tenantCode: string }>;
}) {
  const { tenantCode } = await params;
  permanentRedirect(`/e/${tenantCode}`);
}
