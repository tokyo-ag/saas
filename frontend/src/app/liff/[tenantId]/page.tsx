import { permanentRedirect } from 'next/navigation';

import { API_URL } from '@/lib/config';

async function resolveTenantCode(codeOrId: string) {
  try {
    const response = await fetch(`${API_URL}/api/liff/${encodeURIComponent(codeOrId)}`, {
      cache: 'no-store',
    });
    if (!response.ok) return codeOrId;
    const tenant = (await response.json()) as { code?: string | null };
    return tenant.code?.trim() || codeOrId;
  } catch {
    return codeOrId;
  }
}

export default async function LegacyLiffTopPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenantCode = await resolveTenantCode(tenantId);
  permanentRedirect(`/e/${encodeURIComponent(tenantCode)}`);
}
