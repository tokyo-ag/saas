"use client";

import { useEffect } from "react";
import { initLiff } from "@/lib/liff";

function getPendingRedirect() {
  const raw = localStorage.getItem("liff-pending-redirect");
  if (!raw) return null;

  try {
    const { url, expires } = JSON.parse(raw) as {
      url: string;
      expires: number;
    };
    if (Date.now() < expires) return normalizeSameOriginPath(url);
  } catch {
    // Clear malformed values below.
  }

  localStorage.removeItem("liff-pending-redirect");
  return null;
}

function normalizeSameOriginPath(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function normalizeLiffState(raw: string | null) {
  if (!raw) return null;
  let state = raw;
  const seen = new Set<string>();

  while (state && !seen.has(state)) {
    seen.add(state);

    try {
      const decoded = decodeURIComponent(state);
      if (decoded !== state) {
        state = decoded;
        continue;
      }
    } catch {
      // ignore decode failures
    }

    if (state.startsWith("?")) {
      const params = new URLSearchParams(state.slice(1));
      const nested = params.get("liff.state");
      if (nested) {
        params.delete("liff.state");
        const rest = params.toString();
        state = nested + (rest ? `?${rest}` : "");
        continue;
      }
    }

    break;
  }

  return state || null;
}

function getLiffStateRedirect(searchParams: URLSearchParams) {
  const rawState = searchParams.get("liff.state");
  const state = normalizeLiffState(rawState);
  if (!state) return null;

  const path = state.startsWith("/") ? state : `/${state}`;
  if (path === "/" || path.startsWith("//")) return null;
  // /clubs/... (SEOページ上でのインラインLINEログイン)はそのまま、それ以外は
  // 従来通り/liff/{tenantId}/...配下のページ向けとして/liffを補う。
  const target =
    path.startsWith("/liff/") ||
    path.startsWith("/clubs/") ||
    path.startsWith("/e/")
      ? path
      : `/liff${path}`;

  const nextParams = new URLSearchParams(searchParams);
  for (const key of [
    "liff.state",
    "code",
    "state",
    "liffClientId",
    "liffRedirectUri",
    "liff.referrer",
  ]) {
    nextParams.delete(key);
  }
  const query = nextParams.toString();
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${query ? `${separator}${query}` : ""}`;
}

function tenantKeyFromTarget(target: string | null) {
  if (!target) return null;
  const match = target.match(/^\/(?:liff|clubs|e)\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function hasLiffCredentialFragment(hash: string) {
  return /(?:^|[&#])(?:access_token|context_token|feature_token|id_token|client_id)=/.test(
    hash,
  );
}

async function resolveLiffId(tenantKey: string | null) {
  if (!tenantKey) return null;
  try {
    const response = await fetch(
      `/api/backend/liff/${encodeURIComponent(tenantKey)}`,
      {
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const tenant = (await response.json()) as { liffId?: string | null };
    return tenant.liffId?.trim() || null;
  } catch {
    return null;
  }
}

export default function LiffReturnRedirector() {
  useEffect(() => {
    async function run() {
      const searchParams = new URLSearchParams(window.location.search);
      const liffStateRedirect = getLiffStateRedirect(searchParams);

      // LINE's primary redirect must be consumed by liff.init() before any
      // history/location change. Otherwise the SDK loses liff.state or the
      // credential fragment and fails on the post-login initialization.
      // Pages below /liff initialize themselves with their tenant ID.
      if (liffStateRedirect && !window.location.pathname.startsWith("/liff/")) {
        const liffId = await resolveLiffId(
          tenantKeyFromTarget(liffStateRedirect),
        );
        if (liffId) {
          const initialized = await initLiff(liffId);
          if (!initialized) return;
          // The SDK normally performs the secondary redirect itself. This is
          // only a fallback for environments where it leaves the URL intact.
          const target = new URL(liffStateRedirect, window.location.origin);
          if (
            window.location.pathname !== target.pathname ||
            window.location.search !== target.search ||
            window.location.hash !== target.hash
          ) {
            window.location.replace(liffStateRedirect);
          }
          return;
        }
      }

      // A route-level LIFF initializer must consume OAuth callback parameters
      // and credential fragments. Never replace the URL while it is doing so.
      if (
        liffStateRedirect ||
        (searchParams.has("code") && searchParams.has("state")) ||
        hasLiffCredentialFragment(window.location.hash)
      ) {
        return;
      }

      const pending = getPendingRedirect();
      const redirectTo = liffStateRedirect ?? pending;
      if (redirectTo) {
        localStorage.removeItem("liff-pending-redirect");
        window.location.replace(redirectTo);
      }
    }

    void run();
  }, []);

  return null;
}
