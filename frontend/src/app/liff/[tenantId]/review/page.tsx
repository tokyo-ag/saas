'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, setLiffToken, TenantReview } from '@/lib/api';
import { initLiff, getLiffUserId, loginIfNeeded, liff, redirectToLiffApp, isLiffLoggedIn } from '@/lib/liff';
import { useLiffTheme, readableTextColor, isLightHexColor } from '@/components/liff/LiffThemeProvider';
import { SITE_URL } from '@/lib/config';

function isLineAuthErrorMessage(message: string): boolean {
  return (
    message.includes('LINEトークン') ||
    message.includes('LIFF認証') ||
    message.includes('Unauthorized')
  );
}

function backToSite(tenantId: string) {
  // 経由元のページによらず、口コミSEOページへ確実に戻す。
  window.location.href = `${SITE_URL}/clubs/${tenantId}/reviews`;
}

type Stage = 'start' | 'loading' | 'ready';

export default function TenantReviewPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const theme = useLiffTheme();
  const accentColor = theme.accentColor;
  const solidAccentColor = isLightHexColor(accentColor) ? '#111827' : accentColor;

  const [stage, setStage] = useState<Stage>('start');
  const [lineUserId, setLineUserId] = useState('');
  const [loginRequired, setLoginRequired] = useState(false);
  const [myReview, setMyReview] = useState<{ content: string; isPublished: boolean } | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState<TenantReview[]>([]);

  async function startReview() {
    setStage('loading');
    setLoginRequired(false);

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
          setStage('start');
          return;
        }
      }
    } else {
      uid = `demo-${tenantId}`;
    }

    if (!uid) {
      setLoginRequired(true);
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
    try {
      setReviews(await api.liff.tenantReviews(tenantId));
    } catch {
      // 一覧の取得に失敗しても投稿自体は継続できるようにする。
    }
    setStage('ready');
  }

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
    // liff.line.me経由だとLINEアプリを強制的に開こうとするため、
    // ブラウザ内で完結するliff.login()を優先する。
    try {
      liff.login({ redirectUri: window.location.href });
    } catch {
      if (!redirectToLiffApp()) window.location.reload();
    }
  }

  return (
    <div className="min-h-screen sm:bg-gray-200" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="mx-auto w-full max-w-[480px] sm:my-8 sm:overflow-hidden sm:rounded-3xl sm:shadow-2xl" style={{ backgroundColor: theme.backgroundColor, minHeight: '100dvh' }}>
        <div className="px-4 py-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 16px) + 20px)' }}>
          {stage !== 'ready' && (
            <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
              <div>
                <p className="text-sm font-bold text-gray-800">感想を書く</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-400">
                  団体についての感想を投稿できます。LINEログイン後に入力・送信できます。
                </p>
              </div>
              <button
                type="button"
                onClick={startReview}
                disabled={stage === 'loading'}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: solidAccentColor, color: readableTextColor(solidAccentColor) }}
              >
                {stage === 'loading' ? '読み込み中...' : '感想を書く'}
              </button>
              {loginRequired && (
                <div className="space-y-2 pt-1 text-center">
                  <p className="text-xs text-gray-500">LINEへのログインが必要です。</p>
                  <button
                    type="button"
                    onClick={handleLoginRetry}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600"
                  >
                    LINEログインをやり直す
                  </button>
                </div>
              )}
            </div>
          )}

          {stage === 'ready' && (
            <>
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
                    onClick={() => backToSite(tenantId)}
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

              {reviews.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-bold text-gray-800">みんなの声</p>
                  {reviews.map((review) => (
                    <div key={review.id} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm">
                      {review.authorIconUrl ? (
                        <img src={review.authorIconUrl} alt="" className="mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400">
                          {review.authorName.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="mb-0.5 text-xs font-medium text-gray-700">{review.authorName}</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{review.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
