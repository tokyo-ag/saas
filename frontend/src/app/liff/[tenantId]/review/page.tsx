'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, setLiffToken } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded, liff, redirectToLiffApp, isLiffLoggedIn } from '@/lib/liff';
import { useLiffTheme, readableTextColor, isLightHexColor } from '@/components/liff/LiffThemeProvider';

function isLineAuthErrorMessage(message: string): boolean {
  return (
    message.includes('LINEトークン') ||
    message.includes('LIFF認証') ||
    message.includes('Unauthorized')
  );
}

function backToSite() {
  // このページは公開サイト上のリンクから同じタブで開かれるため、まずはブラウザ履歴で
  // 元のサイトへ戻す。liff.closeWindow()はLINEアプリから直接起動したLIFFフレームでしか
  // 期待通りに動かず（履歴のない状態でトーク一覧まで閉じてしまう等）、
  // このフローでは「戻れない」原因になっていた。
  if (typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back();
    return;
  }
  try {
    if (liff.isInClient() || liff.isLoggedIn()) {
      liff.closeWindow();
      return;
    }
  } catch {
    // ignore
  }
  window.close();
}

export default function TenantReviewPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const theme = useLiffTheme();
  const accentColor = theme.accentColor;
  const solidAccentColor = isLightHexColor(accentColor) ? '#111827' : accentColor;

  const [lineUserId, setLineUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loginRequired, setLoginRequired] = useState(false);
  const [myReview, setMyReview] = useState<{ content: string; isPublished: boolean } | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function init() {
      const ok = await initLiff();
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
            setLoading(false);
            return;
          }
        }
      } else {
        uid = `demo-${tenantId}`;
      }

      if (!uid) {
        setLoginRequired(true);
        setLoading(false);
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
      setLoading(false);
    }
    init();
  }, [tenantId]);

  function restartLineAuth() {
    setError('LINE認証を更新しています。画面が切り替わらない場合は、LINEからもう一度開き直してください。');
    setLiffToken(null);
    if (liff.isInClient()) {
      window.location.reload();
      return;
    }
    try {
      if (isLiffLoggedIn()) liff.logout();
    } catch {
      // ignore
    }
    if (!redirectToLiffApp()) {
      liff.login({ redirectUri: window.location.href });
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
        restartLineAuth();
        return;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleLoginRetry() {
    if (liff.isInClient()) {
      window.location.reload();
      return;
    }
    if (redirectToLiffApp()) return;
    try {
      liff.login({ redirectUri: window.location.href });
    } catch {
      window.location.reload();
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm" style={{ color: accentColor }}>読み込み中...</div>
      </div>
    );
  }

  if (loginRequired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center" style={{ backgroundColor: theme.backgroundColor }}>
        <p className="text-sm text-gray-500">LINEへのログインが必要です。</p>
        <button
          onClick={handleLoginRetry}
          className="rounded-2xl px-8 py-3.5 text-sm font-bold active:opacity-90"
          style={{ backgroundColor: solidAccentColor, color: readableTextColor(solidAccentColor) }}
        >
          LINEログインをやり直す
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="px-4 py-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 16px) + 20px)' }}>
        {myReview ? (
          <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-gray-800">あなたの投稿</p>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                myReview.isPublished ? 'bg-green-50 text-[#06C755]' : 'bg-gray-100 text-gray-500'
              }`}>
                {myReview.isPublished ? '公開中' : '審査中（非公開）'}
              </span>
            </div>
            <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">{myReview.content}</p>
            <p className="text-[11px] leading-relaxed text-gray-400">
              {myReview.isPublished
                ? '投稿内容は変更できません。内容の修正が必要な場合は運営にお問い合わせください。'
                : '運営が内容を確認したのち、公開サイトに表示されます。投稿内容は変更できません。内容はあなただけが確認できます。'}
            </p>
            <button
              type="button"
              onClick={backToSite}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-bold"
              style={{ backgroundColor: solidAccentColor, color: readableTextColor(solidAccentColor) }}
            >
              サイトに戻る
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
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
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--liff-accent)]"
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
        )}
      </div>
    </div>
  );
}
