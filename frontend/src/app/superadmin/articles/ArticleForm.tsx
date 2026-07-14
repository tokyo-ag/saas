'use client';

import { useState } from 'react';
import { OfficialArticle, OfficialArticleInput } from '@/lib/api';
import { LOCATION_TAGS } from '@/lib/lpTags';
import BlockEditor, { Block, parseBodyToBlocks, blocksToBody } from './BlockEditor';
import ArticlePreview from './ArticlePreview';

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]';

const ACTIVITY_CATEGORIES = ['交流会', 'バドミントン', 'フットサル', 'バスケ', 'バレー'];
const TYPE_CATEGORIES = ['インカレサークル', '学生団体', 'イベント団体', '社会人サークル'];

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
  const [blocks, setBlocks] = useState<Block[]>(() => parseBodyToBlocks(initial?.body ?? ''));
  const [category, setCategory] = useState(initial?.category ?? '');
  const [areaTags, setAreaTags] = useState<string[]>(initial?.areaTags ?? []);
  const isPillar = initial?.isPillar ?? false;
  const pillarSlug = initial?.pillarSlug ?? '';
  const targetKeyword = initial?.targetKeyword ?? '';
  const [ogImageUrl, setOgImageUrl] = useState(initial?.ogImageUrl ?? '');
  const [status, setStatus] = useState<'draft' | 'published'>(initial?.status ?? 'draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleAreaTag(tag: string) {
    setAreaTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        title,
        slug: slug.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        body: blocksToBody(blocks),
        category: category.trim() || undefined,
        areaTags,
        isPillar,
        pillarSlug: isPillar ? undefined : pillarSlug.trim() || undefined,
        targetKeyword: targetKeyword.trim() || undefined,
        ogImageUrl: ogImageUrl.trim() || undefined,
        status,
      });
    } catch (err: any) {
      setError(err.message ?? '保存に失敗しました');
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col lg:h-full lg:flex-row">
    <form onSubmit={handleSubmit} className="space-y-5 bg-white px-4 py-6 sm:px-8 lg:h-full lg:w-1/2 lg:overflow-y-auto">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">タイトル <span className="text-red-500">*</span></label>
        <input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="例: バドミントンサークルの参加者管理を楽にする方法" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">スラッグ（URL）</label>
        <input maxLength={120} value={slug} onChange={(e) => setSlug(e.target.value)} className={`${inputClass} font-mono`} placeholder="空欄でタイトルから自動生成" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          <option value="">未選択</option>
          <optgroup label="活動種目">
            {ACTIVITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </optgroup>
          <optgroup label="団体タイプ">
            {TYPE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </optgroup>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">エリアタグ</label>
        <p className="text-xs text-gray-400 mb-1.5">/guide/area/〇〇 のハブページ生成に使われます。イベント作成時の場所タグと同じ一覧から選択します。</p>
        <div className="flex flex-wrap gap-1.5">
          {LOCATION_TAGS.map((tag) => {
            const selected = areaTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleAreaTag(tag)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  selected ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">抜粋（記事一覧・description用）</label>
        <textarea rows={2} maxLength={300} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className={inputClass} placeholder="検索結果やSNSに表示される説明文" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">本文 <span className="text-red-500">*</span></label>
        <p className="text-xs text-gray-400 mb-1.5">「＋」でブロックを追加し、見出し・段落・リスト・画像・CTAボタン・サークルカードを組み立てます。</p>
        <BlockEditor blocks={blocks} onChange={setBlocks} />
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
          disabled={saving || !title.trim() || blocks.length === 0}
          className="bg-[#06C755] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#05a847] disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : submitLabel}
        </button>
      </div>
    </form>

    <div className="border-t border-gray-200 bg-[#F7F8FA] px-4 py-6 sm:px-8 lg:h-full lg:w-1/2 lg:overflow-y-auto lg:border-l lg:border-t-0">
      <p className="mb-2 text-xs font-bold text-gray-400">プレビュー</p>
      <ArticlePreview
        title={title}
        category={category}
        areaTags={areaTags}
        targetKeyword={targetKeyword}
        excerpt={excerpt}
        blocks={blocks}
      />
    </div>
    </div>
  );
}
