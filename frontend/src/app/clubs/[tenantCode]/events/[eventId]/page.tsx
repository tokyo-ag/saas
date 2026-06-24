import { redirect } from 'next/navigation';

export default async function LegacyPublicEventPage({
  params,
}: {
  params: Promise<{ tenantCode: string; eventId: string }>;
}) {
  const { tenantCode, eventId } = await params;
  redirect(`/e/${tenantCode}/${eventId}`);
}
