import LiffEndpointBootstrap from "./LiffEndpointBootstrap";

import { API_URL } from "@/lib/config";

async function resolveTenantCode(codeOrId: string) {
  try {
    const response = await fetch(
      `${API_URL}/api/liff/${encodeURIComponent(codeOrId)}`,
      {
        cache: "no-store",
      },
    );
    if (!response.ok) return codeOrId;
    const tenant = (await response.json()) as { code?: string | null };
    return tenant.code?.trim() || codeOrId;
  } catch {
    return codeOrId;
  }
}

export default async function LegacyLiffTopPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tenantId } = await params;
  const query = await searchParams;
  const isLiffRedirect =
    typeof query["liff.state"] === "string" ||
    (typeof query.code === "string" && typeof query.state === "string");
  if (isLiffRedirect) {
    return <LiffEndpointBootstrap tenantId={tenantId} />;
  }
  const tenantCode = await resolveTenantCode(tenantId);
  return (
    <LiffEndpointBootstrap
      tenantId={tenantId}
      fallbackPath={`/e/${encodeURIComponent(tenantCode)}`}
    />
  );
}
