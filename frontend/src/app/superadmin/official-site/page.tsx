'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, OfficialSiteSettings } from '@/lib/api';

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]';

export default function SuperadminOfficialSitePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroLead, setHeroLead] = useState('');
  const [primaryCtaLabel, setPrimaryCtaLabel] = useState('');
  const [primaryCtaHref, setPrimaryCtaHref] = useState('');
  const [secondaryCtaLabel, setSecondaryCtaLabel] = useState('');
  const [secondaryCtaHref, setSecondaryCtaHref] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  function applySettings(s: OfficialSiteSettings) {
    setStatus(s.status);
    setHeroTitle(s.heroTitle ?? '');
    setHeroLead(s.heroLead ?? '');
    setPrimaryCtaLabel(s.primaryCtaLabel ?? '');
    setPrimaryCtaHref(s.primaryCtaHref ?? '');
    setSecondaryCtaLabel(s.secondaryCtaLabel ?? '');
    setSecondaryCtaHref(s.secondaryCtaHref ?? '');
    setSeoTitle(s.seoTitle ?? '');
    setSeoDescription(s.seoDescription ?? '');
    setUpdatedAt(s.updatedAt);
  }

  useEffect(() => {
    api.superadmin.officialSite()
      .then(applySettings)
      .catch((e: any) => setError(e.message ?? '読み込みに失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await api.superadmin.updateOfficialSite({
        status,
        heroTitle: heroTitle.trim(),
        heroLead: heroLead.trim(),
        primaryCtaLabel: primaryCtaLabel.trim(),
        primaryCtaHref: primaryCtaHref.trim(),
        secondaryCtaLabel: secondaryCtaLabel.trim(),
        secondaryCtaHref: secondaryCtaHref.trim(),
        seoTitle: seoTitle.trim(),
        seoDescription: seoDescription.trim(),
      });
      applySettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message ?? '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/superadmin" className="text-gray-400 hover:text-gray-600 text-sm">← 戻る</Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">LP設定</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              comiu.link/organizers のトライアル告知バナーとSEO設定
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
        {loading ? (
          <p className="text-gray-400 text-sm">読み込み中...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">トライアル告知バナー</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  /organizers のヒーロー上部に出るバッジです。見出しを空にすると非表示になります。公開状態が「下書き」の間もバナーは出ません。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">見出し（バッジ本文）</label>
                <input maxLength={160} value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className={inputClass} placeholder="例: 今なら3ヶ月間無料トライアル実施中" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">補足テキスト（バッジ横）</label>
                <input maxLength={300} value={heroLead} onChange={(e) => setHeroLead(e.target.value)} className={inputClass} placeholder="例: クレジットカード登録不要・いつでも解約OK" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">バッジのリンク先</label>
                  <input maxLength={500} value={primaryCtaHref} onChange={(e) => setPrimaryCtaHref(e.target.value)} className={inputClass} placeholder="/register" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">公開状態</label>
                  <div className="flex gap-3 pt-2">
                    {(['draft', 'published'] as const).map((s) => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="accent-[#06C755]" />
                        <span className="text-sm text-gray-700">{s === 'published' ? '公開' : '下書き'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">SEO（ページの &lt;title&gt; / description）</h2>
                <p className="text-xs text-gray-500 mt-0.5">空欄の場合はデフォルトの文言のまま。H1本文やページ構成には影響しません。</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SEOタイトル</label>
                <input maxLength={160} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className={inputClass} placeholder="イベント・サークルの集客ならCOMIU | 無料で団体ページを作成" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SEO description</label>
                <textarea rows={2} maxLength={300} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} className={inputClass} placeholder="検索結果に表示される説明文" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-900">予備CTA（未使用・将来のページ改修用）</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">サブCTAラベル</label>
                  <input maxLength={60} value={secondaryCtaLabel} onChange={(e) => setSecondaryCtaLabel(e.target.value)} className={inputClass} placeholder="相談する" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">サブCTAリンク先</label>
                  <input maxLength={500} value={secondaryCtaHref} onChange={(e) => setSecondaryCtaHref(e.target.value)} className={inputClass} placeholder="/contact" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メインCTAラベル</label>
                  <input maxLength={60} value={primaryCtaLabel} onChange={(e) => setPrimaryCtaLabel(e.target.value)} className={inputClass} placeholder="無料ではじめる" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#06C755] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#05a847] disabled:opacity-50 transition-colors"
              >
                {saving ? '保存中...' : saved ? '保存しました' : '保存する'}
              </button>
              {updatedAt && (
                <span className="text-xs text-gray-400">最終更新: {new Date(updatedAt).toLocaleString('ja-JP')}</span>
              )}
              {status === 'published' && (
                <a href="/organizers" target="_blank" rel="noreferrer" className="text-sm text-[#06C755] hover:underline ml-auto">
                  LPを見る →
                </a>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
