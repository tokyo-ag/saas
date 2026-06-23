'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, PublicPageInput, Tenant } from '@/lib/api';
import { SITE_URL } from '@/lib/config';
import { SaveToast } from '@/components/ui/SaveToast';

const emptyForm: PublicPageInput = {
  title: '',
  slug: '',
  subtitle: '',
  body: '',
  coverImageUrl: '',
  dividerText: '',
  textColor: '#111827',
  seoTitle: '',
  seoDescription: '',
  status: 'published',
};

const textColorOptions = [
  { label: '標準', value: '#111827' },
  { label: 'やわらかい', value: '#374151' },
  { label: 'ブラウン', value: '#4B3528' },
  { label: 'ネイビー', value: '#1E3A5F' },
  { label: 'グリーン', value: '#14532D' },
  { label: 'ダーク', value: '#020617' },
];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export default function AdminPublicPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<PublicPageInput>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const tenantCode = tenant?.code ?? tenant?.id ?? '';
  const displayName = tenant?.lineDisplayName ?? tenant?.name ?? '公開サイト';
  const generatedSlug = slugify(displayName) || slugify(tenantCode) || 'home';
  const previewUrl = tenantCode
    ? `${SITE_URL}/clubs/${tenantCode}/${generatedSlug}`
    : '';
  const subtitle = form.subtitle?.trim() ?? '';
  const dividerText = form.dividerText?.trim() ?? '';
  const textColor = form.textColor?.trim() || '#111827';
  const previewBody = form.body.trim() || tenant?.description || '';

  useEffect(() => {
    Promise.all([api.tenant.get(), api.publicPages.list()])
      .then(([tenantData, pageData]) => {
        setTenant(tenantData);
        const tenantName = tenantData.lineDisplayName ?? tenantData.name;
        const tenantSlug = slugify(tenantName) || slugify(tenantData.code ?? tenantData.id) || 'home';
        const first = pageData[0];
        if (first) {
          setSelectedId(first.id);
          setForm({
            title: tenantName,
            slug: tenantSlug,
            subtitle: first.subtitle ?? '',
            body: first.body,
            coverImageUrl: first.coverImageUrl ?? '',
            dividerText: first.dividerText ?? '',
            textColor: first.textColor ?? '#111827',
            seoTitle: first.seoTitle ?? '',
            seoDescription: first.seoDescription ?? '',
            status: first.status,
          });
        } else {
          setForm({
            ...emptyForm,
            title: tenantName,
            slug: tenantSlug,
            subtitle: '',
            body: tenantData.description ?? '',
            dividerText: '',
            textColor: '#111827',
          });
        }
      })
      .catch((err: any) => setError(err?.message ?? '読み込みに失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);

    const payload: PublicPageInput = {
      ...form,
      title: displayName,
      slug: generatedSlug,
      subtitle: form.subtitle?.trim(),
      coverImageUrl: form.coverImageUrl?.trim(),
      dividerText: form.dividerText?.trim(),
      textColor,
      seoTitle: displayName,
      seoDescription: form.body
        .replace(/[#>*_-]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 150),
    };

    try {
      const page = selectedId
        ? await api.publicPages.update(selectedId, payload)
        : await api.publicPages.create(payload);
      setSelectedId(page.id);
      setForm({
        title: displayName,
        slug: generatedSlug,
        subtitle: page.subtitle ?? '',
        body: page.body,
        coverImageUrl: page.coverImageUrl ?? '',
        dividerText: page.dividerText ?? '',
        textColor: page.textColor ?? '#111827',
        seoTitle: page.seoTitle ?? '',
        seoDescription: page.seoDescription ?? '',
        status: page.status,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message ?? '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="px-4 py-12 text-center text-sm text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">公開サイト</h1>
        <select
          value={form.status}
          onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as PublicPageInput['status'] }))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
        >
          <option value="draft">下書き</option>
          <option value="published">公開</option>
        </select>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <SaveToast show={saved} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-full bg-[#06C755] px-4 py-2 text-sm font-bold text-white">
              団体説明
            </button>
            <button type="button" disabled className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-300">
              ブログ
            </button>
            <button type="button" disabled className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-300">
              予約管理
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">メイン画像</label>
            <input
              value={form.coverImageUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">サブタイトル</label>
            <input
              maxLength={160}
              value={form.subtitle ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
              placeholder="例：初心者歓迎の社会人サークル"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">切り取り線テキスト</label>
            <input
              maxLength={80}
              value={form.dividerText ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, dividerText: e.target.value }))}
              placeholder="例：こんな人におすすめ"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">文字色</label>
            <div className="flex flex-wrap items-center gap-2">
              {textColorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, textColor: option.value }))}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${
                    textColor.toLowerCase() === option.value.toLowerCase()
                      ? 'border-[#06C755] bg-green-50 text-gray-900'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ backgroundColor: option.value }}
                  />
                  {option.label}
                </button>
              ))}
              <input
                type="color"
                value={textColor}
                onChange={(e) => setForm((prev) => ({ ...prev, textColor: e.target.value }))}
                className="h-10 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">団体説明</label>
            <textarea
              required
              rows={16}
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              placeholder={`${displayName}の紹介文`}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            {previewUrl && (
              <Link
                href={previewUrl}
                target="_blank"
                className="break-all text-sm font-bold text-[#06C755] hover:underline"
              >
                公開ページ
              </Link>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#06C755] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>
        </form>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-sm font-bold text-gray-900">公開イメージ</p>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {form.coverImageUrl ? (
              <img src={form.coverImageUrl} alt="" className="h-40 w-full object-cover" />
            ) : (
              <div className="flex h-40 items-center justify-center bg-gray-100 text-4xl font-bold text-gray-300">
                {displayName.slice(0, 1)}
              </div>
            )}
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-[#06C755]/10 px-3 py-1 text-[#06C755]">団体説明</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-500">ブログ</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-500">予約</span>
              </div>
              <h2 className="text-2xl font-bold leading-tight" style={{ color: textColor }}>{displayName}</h2>
              {subtitle && (
                <p className="text-sm font-bold leading-6 opacity-75" style={{ color: textColor }}>{subtitle}</p>
              )}
              {dividerText && (
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 border-t border-dashed border-gray-300" />
                  <span className="text-xs font-bold text-gray-400">{dividerText}</span>
                  <div className="h-px flex-1 border-t border-dashed border-gray-300" />
                </div>
              )}
              {previewBody && (
                <p className="whitespace-pre-wrap text-sm leading-7 opacity-85" style={{ color: textColor }}>{previewBody}</p>
              )}
              <button type="button" className="w-full rounded-lg bg-[#06C755] px-4 py-2.5 text-sm font-bold text-white">
                予約する
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
