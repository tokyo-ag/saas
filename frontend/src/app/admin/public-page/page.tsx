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
  imageUrls: [],
  dividerText: '',
  textColor: '#111827',
  accentColor: '#06C755',
  backgroundColor: '#F7F8FA',
  fontFamily: 'mincho',
  titleSize: 'large',
  titleAlign: 'left',
  bodySize: 'base',
  layoutVariant: 'one_page',
  aboutLabel: '団体詳細',
  reserveLabel: '予約画面',
  blogLabel: 'ブログ',
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
  { label: 'ボタン型', value: 'tabs' },
];

const fontOptions = [
  { label: '明朝', value: 'mincho', family: '"Yu Mincho", "Hiragino Mincho ProN", serif' },
  { label: '手書き', value: 'handwriting', family: '"Hachi Maru Pop", "Comic Sans MS", "Yu Gothic", cursive' },
  { label: 'マジックペン', value: 'marker', family: '"Arial Rounded MT Bold", "Arial Black", "Yu Gothic", sans-serif' },
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

const navItems = [
  { key: 'about', field: 'aboutLabel' },
  { key: 'blog', field: 'blogLabel' },
  { key: 'reserve', field: 'reserveLabel' },
] as const;

const backgroundOptions = [
  { label: 'ホワイト', value: '#FFFFFF' },
  { label: 'ミント', value: '#F0FDF4' },
  { label: 'ブルー', value: '#EFF6FF' },
  { label: 'ピンク', value: '#FDF2F8' },
  { label: 'ラベンダー', value: '#F5F3FF' },
  { label: 'クリーム', value: '#FFF7ED' },
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<(typeof navItems)[number]['key']>('about');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const tenantCode = tenant?.code ?? tenant?.id ?? '';
  const displayName = tenant?.lineDisplayName ?? tenant?.name ?? '公開サイト';
  const generatedSlug = slugify(displayName) || slugify(tenantCode) || 'home';
  const previewUrl = tenantCode
    ? `${SITE_URL}/clubs/${tenantCode}/${generatedSlug}`
    : '';
  const subtitle = form.subtitle?.trim() ?? '';
  const textColor = form.textColor?.trim() || '#111827';
  const accentColor = form.accentColor?.trim() || '#06C755';
  const backgroundColor = form.backgroundColor?.trim() || '#F7F8FA';
  const fontFamily = fontOptions.find((option) => option.value === form.fontFamily)?.family ?? fontOptions[0].family;
  const titleSizeClass = titleSizeOptions.find((option) => option.value === form.titleSize)?.className ?? titleSizeOptions[1].className;
  const bodySizeClass = bodySizeOptions.find((option) => option.value === form.bodySize)?.className ?? bodySizeOptions[1].className;
  const titleAlign = (alignOptions.some((option) => option.value === form.titleAlign) ? form.titleAlign! : 'left') as 'left' | 'center' | 'right';
  const layoutVariant = form.layoutVariant || 'one_page';
  const previewBody = form.body.trim() || tenant?.description || '';
  const imageUrls = (form.imageUrls?.length ? form.imageUrls : form.coverImageUrl ? [form.coverImageUrl] : [])
    .filter(Boolean)
    .slice(0, 3);
  const navLabels = {
    about: form.aboutLabel?.trim() || '団体詳細',
    reserve: form.reserveLabel?.trim() || '予約画面',
    blog: form.blogLabel?.trim() || 'ブログ',
  };

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
            imageUrls: first.imageUrls?.length ? first.imageUrls : first.coverImageUrl ? [first.coverImageUrl] : [],
            dividerText: first.dividerText ?? '',
            textColor: first.textColor ?? '#111827',
            accentColor: first.accentColor ?? '#06C755',
            backgroundColor: first.backgroundColor ?? '#F7F8FA',
            fontFamily: first.fontFamily ?? 'mincho',
            titleSize: first.titleSize ?? 'large',
            titleAlign: first.titleAlign ?? 'left',
            bodySize: first.bodySize ?? 'base',
            layoutVariant: first.layoutVariant ?? 'one_page',
            aboutLabel: first.aboutLabel ?? '団体詳細',
            reserveLabel: first.reserveLabel ?? '予約画面',
            blogLabel: first.blogLabel ?? 'ブログ',
            seoTitle: first.seoTitle ?? '',
            seoDescription: first.seoDescription ?? '',
            status: 'published',
          });
        } else {
          setForm({
            ...emptyForm,
            title: tenantName,
            slug: tenantSlug,
            subtitle: '',
            body: tenantData.description ?? '',
            imageUrls: [],
            dividerText: '',
            textColor: '#111827',
            accentColor: '#06C755',
            backgroundColor: '#F7F8FA',
            fontFamily: 'mincho',
            titleSize: 'large',
            titleAlign: 'left',
            bodySize: 'base',
            layoutVariant: 'one_page',
            aboutLabel: '団体詳細',
            reserveLabel: '予約画面',
            blogLabel: 'ブログ',
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
      setForm((prev) => {
        const nextImages = [...(prev.imageUrls ?? []), url].filter(Boolean).slice(0, 3);
        return { ...prev, imageUrls: nextImages, coverImageUrl: nextImages[0] ?? '' };
      });
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
      coverImageUrl: imageUrls[0]?.trim(),
      imageUrls,
      dividerText: '',
      textColor,
      accentColor,
      backgroundColor,
      fontFamily: form.fontFamily,
      titleSize: form.titleSize,
      titleAlign,
      bodySize: form.bodySize,
      layoutVariant,
      aboutLabel: navLabels.about,
      reserveLabel: navLabels.reserve,
      blogLabel: navLabels.blog,
      status: 'published',
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
        imageUrls: page.imageUrls?.length ? page.imageUrls : page.coverImageUrl ? [page.coverImageUrl] : [],
        dividerText: page.dividerText ?? '',
        textColor: page.textColor ?? '#111827',
        accentColor: page.accentColor ?? '#06C755',
        backgroundColor: page.backgroundColor ?? '#F7F8FA',
        fontFamily: page.fontFamily ?? 'mincho',
        titleSize: page.titleSize ?? 'large',
        titleAlign: page.titleAlign ?? 'left',
        bodySize: page.bodySize ?? 'base',
        layoutVariant: page.layoutVariant ?? 'one_page',
        aboutLabel: page.aboutLabel ?? '団体詳細',
        reserveLabel: page.reserveLabel ?? '予約画面',
        blogLabel: page.blogLabel ?? 'ブログ',
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-white p-1">
            {layoutOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, layoutVariant: option.value }))}
                className={`rounded-md px-3 py-2 text-sm font-bold transition ${
                  layoutVariant === option.value
                    ? 'text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
                style={layoutVariant === option.value ? { backgroundColor: accentColor } : undefined}
              >
                {option.label}
              </button>
            ))}
          </div>
          {previewUrl && (
            <>
              <Link
                href={previewUrl}
                target="_blank"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                公開ページ
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(previewUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                {copied ? 'コピー済み' : 'URLコピー'}
              </button>
            </>
          )}
          <button
            form="public-site-editor-settings"
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#06C755] px-5 py-2 text-sm font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <SaveToast show={saved} />
      <style jsx global>{`
        @keyframes public-site-slide {
          0%, 28% { transform: translateX(0); }
          34%, 62% { transform: translateX(-100%); }
          68%, 96% { transform: translateX(-200%); }
          100% { transform: translateX(0); }
        }
      `}</style>

      <div className="relative">
        <form
          id="public-site-editor-settings"
          onSubmit={handleSubmit}
          className={`${settingsOpen ? 'fixed inset-x-4 bottom-4 z-50 max-h-[82vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-2xl md:left-auto md:right-6 md:w-[420px]' : 'hidden'}`}
        >
          <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
            <p className="text-sm font-bold text-gray-900">編集</p>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="rounded-lg px-3 py-1 text-sm font-bold text-gray-500 hover:bg-gray-100"
            >
              閉じる
            </button>
          </div>
          <div className="space-y-5">
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
            <label className="mb-2 block text-sm font-medium text-gray-700">ボタン・ナビ名</label>
            <div className="grid gap-2">
              <input
                value={form.aboutLabel ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, aboutLabel: e.target.value }))}
                placeholder="団体詳細"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
              <input
                value={form.reserveLabel ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, reserveLabel: e.target.value }))}
                placeholder="予約画面"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
              <input
                value={form.blogLabel ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, blogLabel: e.target.value }))}
                placeholder="ブログ"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">背景</label>
            <div className="flex flex-wrap items-center gap-2">
              {backgroundOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, backgroundColor: option.value }))}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${
                    backgroundColor.toLowerCase() === option.value.toLowerCase()
                      ? 'border-[#06C755] bg-green-50 text-gray-900'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: option.value }} />
                  {option.label}
                </button>
              ))}
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setForm((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                className="h-10 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">メイン画像</label>
            <label className={`flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 px-3 py-6 text-sm font-bold text-gray-600 hover:border-[#06C755] ${(uploading || imageUrls.length >= 3) ? 'opacity-50' : ''}`}>
              <input
                type="file"
                accept="image/*"
                disabled={uploading || imageUrls.length >= 3}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageFile(file);
                  e.currentTarget.value = '';
                }}
                className="hidden"
              />
              {uploading ? 'アップロード中...' : imageUrls.length >= 3 ? '画像は3枚まで' : '画像を挿入'}
            </label>
            {imageUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {imageUrls.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => setForm((prev) => {
                      const nextImages = (prev.imageUrls ?? []).filter((_, imageIndex) => imageIndex !== index);
                      return { ...prev, imageUrls: nextImages, coverImageUrl: nextImages[0] ?? '' };
                    })}
                    className="group relative aspect-video overflow-hidden rounded-lg border border-gray-200"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 hidden items-center justify-center bg-black/50 text-xs font-bold text-white group-hover:flex">
                      削除
                    </span>
                  </button>
                ))}
              </div>
            )}
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

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#06C755] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>
          </div>
        </form>

        <aside className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm" style={{ fontFamily, backgroundColor }}>
            {layoutVariant === 'one_page' && (
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-xs font-bold">
                <span style={{ color: textColor }}>{displayName}</span>
              </div>
            )}
            {layoutVariant === 'hamburger' && (
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="text-xs font-bold" style={{ color: textColor }}>{displayName}</span>
                <details className="relative">
                  <summary className="flex cursor-pointer list-none flex-col gap-1">
                    <span className="h-0.5 w-6 rounded-full bg-gray-500" />
                    <span className="h-0.5 w-6 rounded-full bg-gray-500" />
                    <span className="h-0.5 w-6 rounded-full bg-gray-500" />
                  </summary>
                  <div className="absolute right-0 top-7 z-20 w-36 rounded-lg bg-white p-2 text-xs font-bold text-gray-600 shadow-lg ring-1 ring-gray-100">
                    {navItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setActiveSection(item.key)}
                        className="block w-full rounded px-3 py-2 text-left hover:bg-gray-50"
                      >
                        {navLabels[item.key]}
                      </button>
                    ))}
                  </div>
                </details>
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
              {imageUrls.length > 0 ? (
                <div className="relative h-64 overflow-hidden bg-gray-100">
                  <div
                    className="flex h-full"
                    style={{
                      width: `${imageUrls.length * 100}%`,
                      animation: imageUrls.length >= 3 ? 'public-site-slide 12s infinite' : undefined,
                    }}
                  >
                    {imageUrls.map((url, index) => (
                      <img
                        key={`${url}-${index}`}
                        src={url}
                        alt=""
                        className="h-full object-cover"
                        style={{ width: `${100 / imageUrls.length}%` }}
                      />
                    ))}
                  </div>
                  {imageUrls.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {imageUrls.map((url, index) => (
                        <span key={`${url}-dot-${index}`} className="h-1.5 w-1.5 rounded-full bg-white/80" />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center bg-gray-100 text-4xl font-bold text-gray-300">
                  {uploading ? '...' : displayName.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="space-y-4 p-5">
              {layoutVariant === 'one_page' && (
                <nav className="rounded-lg bg-gray-50 p-3">
                  <p className="mb-2 text-xs font-bold text-gray-400">目次</p>
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    {navItems.map((item) => (
                      <a key={item.key} href={`#preview-${item.key}`} className="rounded-full bg-white px-3 py-1 text-gray-600 ring-1 ring-gray-100">
                        {navLabels[item.key]}
                      </a>
                    ))}
                  </div>
                </nav>
              )}
              {layoutVariant === 'tabs' && (
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  {navItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveSection(item.key)}
                      className={`rounded-full px-3 py-1 ${activeSection === item.key ? 'text-white' : 'bg-gray-100 text-gray-500'}`}
                      style={activeSection === item.key ? { backgroundColor: accentColor } : undefined}
                    >
                      {navLabels[item.key]}
                    </button>
                  ))}
                </div>
              )}
              {(layoutVariant === 'one_page' || activeSection === 'about') && (
                <section id="preview-about" className="space-y-4">
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
                </section>
              )}
              {(layoutVariant === 'one_page' || activeSection === 'blog') && (
                <section id="preview-blog" className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-bold text-gray-900">{navLabels.blog}</p>
                  <p className="mt-2 text-sm leading-7 text-gray-500">活動日記やお知らせを表示するエリアです。</p>
                </section>
              )}
              {(layoutVariant === 'one_page' || activeSection === 'reserve') && (
                <section id="preview-reserve" className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-bold text-gray-900">{navLabels.reserve}</p>
                  <p className="mt-2 text-sm leading-7 text-gray-500">募集中のイベントや予約ボタンを表示します。</p>
                  <button type="button" className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: accentColor }}>
                    {navLabels.reserve}
                  </button>
                </section>
              )}
            </div>
            {layoutVariant === 'one_page' && (
              <div className="border-t border-gray-100 px-4 py-3 text-center text-xs text-gray-400">
                {displayName}
              </div>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="absolute bottom-4 right-4 rounded-full bg-gray-950/90 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-gray-950"
            >
              編集
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
