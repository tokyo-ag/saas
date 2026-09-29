"use client";

import { useEffect, useRef, useState } from "react";
import { api, setLiffToken } from "@/lib/api";
import {
  getLiffUserId,
  initLiff,
  isLiffLoggedIn,
  liff,
  loginWithRedirect,
  redirectToLiffApp,
  syncLiffApiToken,
} from "@/lib/liff";
import { isLightHexColor, readableTextColor } from "@/lib/color";
import { liffNavigationUrl } from "@/lib/config";

type Stage = "start" | "loading" | "ready" | "submitted";

function isLineAuthErrorMessage(message: string): boolean {
  return (
    message.includes("LINEトークン") ||
    message.includes("LIFF認証") ||
    message.includes("Unauthorized")
  );
}

export function TenantReviewComposer({
  tenantId,
  liffId,
  accentColor,
  mode = "public",
}: {
  tenantId: string;
  liffId?: string | null;
  accentColor: string;
  mode?: "public" | "liff";
}) {
  const solidAccentColor = isLightHexColor(accentColor)
    ? "#111827"
    : accentColor;
  const buttonTextColor = readableTextColor(solidAccentColor);
  const autoStarted = useRef(false);

  const [stage, setStage] = useState<Stage>(
    mode === "liff" ? "loading" : "start",
  );
  const [lineUserId, setLineUserId] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openLiffReviewPage() {
    const path = `/liff/${encodeURIComponent(tenantId)}/reviews`;
    window.location.replace(
      liffNavigationUrl(path, { liffId, endpointPath: "/" }),
    );
  }

  function restartLineLogin() {
    setLiffToken(null);
    try {
      loginWithRedirect();
    } catch {
      if (!redirectToLiffApp()) {
        setStage("start");
        setError("LINE認証を開始できませんでした。もう一度お試しください。");
      }
    }
  }

  async function startReview() {
    if (mode === "public") {
      openLiffReviewPage();
      return;
    }

    setStage("loading");
    setError("");

    const ok = await initLiff();
    if (!ok) {
      setStage("start");
      setError("LINE認証の読み込みに失敗しました。もう一度お試しください。");
      return;
    }

    if (!isLiffLoggedIn()) {
      if (liff.isInClient()) {
        setStage("start");
        setError(
          "LINE認証を確認できませんでした。LINEからもう一度開いてください。",
        );
        return;
      }
      restartLineLogin();
      return;
    }

    const uid = (await getLiffUserId()) ?? "";
    if (!uid) {
      setStage("start");
      setError(
        "LINEアカウントを確認できませんでした。もう一度お試しください。",
      );
      return;
    }

    setLineUserId(uid);
    syncLiffApiToken();

    try {
      const existing = await api.liff.myTenantReview(tenantId, uid);
      setStage(existing ? "submitted" : "ready");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (isLineAuthErrorMessage(message)) {
        restartLineLogin();
        return;
      }
      setStage("start");
      setError(
        message ||
          "口コミ投稿画面を読み込めませんでした。もう一度お試しください。",
      );
    }
  }

  useEffect(() => {
    if (mode !== "liff" || autoStarted.current) return;
    autoStarted.current = true;
    void startReview();
    // 初回表示時だけLINE認証と投稿状況を確認する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (trimmed.length < 5 || trimmed.length > 300) {
      setError("口コミは5文字以上300文字以内で入力してください。");
      return;
    }

    setError("");
    setSaving(true);
    try {
      syncLiffApiToken();
      await api.liff.submitTenantReview(tenantId, lineUserId, trimmed);
      setContent("");
      setStage("submitted");
    } catch (err: unknown) {
      const apiError = err as Error & { status?: number };
      const message =
        apiError instanceof Error ? apiError.message : "送信に失敗しました。";
      if (apiError.status === 409 || message.includes("投稿済み")) {
        setStage("submitted");
        return;
      }
      if (isLineAuthErrorMessage(message)) {
        setError("LINE認証の有効期限が切れました。再認証します。");
        restartLineLogin();
        return;
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (stage === "submitted") {
    return (
      <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="text-sm font-bold text-emerald-800">
          口コミは送信済みです
        </p>
        <p className="mt-1 text-xs leading-5 text-emerald-700">
          運営の確認後に公開されます。ありがとうございます。
        </p>
      </div>
    );
  }

  if (stage !== "ready") {
    return (
      <div className="mb-4">
        <button
          type="button"
          onClick={startReview}
          disabled={stage === "loading"}
          aria-busy={stage === "loading"}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-bold shadow-sm transition hover:brightness-95 disabled:cursor-wait"
          style={{
            backgroundColor: solidAccentColor,
            borderColor: solidAccentColor,
            color: buttonTextColor,
          }}
        >
          {stage === "loading"
            ? "LINE認証を確認しています…"
            : "口コミを投稿する"}
        </button>
        {error && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs leading-5 text-red-700">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div>
          <p className="text-sm font-bold text-gray-800">口コミを投稿</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            団体への感想を送信できます。内容は運営の確認後に公開されます。送信後の編集はできません。
          </p>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          maxLength={300}
          placeholder="参加した感想や団体の雰囲気を書いてください（5〜300文字）"
          className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": solidAccentColor } as React.CSSProperties}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-gray-500">
            {content.length}/300
          </span>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-xl px-5 py-2.5 text-sm font-bold transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
            style={{
              backgroundColor: solidAccentColor,
              color: buttonTextColor,
            }}
          >
            {saving ? "送信中…" : "口コミを送信"}
          </button>
        </div>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs leading-5 text-red-700">{error}</p>
          </div>
        )}
      </form>
    </div>
  );
}
