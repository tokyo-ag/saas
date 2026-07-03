'use client';

import { useState } from 'react';
import { OfficialArticle, OfficialArticleInput } from '@/lib/api';

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]';

export default function ArticleForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: OfficialArticle;
  onSubmit: (data: OfficialArticleInput) => Promise<void>;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [targetKeyword, setTargetKeyword] = useState(initial?.targetKeyword ?? '');
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? '');
  const [ctaHref, setCtaHref] = useState(initial?.ctaHref ?? '');
  const [ogImageUrl, setOgImageUrl] = useState(initial?.ogImageUrl ?? '');
  const [status, setStatus] = useState<'draft' | 'published'>(initial?.status ?? 'draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        title,
        slug: slug.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        body,
        category: category.trim() || undefined,
        targetKeyword: targetKeyword.trim() || undefined,
        ctaLabel: ctaLabel.trim() || undefined,
        ctaHref: ctaHref.trim() || undefined,
        ogImageUrl: ogImageUrl.trim() || undefined,
        status,
      });
    } catch (err: any) {
      setError(err.message ?? '保存に失敗しました');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">タイトル <span className="text-red-500">*</span></label>
        <input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="例: バドミントンサークルの参加者管理を楽にする方法" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">スラッグ（URL）</label>
        <input maxLength={120} value={slug} onChange={(e) => setSlug(e.target.value)} className={`${inputClass} font-mono`} placeholder="空欄でタイトルから自動生成" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
          <input maxLength={60} value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} placeholder="例: 管理 / 集客 / 運営" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">狙うキーワード</label>
          <input maxLength={120} value={targetKeyword} onChange={(e) => setTargetKeyword(e.target.value)} className={inputClass} placeholder="例: サークル 参加者 管理" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">抜粋（記事一覧・description用）</label>
        <textarea rows={2} maxLength={300} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className={inputClass} placeholder="検索結果やSNSに表示される説明文" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">本文（Markdown） <span className="text-red-500">*</span></label>
        <p className="text-xs text-gray-400 mb-1.5">対応記法: <code className="font-mono">## 見出し</code> / <code className="font-mono">### 小見出し</code> / <code className="font-mono">- 強調文</code> / <code className="font-mono">![alt](画像URL)</code> / 空行で段落区切り</p>
        <textarea required rows={22} value={body} onChange={(e) => setBody(e.target.value)} className={`${inputClass} font-mono leading-6`} placeholder={'## 見出し\n\n本文テキスト。\n\n- 強調したいポイント\n\n### 小見出し\n\n![説明](https://example.com/image.png)'} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CTAラベル</label>
          <input maxLength={80} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className={inputClass} placeholder="例: COMIUを無料で試す" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CTAリンク先</label>
          <input maxLength={500} value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} className={inputClass} placeholder="/register" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">OGP画像URL</label>
        <input value={ogImageUrl} onChange={(e) => setOgImageUrl(e.target.value)} className={inputClass} placeholder="https://..." />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">公開状態</label>
        <div className="flex gap-3">
          {(['draft', 'published'] as const).map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="accent-[#06C755]" />
              <span className="text-sm text-gray-700">{s === 'published' ? '公開' : '下書き'}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !title.trim() || !body.trim()}
          className="bg-[#06C755] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#05a847] disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
