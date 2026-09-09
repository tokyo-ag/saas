'use client';

import { useEffect, useState } from 'react';
import { api, setLiffToken } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded, liff, isLiffLoggedIn, getInitError, hasRecentLoginAttempt } from '@/lib/liff';
import { isLightHexColor, readableTextColor } from '@/lib/color';

type Stage = 'start' | 'loading' | 'ready';

function isLineAuthErrorMessage(message: string): boolean {
  return (
    message.includes('LINEトークン') ||
    message.includes('LIFF認証') ||
    message.includes('Unauthorized')
  );
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
  const [loginRequired, setLoginRequired] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [myReview, setMyReview] = useState<{ content: string; isPublished: boolean } | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stage === 'ready' && myReview) {
      document.getElementById('reviews-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [stage, myReview]);

  async function startReview() {
    setStage('loading');
    setLoginRequired(false);
    setDebugInfo('');

    const ok = await initLiff(liffId ?? undefined);
    let uid = '';
    if (ok) {
      if (liff.isInClient()) {
        uid = (await getLiffUserId()) ?? '';
      } else {
        const loggedIn = await loginIfNeeded();
        if (loggedIn) {
          uid = (await getLiffUserId()) ?? '';
        } else {
          setLoginRequired(true);
          setDebugInfo(hasRecentLoginAttempt() ? 'cooldown中（前回の試行から5分以内）' : 'liff.login()呼び出し済み・リダイレクト待ち');
          setStage('start');
          return;
        }
      }
    } else {
      uid = `demo-${tenantId}`;
    }

    if (!uid) {
      setLoginRequired(true);
      setDebugInfo(getInitError() ?? 'uid取得失敗');
      setStage('start');
      return;
    }
    setLineUserId(uid);
    setLiffToken(isLiffLoggedIn() ? liff.getIDToken() : null);

    try {
      const existing = await api.liff.myTenantReview(tenantId, uid);
      if (existing) {
        setMyReview({ content: existing.content, isPublished: !!existing.isPublished });
      }
    } catch {
      // 初回投稿（まだ口コミが無い）は404相当なので、空フォームのまま進める。
    }
    setStage('ready');
  }

  function handleLoginRetry() {
    if (liff.isInClient()) {
      window.location.reload();
      return;
    }
    // liff.line.me経由だとLINEアプリを強制的に開こうとするため、
    // ブラウザ内で完結するliff.login()を優先する。
    try {
      liff.login({ redirectUri: window.location.href });
    } catch {
      window.location.reload();
    }
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
      setMyReview({ content: trimmed, isPublished: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '送信に失敗しました';
      if (isLineAuthErrorMessage(msg)) {
        setLiffToken(null);
        setStage('start');
        setLoginRequired(true);
        return;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
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
        {loginRequired && (
          <div className="mt-2 space-y-2 text-center">
            <p className="text-xs text-gray-500">LINEへのログインが必要です。</p>
            <button
              type="button"
              onClick={handleLoginRetry}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600"
            >
              LINEログインをやり直す
            </button>
            {debugInfo && <p className="text-[10px] text-gray-300">{debugInfo}</p>}
          </div>
        )}
      </div>
    );
  }

  if (myReview) {
    return null;
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
