'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, AreaHubSettingInput } from '@/lib/api';
import { LOCATION_TAGS } from '@/lib/lpTags';

type IndexMode = 'auto' | 'index' | 'noindex';

function AreaHubSettingEditForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get('category') ?? '';
  const area = searchParams.get('area') ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState('');
  const [faqEnabled, setFaqEnabled] = useState(true);
  const [relatedArticleLimit, setRelatedArticleLimit] = useState(3);
  const [nearbyAreas, setNearbyAreas] = useState<string[]>([]);
  const [indexMode, setIndexMode] = useState<IndexMode>('auto');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  useEffect(() => {
    if (!category) { setLoading(false); return; }
    api.superadmin.getAreaHubSetting(category, area)
      .then((setting) => {
        if (!setting) return;
        setDescription(setting.description ?? '');
        setFaqEnabled(setting.faqEnabled ?? true);
        setRelatedArticleLimit(setting.relatedArticleLimit ?? 3);
        setNearbyAreas(setting.nearbyAreas ?? []);
        setIndexMode(setting.indexable === true ? 'index' : setting.indexable === false ? 'noindex' : 'auto');
        setSeoTitle(setting.seoTitle ?? '');
        setSeoDescription(setting.seoDescription ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, area]);

  function toggleNearbyArea(tag: string) {
    setNearbyAreas((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data: AreaHubSettingInput = {
        description: description.trim() || undefined,
        faqEnabled,
        relatedArticleLimit,
        nearbyAreas,
        indexable: indexMode === 'auto' ? undefined : indexMode === 'index',
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
      };
      await api.superadmin.updateAreaHubSetting(category, area, data);
      router.push('/superadmin/articles/area-hubs');
    } finally {
      setSaving(false);
    }
  }

  if (!category) {
    return <p className="p-8 text-sm text-gray-400">category を指定してください。</p>;
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/superadmin/articles/area-hubs" className="text-gray-400 hover:text-gray-600 text-sm">← 戻る</Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">ハブページ設定</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{category}{area ? ` × ${area}` : ''}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-4 sm:py-6 space-y-5">
        {loading ? (
          <p className="text-gray-400 text-sm">読み込み中...</p>
        ) : (
          <>
            <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
              未設定の項目は自動生成した内容を使用します。
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">説明文</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={`例: ${area || '世田谷区'}で活動している${category}サークルや、参加者を募集している活動を紹介します。`}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={faqEnabled} onChange={(e) => setFaqEnabled(e.target.checked)} className="accent-[#06C755]" />
                よくある質問（FAQ）を表示する
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">関連記事の表示件数</label>
              <input
                type="number"
                min={1}
                max={9}
                value={relatedArticleLimit}
                onChange={(e) => setRelatedArticleLimit(Math.max(1, Math.min(9, parseInt(e.target.value, 10) || 3)))}
                className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">近隣地域（手動指定・任意）</label>
              <p className="text-xs text-gray-400 mb-1.5">未選択の場合は、同一都道府県内で公開団体がある地域を自動で表示します。</p>
              <div className="flex flex-wrap gap-1.5">
                {LOCATION_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleNearbyArea(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                      nearbyAreas.includes(tag) ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">検索エンジンへの表示</label>
              <div className="flex gap-3">
                {([
                  { value: 'auto' as const, label: '自動（掲載団体・記事があればindex）' },
                  { value: 'index' as const, label: '常にindex' },
                  { value: 'noindex' as const, label: '常にnoindex' },
                ]).map((opt) => (
                  <label key={opt.value} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="radio" name="indexMode" checked={indexMode === opt.value} onChange={() => setIndexMode(opt.value)} className="accent-[#06C755]" />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">titleタグ</label>
              <input
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={`例: ${area || '世田谷区'}の${category}サークル一覧｜初心者・社会人向け活動を検索`}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">meta description</label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={2}
                placeholder={`例: ${area || '世田谷区'}で参加者を募集している${category}サークルや活動を紹介。`}
                className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-[#06C755] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#05a847] disabled:opacity-50 transition-colors"
              >
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AreaHubSettingEditPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-gray-400">読み込み中...</p>}>
      <AreaHubSettingEditForm />
    </Suspense>
  );
}
