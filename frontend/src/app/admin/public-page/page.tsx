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
  accentColor: '#06C755',
  fontFamily: 'system',
  titleSize: 'large',
  titleAlign: 'left',
  bodySize: 'base',
  layoutVariant: 'one_page',
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

const layoutOptions = [
  { label: '静止サイト', value: 'one_page' },
  { label: 'メニュー型', value: 'hamburger' },
  { label: '上部ボタン型', value: 'tabs' },
];

const fontOptions = [
  { label: '標準', value: 'system', family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { label: '丸ゴシック', value: 'rounded', family: '"Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif' },
  { label: '明朝', value: 'serif', family: '"Yu Mincho", "Hiragino Mincho ProN", serif' },
];

const titleSizeOptions = [
  { label: '小', value: 'small', className: 'text-2xl md:text-3xl' },
  { label: '標準', value: 'large', className: 'text-3xl md:text-4xl' },
  { label: '大', value: 'xlarge', className: 'text-4xl md:text-5xl' },
];

const bodySizeOptions = [
  { label: '小', value: 'small', className: 'text-sm leading-7' },
  { label: '標準', value: 'base', className: 'text-base leading-8' },
  { label: '大', value: 'large', className: 'text-lg leading-9' },
];

const alignOptions = [
  { label: '左', value: 'left' },
  { label: '中央', value: 'center' },
  { label: '右', value: 'right' },
];

async function uploadFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `public-page-${Date.now()}.${ext}`;
  const res = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
    method: 'POST',
    headers: { 'content-type': file.type || 'application/octet-stream' },
    body: file,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'アップロードに失敗しました');
  return data.url as string;
}

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
  const [uploading, setUploading] = useState(false);
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
  const accentColor = form.accentColor?.trim() || '#06C755';
  const fontFamily = fontOptions.find((option) => option.value === form.fontFamily)?.family ?? fontOptions[0].family;
  const titleSizeClass = titleSizeOptions.find((option) => option.value === form.titleSize)?.className ?? titleSizeOptions[1].className;
  const bodySizeClass = bodySizeOptions.find((option) => option.value === form.bodySize)?.className ?? bodySizeOptions[1].className;
  const titleAlign = (alignOptions.some((option) => option.value === form.titleAlign) ? form.titleAlign! : 'left') as 'left' | 'center' | 'right';
  const layoutVariant = form.layoutVariant || 'one_page';
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
            accentColor: first.accentColor ?? '#06C755',
            fontFamily: first.fontFamily ?? 'system',
            titleSize: first.titleSize ?? 'large',
            titleAlign: first.titleAlign ?? 'left',
            bodySize: first.bodySize ?? 'base',
            layoutVariant: first.layoutVariant ?? 'one_page',
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
            accentColor: '#06C755',
            fontFamily: 'system',
            titleSize: 'large',
            titleAlign: 'left',
            bodySize: 'base',
            layoutVariant: 'one_page',
          });
        }
      })
      .catch((err: any) => setError(err?.message ?? '読み込みに失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  async function handleImageFile(file: File) {
    setUploading(true);
    setError('');
    try {
      const url = await uploadFile(file);
      setForm((prev) => ({ ...prev, coverImageUrl: url }));
    } catch (err: any) {
      setError(err?.message ?? 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }

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
      accentColor,
      fontFamily: form.fontFamily,
      titleSize: form.titleSize,
      titleAlign,
      bodySize: form.bodySize,
      layoutVariant,
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
        accentColor: page.accentColor ?? '#06C755',
        fontFamily: page.fontFamily ?? 'system',
        titleSize: page.titleSize ?? 'large',
        titleAlign: page.titleAlign ?? 'left',
        bodySize: page.bodySize ?? 'base',
        layoutVariant: page.layoutVariant ?? 'one_page',
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
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">UIパターン</label>
            <div className="flex flex-wrap gap-2">
              {layoutOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, layoutVariant: option.value }))}
                  className={`rounded-full border px-4 py-2 text-sm font-bold ${
                    layoutVariant === option.value
                      ? 'border-transparent text-white'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                  style={layoutVariant === option.value ? { backgroundColor: accentColor } : undefined}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">メイン画像</label>
            <input
              value={form.coverImageUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
            <label className={`mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm font-bold text-gray-600 hover:border-[#06C755] ${uploading ? 'opacity-50' : ''}`}>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageFile(file);
                  e.currentTarget.value = '';
                }}
                className="hidden"
              />
              {uploading ? 'アップロード中...' : '画像を選択'}
            </label>
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
            <label className="mb-2 block text-sm font-medium text-gray-700">アクセントカラー</label>
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setForm((prev) => ({ ...prev, accentColor: e.target.value }))}
              className="h-10 w-16 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">フォント</label>
              <select
                value={form.fontFamily ?? 'system'}
                onChange={(e) => setForm((prev) => ({ ...prev, fontFamily: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              >
                {fontOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">団体名の配置</label>
              <select
                value={titleAlign}
                onChange={(e) => setForm((prev) => ({ ...prev, titleAlign: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              >
                {alignOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">団体名の大きさ</label>
              <select
                value={form.titleSize ?? 'large'}
                onChange={(e) => setForm((prev) => ({ ...prev, titleSize: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              >
                {titleSizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">本文の大きさ</label>
              <select
                value={form.bodySize ?? 'base'}
                onChange={(e) => setForm((prev) => ({ ...prev, bodySize: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              >
                {bodySizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
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
          <p className="mb-2 text-sm font-bold text-gray-900">ページ編集</p>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style={{ fontFamily }}>
            {layoutVariant === 'one_page' && (
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-xs font-bold">
                <span style={{ color: textColor }}>{displayName}</span>
                <div className="flex gap-3 text-gray-400">
                  <span>ブログ</span>
                  <span>予約</span>
                </div>
              </div>
            )}
            {layoutVariant === 'hamburger' && (
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="text-xs font-bold" style={{ color: textColor }}>{displayName}</span>
                <span className="flex flex-col gap-1">
                  <span className="h-0.5 w-6 rounded-full bg-gray-500" />
                  <span className="h-0.5 w-6 rounded-full bg-gray-500" />
                  <span className="h-0.5 w-6 rounded-full bg-gray-500" />
                </span>
              </div>
            )}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) void handleImageFile(file);
              }}
            >
              {form.coverImageUrl ? (
                <img src={form.coverImageUrl} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center bg-gray-100 text-4xl font-bold text-gray-300">
                  {uploading ? '...' : displayName.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="space-y-4 p-5">
              {layoutVariant === 'tabs' && (
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full px-3 py-1 text-white" style={{ backgroundColor: accentColor }}>団体説明</span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-500">ブログ</span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-500">予約</span>
                </div>
              )}
              <h2 className={`${titleSizeClass} font-bold leading-tight outline-none`} style={{ color: textColor, textAlign: titleAlign }}>
                {displayName}
              </h2>
              <p
                contentEditable
                suppressContentEditableWarning
                onFocus={(e) => {
                  if (!subtitle) e.currentTarget.innerText = '';
                }}
                onBlur={(e) => setForm((prev) => ({ ...prev, subtitle: e.currentTarget.innerText.trim() }))}
                className="min-h-6 rounded px-1 text-sm font-bold leading-6 opacity-75 outline-none focus:bg-gray-50"
                style={{ color: textColor, textAlign: titleAlign }}
              >
                {subtitle || 'サブタイトル'}
              </p>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 border-t border-dashed border-gray-300" />
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onFocus={(e) => {
                    if (!dividerText) e.currentTarget.innerText = '';
                  }}
                  onBlur={(e) => setForm((prev) => ({ ...prev, dividerText: e.currentTarget.innerText.trim() }))}
                  className="min-w-20 rounded px-1 text-center text-xs font-bold text-gray-400 outline-none focus:bg-gray-50"
                >
                  {dividerText || '切り取り線'}
                </span>
                <div className="h-px flex-1 border-t border-dashed border-gray-300" />
              </div>
              <p
                contentEditable
                suppressContentEditableWarning
                onFocus={(e) => {
                  if (!previewBody) e.currentTarget.innerText = '';
                }}
                onBlur={(e) => setForm((prev) => ({ ...prev, body: e.currentTarget.innerText }))}
                className={`${bodySizeClass} min-h-32 whitespace-pre-wrap rounded px-1 opacity-85 outline-none focus:bg-gray-50`}
                style={{ color: textColor }}
              >
                {previewBody || '団体説明'}
              </p>
              <button type="button" className="w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: accentColor }}>
                予約する
              </button>
            </div>
            {layoutVariant === 'one_page' && (
              <div className="border-t border-gray-100 px-4 py-3 text-center text-xs text-gray-400">
                {displayName}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
