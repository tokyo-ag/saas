"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getInitError, initLiff } from "@/lib/liff";

function liffStatePath() {
  const raw = new URLSearchParams(window.location.search).get("liff.state");
  if (!raw) return null;
  let state = raw;
  try {
    state = decodeURIComponent(state);
  } catch {
    // Keep the original value; the SDK may already have decoded it.
  }
  const path = state.startsWith("/") ? state : `/${state}`;
  if (path === "/" || path.startsWith("//")) return null;
  return path.startsWith("/liff/") ||
    path.startsWith("/clubs/") ||
    path.startsWith("/e/")
    ? path
    : `/liff${path}`;
}

export default function LiffEndpointBootstrap({
  tenantId,
  fallbackPath,
}: {
  tenantId: string;
  fallbackPath?: string;
}) {
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      if (fallbackPath) {
        window.location.replace(fallbackPath);
        return;
      }
      // liff.init() consumes and removes liff.state, so retain the secondary
      // destination before initialization for the fallback navigation.
      const target = liffStatePath();
      const tenant = await api.liff.tenant(tenantId);
      if (cancelled) return;
      const ok = await initLiff(tenant.liffId ?? undefined);
      if (cancelled) return;
      if (!ok) {
        setError(getInitError() ?? "LINEの初期化に失敗しました。");
        return;
      }
      if (target) window.location.replace(target);
    }

    void initialize().catch((reason: unknown) => {
      if (!cancelled) {
        setError(
          reason instanceof Error
            ? reason.message
            : "LINEの初期化に失敗しました。",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fallbackPath, tenantId]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-[#06C755] px-5 py-2.5 text-sm font-bold text-white"
        >
          もう一度試す
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#06C755]" />
      <p className="text-sm text-gray-500">LINEログインを確認しています...</p>
    </main>
  );
}
