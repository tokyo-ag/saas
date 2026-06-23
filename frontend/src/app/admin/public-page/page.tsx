'use client';

import { useEffect, useState } from 'react';
import { api, PublicPageInput, Tenant } from '@/lib/api';
import { SITE_URL } from '@/lib/config';
import { SaveToast } from '@/components/ui/SaveToast';
import { ReservationViewShowcase } from '@/components/public/ReservationViewShowcase';

const emptyForm: PublicPageInput = {
  title: '',
  slug: '',
  subtitle: '',
  body: '',
  coverImageUrl: '',
  imageUrls: [],
  imageCaptions: [],
  dividerText: '',
  textColor: '#111827',
  accentColor: '#06C755',
  backgroundColor: '#F7F8FA',
  navColor: '#F3F4F6',
  imageLayout: 'slider',
  heroImageMode: 'fixed',
  heroOverlayOpacity: 0,
  heroOverlayColor: '#000000',
  reserveViewStyle: 'calendar',
  fontFamily: 'mincho',
  titleSize: 'large',
  titleAlign: 'left',
  bodySize: 'base',
  layoutVariant: 'static',
  buttonStyle: 'rounded',
  buttonLayout: 'grid2x2',
  buttonOpacity: 100,
  headerText: '',
  footerText: '',
  aboutLabel: '団体詳細',
  reserveLabel: '予約する',
  blogLabel: 'ブログ',
  contactLabel: 'お問い合わせ',
  seoTitle: '',
  seoDescription: '',
  status: 'published',
};

const fontOptions = [
  { label: '明朝', value: 'mincho', family: '"Yu Mincho", "Hiragino Mincho ProN", serif' },
  { label: '手書き', value: 'handwriting', family: '"Hachi Maru Pop", "Comic Sans MS", "Yu Gothic", cursive' },
  { label: '強調', value: 'marker', family: '"Arial Rounded MT Bold", "Arial Black", "Yu Gothic", sans-serif' },
];

const bodySizeOptions = [
  { label: '小', value: 'small', className: 'text-sm leading-7' },
  { label: '標準', value: 'base', className: 'text-base leading-8' },
  { label: '大', value: 'large', className: 'text-lg leading-9' },
];

const PASTEL_COLORS = [
  { label: 'ライト', value: '#F7F8FA' },
  { label: 'ピンク', value: '#FFF0F5' },
  { label: 'ミント', value: '#F0FFF8' },
  { label: 'スカイ', value: '#EFF6FF' },
  { label: 'クリーム', value: '#FFFBEB' },
  { label: 'ラベンダー', value: '#FAF5FF' },
  { label: 'ピーチ', value: '#FFF7ED' },
  { label: 'ホワイト', value: '#FFFFFF' },
];

const BTN_SHAPE_OPTIONS = [
  { label: 'まる枠', value: 'pill' },
  { label: '四角', value: 'square' },
  { label: '角丸', value: 'rounded' },
  { label: 'お洒落', value: 'stylish' },
  { label: 'ゴージャス', value: 'gorgeous' },
];

const HERO_IMAGE_MODE_OPTIONS = [
  { label: '固定', value: 'fixed' },
  { label: 'スライダー', value: 'slider' },
  { label: '横並び', value: 'grid' },
];

const BUTTON_LAYOUT_OPTIONS = [
  { label: '2×2', value: 'grid2x2' },
  { label: '1×4', value: 'row1x4' },
];

const TONE_COLORS = [
  { label: '黒', value: '#000000' },
  { label: '白', value: '#FFFFFF' },
  { label: '緑', value: '#064E3B' },
  { label: '紺', value: '#172554' },
  { label: 'ピンク', value: '#BE185D' },
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

function getBtnShapeClass(style: string | null | undefined) {
  switch (style) {
    case 'pill': return 'rounded-full border-2';
    case 'square': return 'rounded-none border-2';
    case 'stylish': return 'rounded-lg border border-dashed';
    case 'gorgeous': return 'rounded-xl border-4 border-double shadow-md';
    default: return 'rounded-xl border-2';
  }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9぀-ヿ㐀-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function clampPercent(value: number | string | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function HeaderImagePreview({
  images,
  captions,
  mode,
  overlayColor,
  overlayOpacity,
  className = 'aspect-[16/9]',
}: {
  images: string[];
  captions: string[];
  mode: string;
  overlayColor: string;
  overlayOpacity: number;
  className?: string;
}) {
  const list = (mode === 'fixed' || mode === 'auto' ? images.slice(0, 1) : images.slice(0, 3));
  if (!list.length) return null;

  const opacity = clampPercent(overlayOpacity) / 100;
  const overlayStyle = { backgroundColor: overlayColor, opacity };
  const useGrid = mode === 'grid' && list.length > 1;

  if (useGrid) {
    return (
      <div className={`grid grid-cols-3 gap-2 overflow-hidden ${className}`}>
        {list.map((url, i) => (
          <div key={`${url}-${i}`} className="relative h-full overflow-hidden rounded-xl bg-gray-100">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0" style={overlayStyle} />
            {captions[i]?.trim() && (
              <p className="absolute bottom-2 left-2 right-2 rounded bg-white/85 px-2 py-1 text-[11px] font-bold text-gray-900">
                {captions[i]}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  const animation = list.length >= 3
    ? 'public-site-slide-3 12s infinite'
    : list.length === 2
      ? 'public-site-slide-2 9s infinite'
      : undefined;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gray-100 ${className}`}>
      <div className="flex h-full" style={{ width: `${list.length * 100}%`, animation }}>
        {list.map((url, i) => (
          <div key={`${url}-${i}`} className="relative h-full shrink-0" style={{ width: `${100 / list.length}%` }}>
            <img src={url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0" style={overlayStyle} />
            {captions[i]?.trim() && (
              <p className="absolute bottom-4 left-4 right-4 rounded bg-white/85 px-3 py-2 text-xs font-bold text-gray-900">
                {captions[i]}
              </p>
            )}
          </div>
        ))}
      </div>
      {list.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {list.map((_, i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/80 shadow-sm" />)}
        </div>
      )}
    </div>
  );
}

export default function AdminPublicPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<PublicPageInput>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const tenantCode = tenant?.code ?? tenant?.id ?? '';
  const displayName = tenant?.lineDisplayName ?? tenant?.name ?? '公開サイト';
  const tenantIcon = tenant?.iconUrl ?? tenant?.linePictureUrl ?? null;
  const generatedSlug = slugify(displayName) || slugify(tenantCode) || 'home';
  const previewUrl = tenantCode ? `${SITE_URL}/clubs/${tenantCode}/${generatedSlug}` : '';
  const textColor = form.textColor?.trim() || '#111827';
  const accentColor = form.accentColor?.trim() || '#06C755';
  const backgroundColor = form.backgroundColor?.trim() || '#F7F8FA';
  const navColor = form.navColor?.trim() || '#F3F4F6';
  const fontFamily = fontOptions.find((o) => o.value === form.fontFamily)?.family ?? fontOptions[0].family;
  const bodySizeClass = bodySizeOptions.find((o) => o.value === form.bodySize)?.className ?? bodySizeOptions[1].className;
  const titleAlign = (['left', 'center', 'right'].includes(form.titleAlign || '') ? form.titleAlign! : 'left') as 'left' | 'center' | 'right';
  const isCategory = form.layoutVariant === 'category';
  const previewBody = form.body.trim() || tenant?.description || '';
  const imageUrls = (form.imageUrls?.length ? form.imageUrls : form.coverImageUrl ? [form.coverImageUrl] : []).filter(Boolean).slice(0, 3);
  const imageCaptions = imageUrls.map((_, i) => (form.imageCaptions?.[i] ?? '').slice(0, 80));
  const rawHeroImageMode = form.heroImageMode || 'fixed';
  const heroImageMode = rawHeroImageMode === 'auto'
    ? 'fixed'
    : ['fixed', 'slider', 'grid'].includes(rawHeroImageMode)
      ? rawHeroImageMode
      : 'fixed';
  const heroOverlayOpacity = clampPercent(form.heroOverlayOpacity);
  const heroOverlayColor = form.heroOverlayColor?.trim() || '#000000';
  const navLabels = {
    about: form.aboutLabel?.trim() || '団体詳細',
    reserve: form.reserveLabel?.trim() || '予約する',
    blog: form.blogLabel?.trim() || 'ブログ',
    contact: form.contactLabel?.trim() || 'お問い合わせ',
  };
  const buttonStyle = form.buttonStyle ?? 'rounded';
  const buttonLayout = form.buttonLayout === 'row1x4' ? 'row1x4' : 'grid2x2';
  const buttonOpacity = clampPercent(form.buttonOpacity ?? 100);
  const buttonOpacityStyle = { opacity: buttonOpacity / 100 };
  const previewButtonLayoutClass = buttonLayout === 'row1x4' ? 'grid grid-cols-4' : 'grid grid-cols-2';
  const previewButtonSizeClass = buttonLayout === 'row1x4'
    ? 'h-12 px-2 text-xs leading-tight'
    : 'h-14 px-3 text-sm leading-tight';

  useEffect(() => {
    Promise.all([api.tenant.get(), api.publicPages.list()])
      .then(([tenantData, pageData]) => {
        setTenant(tenantData);
        const tenantName = tenantData.lineDisplayName ?? tenantData.name;
        const tenantSlug = slugify(tenantName) || slugify(tenantData.code ?? tenantData.id) || 'home';
        const first = pageData[0];
        if (first) {
          setSelectedId(first.id);
          const variant = first.layoutVariant;
          setForm({
            title: tenantName, slug: tenantSlug,
            subtitle: first.subtitle ?? '',
            body: first.body,
            coverImageUrl: first.coverImageUrl ?? '',
            imageUrls: first.imageUrls?.length ? first.imageUrls : first.coverImageUrl ? [first.coverImageUrl] : [],
            imageCaptions: first.imageCaptions ?? [],
            dividerText: first.dividerText ?? '',
            textColor: first.textColor ?? '#111827',
            accentColor: first.accentColor ?? '#06C755',
            backgroundColor: first.backgroundColor ?? '#F7F8FA',
            navColor: first.navColor ?? '#F3F4F6',
            imageLayout: first.imageLayout ?? 'slider',
            heroImageMode: first.heroImageMode === 'auto' ? 'fixed' : first.heroImageMode ?? 'fixed',
            heroOverlayOpacity: first.heroOverlayOpacity ?? 0,
            heroOverlayColor: first.heroOverlayColor ?? '#000000',
            reserveViewStyle: first.reserveViewStyle ?? 'calendar',
            fontFamily: first.fontFamily ?? 'mincho',
            titleSize: first.titleSize ?? 'large',
            titleAlign: first.titleAlign ?? 'left',
            bodySize: first.bodySize ?? 'base',
            layoutVariant: variant === 'category' ? 'category' : 'static',
            buttonStyle: (first as any).buttonStyle ?? 'rounded',
            buttonLayout: first.buttonLayout ?? 'grid2x2',
            buttonOpacity: first.buttonOpacity ?? 100,
            headerText: (first as any).headerText ?? '',
            footerText: (first as any).footerText ?? '',
            aboutLabel: first.aboutLabel ?? '団体詳細',
            reserveLabel: first.reserveLabel ?? '予約する',
            blogLabel: first.blogLabel ?? 'ブログ',
            contactLabel: first.contactLabel ?? 'お問い合わせ',
            seoTitle: first.seoTitle ?? '',
            seoDescription: first.seoDescription ?? '',
            status: 'published',
          });
        } else {
          setForm({ ...emptyForm, title: tenantName, slug: tenantSlug, body: tenantData.description ?? '' });
        }
      })
      .catch((err: any) => setError(err?.message ?? '読み込みに失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  async function handleImageFile(file: File) {
    setUploading(true); setError('');
    try {
      const url = await uploadFile(file);
      setForm((prev) => {
        const next = [...(prev.imageUrls ?? []), url].filter(Boolean).slice(0, 3);
        const captions = [...(prev.imageCaptions ?? []), ''].slice(0, next.length);
        return { ...prev, imageUrls: next, imageCaptions: captions, coverImageUrl: next[0] ?? '' };
      });
    } catch (err: any) {
      setError(err?.message ?? 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    const payload: PublicPageInput = {
      ...form,
      title: displayName, slug: generatedSlug,
      subtitle: form.subtitle?.trim(),
      coverImageUrl: imageUrls[0]?.trim(),
      imageUrls,
      imageCaptions: imageCaptions.map((caption) => caption.trim()).slice(0, imageUrls.length),
      dividerText: '',
      textColor, accentColor, backgroundColor, navColor,
      imageLayout: form.imageLayout || 'slider',
      heroImageMode,
      heroOverlayOpacity,
      heroOverlayColor,
      fontFamily: form.fontFamily,
      titleSize: form.titleSize,
      titleAlign,
      bodySize: form.bodySize,
      layoutVariant: isCategory ? 'category' : 'static',
      aboutLabel: navLabels.about,
      reserveLabel: navLabels.reserve,
      blogLabel: navLabels.blog,
      contactLabel: navLabels.contact,
      buttonStyle,
      buttonLayout,
      buttonOpacity,
      status: 'published',
      seoTitle: displayName,
      seoDescription: form.body.replace(/[#>*_-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 150),
    };
    try {
      const page = selectedId
        ? await api.publicPages.update(selectedId, payload)
        : await api.publicPages.create(payload);
      setSelectedId(page.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message ?? '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="px-4 py-12 text-center text-sm text-gray-400">読み込み中...</div>;

  return (
    <form onSubmit={handleSubmit} className="pb-20">
      <SaveToast show={saved} />

      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-base font-bold text-gray-900">公開サイト</h1>
        <div className="flex rounded-lg border border-gray-200 p-0.5">
          <button type="button"
            onClick={() => setForm((p) => ({ ...p, layoutVariant: 'category' }))}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${isCategory ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            style={isCategory ? { backgroundColor: accentColor } : undefined}>
            カテゴリー型
          </button>
          <button type="button"
            onClick={() => setForm((p) => ({ ...p, layoutVariant: 'static' }))}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${!isCategory ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            style={!isCategory ? { backgroundColor: accentColor } : undefined}>
            静止サイト型
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {previewUrl && (
            <button type="button"
              onClick={async () => { await navigator.clipboard.writeText(previewUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50">
              {copied ? 'コピー済み' : 'URLコピー'}
            </button>
          )}
          <button type="submit" disabled={saving}
            className="rounded-lg bg-[#06C755] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#05a847] disabled:opacity-50">
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>

      {error && <div className="mx-auto max-w-3xl px-4 pt-3"><div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div></div>}

      <div className="mx-auto grid max-w-[1420px] gap-5 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] xl:grid-cols-[minmax(0,1fr)_minmax(400px,460px)]">
      {/* Settings panel */}
      <section className="space-y-3">

        {/* 背景 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500">背景</p>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400">全体</p>
              <label className="cursor-pointer">
                <input type="color" value={backgroundColor}
                  onChange={(e) => setForm((p) => ({ ...p, backgroundColor: e.target.value }))}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
              </label>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {PASTEL_COLORS.map((c) => (
                <button key={c.value} type="button"
                  onClick={() => setForm((p) => ({ ...p, backgroundColor: c.value }))}
                  title={c.label}
                  className={`h-8 w-8 rounded-full border-2 transition hover:scale-110 ${backgroundColor === c.value ? 'border-gray-500 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c.value, boxShadow: '0 0 0 1px #e5e7eb' }} />
              ))}
            </div>
          </div>
        </div>

        {/* 内容 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 text-xs font-bold text-gray-500">内容</p>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-gray-400">サブタイトル</span>
              <input value={form.subtitle ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                placeholder="例：初心者歓迎の社会人サークル"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-gray-400">団体説明</span>
              <textarea value={form.body}
                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                rows={7}
                placeholder="団体の雰囲気や参加者に伝えたい内容"
                className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm leading-7 focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            </label>
          </div>
        </div>

        {/* テキスト */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 text-xs font-bold text-gray-500">テキスト</p>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-bold text-gray-400">フォント</p>
              <div className="flex flex-wrap gap-2">
                {fontOptions.map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm((p) => ({ ...p, fontFamily: opt.value }))}
                    className={`rounded-full border px-4 py-2 text-xs font-bold transition ${form.fontFamily === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    style={form.fontFamily === opt.value
                      ? { backgroundColor: accentColor, borderColor: accentColor, fontFamily: opt.family }
                      : { fontFamily: opt.family }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold text-gray-400">本文サイズ</p>
              <div className="flex flex-wrap gap-2">
                {bodySizeOptions.map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm((p) => ({ ...p, bodySize: opt.value }))}
                    className={`rounded-full border px-4 py-2 text-xs font-bold transition ${form.bodySize === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    style={form.bodySize === opt.value ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ラベル名称 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-bold text-gray-500">ラベル名称</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { field: 'aboutLabel' as const, placeholder: '団体詳細' },
              { field: 'reserveLabel' as const, placeholder: '予約する' },
              { field: 'blogLabel' as const, placeholder: 'ブログ' },
              { field: 'contactLabel' as const, placeholder: 'お問い合わせ' },
            ].map(({ field, placeholder }) => (
              <input key={field} value={(form[field] as string) ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            ))}
          </div>
        </div>

        {/* ボタン */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 text-xs font-bold text-gray-500">ボタン</p>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-bold text-gray-400">配置</p>
              <div className="flex flex-wrap gap-2">
                {BUTTON_LAYOUT_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm((p) => ({ ...p, buttonLayout: opt.value }))}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition ${buttonLayout === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    style={buttonLayout === opt.value ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold text-gray-400">形</p>
              <div className="flex flex-wrap gap-2">
                {BTN_SHAPE_OPTIONS.map((opt) => {
                  const selected = buttonStyle === opt.value;
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => setForm((p) => ({ ...p, buttonStyle: opt.value }))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${selected ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      style={selected ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ヘッダー */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-gray-500">ヘッダー</p>
            <span className="text-[11px] font-bold text-gray-400">{imageUrls.length}/3</span>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {HERO_IMAGE_MODE_OPTIONS.map((opt) => (
              <button key={opt.value} type="button"
                onClick={() => setForm((p) => ({ ...p, heroImageMode: opt.value }))}
                className={`rounded-full border px-4 py-2 text-xs font-bold transition ${heroImageMode === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                style={heroImageMode === opt.value ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                {opt.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {imageUrls.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className="rounded-lg border border-gray-200 bg-gray-50 p-2"
              >
                <div className="group relative h-24 overflow-hidden rounded-lg bg-gray-100">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button type="button"
                    onClick={() => setForm((prev) => {
                      const next = (prev.imageUrls ?? []).filter((_, idx) => idx !== i);
                      const captions = (prev.imageCaptions ?? []).filter((_, idx) => idx !== i).slice(0, next.length);
                      return { ...prev, imageUrls: next, imageCaptions: captions, coverImageUrl: next[0] ?? '' };
                    })}
                    className="absolute inset-0 hidden items-center justify-center bg-black/50 text-xs font-bold text-white group-hover:flex">
                    削除
                  </button>
                </div>
                <input
                  value={imageCaptions[i] ?? ''}
                  onChange={(e) => setForm((prev) => {
                    const captions = [...(prev.imageCaptions ?? [])];
                    captions[i] = e.target.value.slice(0, 80);
                    return { ...prev, imageCaptions: captions.slice(0, 3) };
                  })}
                  placeholder="画像説明（任意）"
                  className="mt-2 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>
            ))}
            {imageUrls.length < 3 && (
              <label className={`flex min-h-[8.7rem] cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs font-bold text-gray-400 hover:border-[#06C755] hover:text-[#06C755] ${uploading ? 'opacity-50' : ''}`}>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleImageFile(f);
                    e.currentTarget.value = '';
                  }}
                  className="hidden"
                />
                {uploading ? '...' : '+ 追加'}
              </label>
            )}
          </div>
          {/* カラー・透明度 統合 */}
          <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-gray-500">
                <span>ナビ背景</span>
                <input type="color" value={navColor}
                  onChange={(e) => setForm((p) => ({ ...p, navColor: e.target.value }))}
                  className="h-9 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-gray-500">
                <span>ボタン色</span>
                <input type="color" value={accentColor}
                  onChange={(e) => setForm((p) => ({ ...p, accentColor: e.target.value }))}
                  className="h-9 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-gray-500">
                <span>文字色</span>
                <input type="color" value={textColor}
                  onChange={(e) => setForm((p) => ({ ...p, textColor: e.target.value }))}
                  className="h-9 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-[11px] font-bold text-gray-400">ボタン透明度 {buttonOpacity}%</span>
              <input type="range" min="20" max="100" step="5" value={buttonOpacity}
                onChange={(e) => setForm((p) => ({ ...p, buttonOpacity: Number(e.target.value) }))}
                className="w-full accent-[#06C755]" />
            </label>
            <div>
              <p className="mb-2 text-[11px] font-bold text-gray-400">画像の色味</p>
              <div className="flex flex-wrap items-center gap-2">
                <input type="color" value={heroOverlayColor}
                  onChange={(e) => setForm((p) => ({ ...p, heroOverlayColor: e.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
                {TONE_COLORS.map((c) => (
                  <button key={c.value} type="button"
                    title={c.label}
                    onClick={() => setForm((p) => ({ ...p, heroOverlayColor: c.value }))}
                    className={`h-8 w-8 rounded-full border-2 ${heroOverlayColor === c.value ? 'border-gray-500' : 'border-transparent'}`}
                    style={{ backgroundColor: c.value, boxShadow: '0 0 0 1px #e5e7eb' }} />
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-2 block text-[11px] font-bold text-gray-400">画像透明度 {heroOverlayOpacity}%</span>
              <input type="range" min="0" max="80" step="5" value={heroOverlayOpacity}
                onChange={(e) => setForm((p) => ({ ...p, heroOverlayOpacity: Number(e.target.value) }))}
                className="w-full accent-[#06C755]" />
            </label>
          </div>
        </div>
      </section>

      {/* Slide animation */}
      <style jsx global>{`
        @keyframes public-site-slide-2 {
          0%, 42% { transform: translateX(0); }
          50%, 92% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes public-site-slide-3 {
          0%, 30% { transform: translateX(0); }
          36%, 64% { transform: translateX(-33.333%); }
          70%, 98% { transform: translateX(-66.666%); }
          100% { transform: translateX(0); }
        }
      `}</style>

      {/* Preview */}
      <aside className="w-full max-w-[430px] justify-self-center lg:sticky lg:top-[73px] lg:self-start">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500">反映後の画面</p>
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-gray-400 ring-1 ring-gray-200">
            {isCategory ? 'カテゴリー型' : '静止サイト型'}
          </span>
        </div>
        <div className="max-h-none overflow-y-auto overflow-x-hidden rounded-2xl bg-gray-100 p-2 shadow-inner lg:max-h-[calc(100vh-6.5rem)]">
        <div className="mx-auto min-w-0 max-w-[390px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style={{ fontFamily, backgroundColor }}>

          {/* カテゴリー型 preview */}
          {isCategory && (
            <div className="flex flex-col items-center space-y-7 px-5 py-9">

              {/* アイコン＋名前 */}
              <div className="flex flex-col items-center gap-2">
                {tenantIcon ? (
                  <img src={tenantIcon} alt={displayName} className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white" style={{ backgroundColor: accentColor }}>
                    {displayName.slice(0, 1)}
                  </div>
                )}
                <p className="text-xl font-bold" style={{ color: textColor }}>{displayName}</p>
              </div>

              <div className="w-full max-w-sm">
                <HeaderImagePreview
                  images={imageUrls}
                  captions={imageCaptions}
                  mode={heroImageMode}
                  overlayColor={heroOverlayColor}
                  overlayOpacity={heroOverlayOpacity}
                  className="h-40"
                />
              </div>

              <div className={`w-full gap-2 ${previewButtonLayoutClass}`}>
                {[navLabels.about, navLabels.reserve, navLabels.blog, navLabels.contact].map((label) => (
                  <div key={label}
                    className={`flex min-w-0 items-center justify-center truncate whitespace-nowrap text-center font-bold ${getBtnShapeClass(buttonStyle)} ${previewButtonSizeClass}`}
                    style={{ borderColor: accentColor, color: accentColor, ...buttonOpacityStyle }}>
                    {label}
                  </div>
                ))}
              </div>

              <div className="w-full max-w-sm">
                <div className="rounded-xl px-5 py-4 shadow-sm ring-1 ring-gray-100" style={{ backgroundColor: navColor }}>
                  <p className="mb-2 text-xs font-bold text-gray-400">{navLabels.about}</p>
                  <p
                    className={`${bodySizeClass} min-h-24 whitespace-pre-wrap opacity-90`}
                    style={{ color: textColor, fontFamily }}>
                    {previewBody || '団体説明'}
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* 静止サイト型 preview */}
          {!isCategory && (
            <>
              <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3">
                <span className="text-sm font-bold leading-5" style={{ color: textColor }}>{displayName}</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                  {[navLabels.about, navLabels.blog, navLabels.reserve, navLabels.contact].map((label) => (
                    <span key={label} className="truncate whitespace-nowrap rounded-full px-3 py-1.5 text-center leading-4" style={{ backgroundColor: navColor, color: textColor, ...buttonOpacityStyle }}>{label}</span>
                  ))}
                </div>
              </div>
              <div className="space-y-4 p-5">
                <h2 className="text-2xl font-bold leading-tight" style={{ color: textColor, textAlign: titleAlign }}>{displayName}</h2>
                {form.subtitle?.trim() && (
                  <p className="text-sm font-bold leading-6 opacity-75" style={{ color: textColor, textAlign: titleAlign }}>
                    {form.subtitle.trim()}
                  </p>
                )}
                <HeaderImagePreview
                  images={imageUrls}
                  captions={imageCaptions}
                  mode={heroImageMode}
                  overlayColor={heroOverlayColor}
                  overlayOpacity={heroOverlayOpacity}
                />
                <div className="rounded-lg p-4" style={{ backgroundColor: navColor }}>
                  <p
                    className={`${bodySizeClass} min-h-32 whitespace-pre-wrap opacity-85`}
                    style={{ color: textColor }}>
                    {previewBody || '団体説明'}
                  </p>
                </div>
                <section className="rounded-lg p-4" style={{ backgroundColor: navColor }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">必須 — 予約セクション</p>
                  <p className="text-sm font-bold" style={{ color: textColor }}>{navLabels.reserve}</p>
                  <ReservationViewShowcase
                    accentColor={accentColor}
                    buttonLabel={navLabels.reserve}
                    viewStyle={form.reserveViewStyle}
                    className="mt-3"
                  />
                </section>
                <section className="rounded-lg p-4" style={{ backgroundColor: navColor }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">必須 — ブログセクション</p>
                  <p className="text-sm font-bold" style={{ color: textColor }}>{navLabels.blog}</p>
                  <p className="mt-1 text-xs text-gray-400">公開した記事が表示されます</p>
                </section>
                <section className="rounded-lg p-4" style={{ backgroundColor: navColor }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">必須 — お問い合わせセクション</p>
                  <p className="text-sm font-bold" style={{ color: textColor }}>{navLabels.contact}</p>
                  <p className="mt-1 text-xs text-gray-400">LINEでの問い合わせが表示されます</p>
                </section>
              </div>
            </>
          )}
        </div>
        </div>
      </aside>
      </div>
    </form>
  );
}
