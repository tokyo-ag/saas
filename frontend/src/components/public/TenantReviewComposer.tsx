'use client';

import { useState } from 'react';
import { api, setLiffToken } from '@/lib/api';
import { initLiff, getLiffUserId, liff, isLiffLoggedIn } from '@/lib/liff';
import { isLightHexColor, readableTextColor } from '@/lib/color';
import { SITE_URL } from '@/lib/config';

type Stage = 'start' | 'loading' | 'ready';

function isLineAuthErrorMessage(message: string): boolean {
  return (
    message.includes('LINEトークン') ||
    message.includes('LIFF認証') ||
    message.includes('Unauthorized')
  );
}

function reviewedStorageKey(tenantId: string): string {
  return `comiu-reviewed-${tenantId}`;
}

function markReviewed(tenantId: string): void {
  try {
    window.localStorage.setItem(reviewedStorageKey(tenantId), '1');
  } catch {
    // localStorageが使えない場合は何もしない（次回また表示されるだけ）
  }
}

function hasReviewedBefore(tenantId: string): boolean {
  try {
    return window.localStorage.getItem(reviewedStorageKey(tenantId)) === '1';
  } catch {
    return false;
  }
}

export function TenantReviewComposer({
  tenantId,
  liffId,
  accentColor,
}: {
  tenantId: string;
  liffId?: string | null;
  accentColor: string;
}) {
  const solidAccentColor = isLightHexColor(accentColor) ? '#111827' : accentColor;

  const [stage, setStage] = useState<Stage>('start');
  const [lineUserId, setLineUserId] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reviewed] = useState(() => (typeof window !== 'undefined' ? hasReviewedBefore(tenantId) : false));

  function goToCleanReviewsPage() {
    window.location.href = `${SITE_URL}/clubs/${tenantId}/reviews`;
  }

  async function startReview() {
    setStage('loading');

    const ok = await initLiff(liffId ?? undefined);
    let uid = '';
    if (ok) {
      if (liff.isInClient()) {
        uid = (await getLiffUserId()) ?? '';
      } else if (isLiffLoggedIn()) {
        uid = (await getLiffUserId()) ?? '';
      } else {
        // ブラウザ内で完結するliff.login()でLINEログインへ遷移する。
        // 戻ってきた後、もう一度このボタンを押すとログイン済み状態で続行できる。
        liff.login({ redirectUri: window.location.href });
        return;
      }
    } else {
      uid = `demo-${tenantId}`;
    }

    if (!uid) {
      setStage('start');
      return;
    }
    setLineUserId(uid);
    setLiffToken(isLiffLoggedIn() ? liff.getIDToken() : null);

    try {
      const existing = await api.liff.myTenantReview(tenantId, uid);
      if (existing) {
        markReviewed(tenantId);
        goToCleanReviewsPage();
        return;
      }
    } catch {
      // 初回投稿（まだ口コミが無い）は404相当なので、空フォームのまま進める。
    }
    setStage('ready');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (trimmed.length < 5 || trimmed.length > 300) {
      setError('感想は5文字以上300文字以内で入力してください');
      return;
    }
    setError('');
    setSaving(true);
    try {
      setLiffToken(isLiffLoggedIn() ? liff.getIDToken() : null);
      await api.liff.submitTenantReview(tenantId, lineUserId, trimmed);
      markReviewed(tenantId);
      goToCleanReviewsPage();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '送信に失敗しました';
      if (isLineAuthErrorMessage(msg)) {
        setLiffToken(null);
        setStage('start');
        return;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (reviewed) {
    return null;
  }

  if (stage !== 'ready') {
    return (
      <div className="mb-4">
        <button
          type="button"
          onClick={startReview}
          disabled={stage === 'loading'}
          className="inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50"
          style={{ backgroundColor: accentColor, color: '#ffffff' }}
        >
          {stage === 'loading' ? '読み込み中...' : '感想を書く'}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-bold text-gray-800">感想を書く</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            団体についての感想を投稿できます。送信した感想は、運営が確認のうえ公開されます。投稿後の内容変更はできませんので、確認のうえ送信してください。
          </p>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          maxLength={300}
          placeholder="参加した感想や団体の雰囲気を書いてみましょう（5〜300文字）"
          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-gray-400">{content.length}/300</span>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50"
            style={{ backgroundColor: solidAccentColor, color: readableTextColor(solidAccentColor) }}
          >
            {saving ? '送信中...' : '感想を送信'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>
    </div>
  );
}
