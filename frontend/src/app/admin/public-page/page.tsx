'use client';

import { useEffect, useRef, useState } from 'react';
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
  navColor: '#F3F4F6',
  imageLayout: 'slider',
  reserveViewStyle: 'calendar',
  fontFamily: 'mincho',
  titleSize: 'large',
  titleAlign: 'left',
  bodySize: 'base',
  layoutVariant: 'static',
  buttonStyle: 'rounded',
  headerText: '',
  footerText: '',
  aboutLabel: '団体詳細',
  reserveLabel: '予約する',
  blogLabel: 'ブログ',
  seoTitle: '',
  seoDescription: '',
  status: 'published',
};

const fontOptions = [
  { label: '明朝', value: 'mincho', family: '"Yu Mincho", "Hiragino Mincho ProN", serif' },
  { label: '手書き', value: 'handwriting', family: '"Hachi Maru Pop", "Comic Sans MS", "Yu Gothic", cursive' },
  { label: '強調', value: 'marker', family: '"Arial Rounded MT Bold", "Arial Black", "Yu Gothic", sans-serif' },
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

const buttonStyleOptions = [
  { label: 'まる枠', value: 'pill' },
  { label: '四角枠', value: 'square' },
  { label: '角丸', value: 'rounded' },
  { label: 'お洒落枠', value: 'stylish' },
  { label: 'ゴージャス', value: 'gorgeous' },
];

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

type FocusedBlock = 'subtitle' | 'body' | null;

function TextToolbar({
  block,
  form,
  onChange,
}: {
  block: FocusedBlock;
  form: PublicPageInput;
  onChange: (patch: Partial<PublicPageInput>) => void;
}) {
  if (!block) return null;
  const sizeOptions = block === 'subtitle' ? titleSizeOptions : bodySizeOptions;
  const currentSize = block === 'subtitle' ? form.titleSize : form.bodySize;
  const sizeKey = block === 'subtitle' ? 'titleSize' : 'bodySize';
  return (
    <div className="absolute -top-11 left-0 z-20 flex items-center gap-1 rounded-xl bg-gray-950 px-2 py-1.5 shadow-xl">
      {fontOptions.map((opt) => (
        <button key={opt.value} type="button"
          onMouseDown={(e) => { e.preventDefault(); onChange({ fontFamily: opt.value }); }}
          className={`rounded-md px-2 py-1 text-xs font-bold transition ${form.fontFamily === opt.value ? 'bg-white text-gray-900' : 'text-white/60 hover:text-white'}`}>
          {opt.label}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-white/20" />
      {sizeOptions.map((opt) => (
        <button key={opt.value} type="button"
          onMouseDown={(e) => { e.preventDefault(); onChange({ [sizeKey]: opt.value }); }}
          className={`rounded-md px-2 py-1 text-xs font-bold transition ${currentSize === opt.value ? 'bg-white text-gray-900' : 'text-white/60 hover:text-white'}`}>
          {opt.label}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-white/20" />
      <input type="color" value={form.textColor ?? '#111827'}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => onChange({ textColor: e.target.value })}
        className="h-6 w-8 cursor-pointer rounded border border-white/20 bg-transparent p-0" title="文字色" />
      <span className="mx-1 h-4 w-px bg-white/20" />
      {alignOptions.map((opt) => (
        <button key={opt.value} type="button"
          onMouseDown={(e) => { e.preventDefault(); onChange({ titleAlign: opt.value }); }}
          className={`rounded-md px-2 py-1 text-xs font-bold transition ${form.titleAlign === opt.value ? 'bg-white text-gray-900' : 'text-white/60 hover:text-white'}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function HeroImages({ imageUrls, displayName, uploading }: { imageUrls: string[]; displayName: string; uploading: boolean }) {
  if (imageUrls.length === 0) return (
    <div className="flex h-52 items-center justify-center bg-gray-100 text-4xl font-bold text-gray-300">
      {uploading ? '...' : displayName.slice(0, 1)}
    </div>
  );
  if (imageUrls.length === 1) return (
    <div className="h-52 overflow-hidden bg-gray-100">
      <img src={imageUrls[0]} alt="" className="h-full w-full object-cover" />
    </div>
  );
  return (
    <div className="relative h-52 overflow-hidden bg-gray-100">
      <div className="flex h-full" style={{ width: `${imageUrls.length * 100}%`, animation: 'public-site-slide 10s infinite' }}>
        {imageUrls.map((url, i) => (
          <img key={`${url}-${i}`} src={url} alt="" className="h-full object-cover" style={{ width: `${100 / imageUrls.length}%` }} />
        ))}
      </div>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
        {imageUrls.map((_, i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/80" />)}
      </div>
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
  const [focusedBlock, setFocusedBlock] = useState<FocusedBlock>(null);

  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);

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
  const titleSizeClass = titleSizeOptions.find((o) => o.value === form.titleSize)?.className ?? titleSizeOptions[1].className;
  const bodySizeClass = bodySizeOptions.find((o) => o.value === form.bodySize)?.className ?? bodySizeOptions[1].className;
  const titleAlign = (['left', 'center', 'right'].includes(form.titleAlign || '') ? form.titleAlign! : 'left') as 'left' | 'center' | 'right';
  const isCategory = form.layoutVariant === 'category';
  const previewBody = form.body.trim() || tenant?.description || '';
  const imageUrls = (form.imageUrls?.length ? form.imageUrls : form.coverImageUrl ? [form.coverImageUrl] : []).filter(Boolean).slice(0, 3);
  const navLabels = {
    about: form.aboutLabel?.trim() || '団体詳細',
    reserve: form.reserveLabel?.trim() || '予約する',
    blog: form.blogLabel?.trim() || 'ブログ',
  };
  const buttonStyle = form.buttonStyle ?? 'rounded';
  const gorgeousColor = '#b8860b';
  const btnBorderColor = buttonStyle === 'gorgeous' ? gorgeousColor : accentColor;

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
            dividerText: first.dividerText ?? '',
            textColor: first.textColor ?? '#111827',
            accentColor: first.accentColor ?? '#06C755',
            backgroundColor: first.backgroundColor ?? '#F7F8FA',
            navColor: first.navColor ?? '#F3F4F6',
            imageLayout: first.imageLayout ?? 'slider',
            reserveViewStyle: first.reserveViewStyle ?? 'calendar',
            fontFamily: first.fontFamily ?? 'mincho',
            titleSize: first.titleSize ?? 'large',
            titleAlign: first.titleAlign ?? 'left',
            bodySize: first.bodySize ?? 'base',
            layoutVariant: variant === 'category' ? 'category' : 'static',
            buttonStyle: (first as any).buttonStyle ?? 'rounded',
            headerText: (first as any).headerText ?? '',
            footerText: (first as any).footerText ?? '',
            aboutLabel: first.aboutLabel ?? '団体詳細',
            reserveLabel: first.reserveLabel ?? '予約する',
            blogLabel: first.blogLabel ?? 'ブログ',
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
        return { ...prev, imageUrls: next, coverImageUrl: next[0] ?? '' };
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
      dividerText: '',
      textColor, accentColor, backgroundColor, navColor,
      imageLayout: form.imageLayout || 'slider',
      fontFamily: form.fontFamily,
      titleSize: form.titleSize,
      titleAlign,
      bodySize: form.bodySize,
      layoutVariant: isCategory ? 'category' : 'static',
      aboutLabel: navLabels.about,
      reserveLabel: navLabels.reserve,
      blogLabel: navLabels.blog,
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

      {/* Settings panel */}
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-4">

        {/* Common: colors + images */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <div>
            <p className="mb-3 text-xs font-bold text-gray-500">カラー</p>
            <div className="flex flex-wrap gap-5">
              {[
                { label: '背景', key: 'backgroundColor' as const, val: backgroundColor },
                { label: 'ボタン', key: 'accentColor' as const, val: accentColor },
                { label: '目次', key: 'navColor' as const, val: navColor },
              ].map(({ label, key, val }) => (
                <label key={key} className="flex flex-col items-center gap-1 cursor-pointer">
                  <span className="text-[11px] text-gray-400">{label}</span>
                  <input type="color" value={val}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold text-gray-500">フォント</p>
            <div className="flex gap-2">
              {fontOptions.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setForm((p) => ({ ...p, fontFamily: opt.value }))}
                  className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${form.fontFamily === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  style={form.fontFamily === opt.value ? { backgroundColor: accentColor, borderColor: accentColor, fontFamily: opt.family } : { fontFamily: opt.family }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold text-gray-500">画像（3枚まで・1枚なら固定、2〜3枚なら自動スライド）</p>
            <div className="flex flex-wrap gap-2">
              {imageUrls.map((url, index) => (
                <button key={`${url}-${index}`} type="button"
                  onClick={() => setForm((prev) => {
                    const next = (prev.imageUrls ?? []).filter((_, i) => i !== index);
                    return { ...prev, imageUrls: next, coverImageUrl: next[0] ?? '' };
                  })}
                  className="group relative h-14 w-20 overflow-hidden rounded-lg border border-gray-200">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 hidden items-center justify-center bg-black/50 text-xs font-bold text-white group-hover:flex">削除</span>
                </button>
              ))}
              {imageUrls.length < 3 && (
                <label className={`flex h-14 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs font-bold text-gray-500 hover:border-[#06C755] hover:text-[#06C755] ${uploading ? 'opacity-50' : ''}`}>
                  <input type="file" accept="image/*" disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageFile(f); e.currentTarget.value = ''; }}
                    className="hidden" />
                  {uploading ? '...' : '+ 追加'}
                </label>
              )}
            </div>
          </div>
        </div>

        {/* カテゴリー型 settings */}
        {isCategory && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
            <div>
              <p className="mb-2 text-xs font-bold text-gray-500">ボタン名称</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { field: 'aboutLabel' as const, label: '団体詳細' },
                  { field: 'reserveLabel' as const, label: '予約する' },
                  { field: 'blogLabel' as const, label: 'ブログ' },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <p className="mb-1 text-[11px] text-gray-400">{label}</p>
                    <input value={(form[field] as string) ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                      placeholder={label}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-bold text-gray-500">ボタン枠</p>
              <div className="flex flex-wrap gap-2">
                {buttonStyleOptions.map((opt) => {
                  const selected = buttonStyle === opt.value;
                  const isGorgeous = opt.value === 'gorgeous';
                  const shape = opt.value === 'pill' ? 'rounded-full border-2'
                    : opt.value === 'square' ? 'rounded-none border-2'
                    : opt.value === 'stylish' ? 'rounded-lg border border-dashed'
                    : opt.value === 'gorgeous' ? 'rounded-xl border-4 border-double shadow-sm'
                    : 'rounded-xl border-2';
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => setForm((p) => ({ ...p, buttonStyle: opt.value }))}
                      className={`px-4 py-2 text-xs font-bold transition ${shape} ${selected ? 'text-white' : 'hover:bg-gray-50'}`}
                      style={selected
                        ? { backgroundColor: isGorgeous ? gorgeousColor : accentColor, borderColor: isGorgeous ? gorgeousColor : accentColor }
                        : { borderColor: isGorgeous ? gorgeousColor : '#d1d5db', color: isGorgeous ? gorgeousColor : '#6b7280' }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 静止サイト型 settings */}
        {!isCategory && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
            <div>
              <p className="mb-1 text-xs font-bold text-gray-500">ヘッダーテキスト（任意）</p>
              <input value={form.headerText ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, headerText: e.target.value }))}
                placeholder="団体のキャッチコピーなど"
                maxLength={300}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            </div>
            <div>
              <p className="mb-2 text-xs font-bold text-gray-500">目次ラベル</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { field: 'aboutLabel' as const, label: '団体詳細' },
                  { field: 'reserveLabel' as const, label: '予約する' },
                  { field: 'blogLabel' as const, label: 'ブログ' },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <p className="mb-1 text-[11px] text-gray-400">{label}</p>
                    <input value={(form[field] as string) ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                      placeholder={label}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-bold text-gray-500">フッターテキスト（任意）</p>
              <input value={form.footerText ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, footerText: e.target.value }))}
                placeholder="お問い合わせ先・SNSなど"
                maxLength={300}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            </div>
          </div>
        )}
      </div>

      {/* Slide animation */}
      <style jsx global>{`
        @keyframes public-site-slide {
          0%, 30% { transform: translateX(0); }
          36%, 64% { transform: translateX(-100%); }
          70%, 98% { transform: translateX(-200%); }
          100% { transform: translateX(0); }
        }
      `}</style>

      {/* Preview */}
      <div className="mx-auto max-w-3xl px-4">
        <p className="mb-2 text-center text-[11px] text-gray-400">プレビュー</p>
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm" style={{ fontFamily, backgroundColor }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void handleImageFile(f); }}>

          {/* カテゴリー型 preview */}
          {isCategory && (
            <div className="flex flex-col items-center">
              <HeroImages imageUrls={imageUrls} displayName={displayName} uploading={uploading} />
              <div className="flex w-full flex-col items-center px-6 py-10">
              {tenantIcon ? (
                <img src={tenantIcon} alt={displayName} className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white" style={{ backgroundColor: accentColor }}>
                  {displayName.slice(0, 1)}
                </div>
              )}
              <p className="mt-4 text-xl font-bold" style={{ color: textColor }}>{displayName}</p>
              {form.subtitle?.trim() && (
                <p className="mt-1 text-sm opacity-70" style={{ color: textColor }}>{form.subtitle}</p>
              )}
              <div className="mt-8 flex w-full max-w-lg flex-wrap justify-center gap-3">
                {[navLabels.about, navLabels.reserve, navLabels.blog].map((label) => (
                  <div key={label}
                    className={`flex-1 min-w-[6rem] px-5 py-4 text-center text-sm font-bold ${getBtnShapeClass(buttonStyle)}`}
                    style={{ borderColor: btnBorderColor, color: btnBorderColor }}>
                    {label}
                  </div>
                ))}
              </div>
              </div>
            </div>
          )}

          {/* 静止サイト型 preview */}
          {!isCategory && (
            <>
              {form.headerText?.trim() && (
                <div className="border-b border-gray-100 px-4 py-2 text-center text-xs font-bold" style={{ backgroundColor: navColor, color: textColor }}>
                  {form.headerText}
                </div>
              )}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="text-sm font-bold" style={{ color: textColor }}>{displayName}</span>
                <div className="flex gap-2 text-xs font-bold">
                  {[navLabels.about, navLabels.blog, navLabels.reserve].map((label) => (
                    <span key={label} className="rounded-full px-3 py-1" style={{ backgroundColor: navColor, color: textColor }}>{label}</span>
                  ))}
                </div>
              </div>
              <HeroImages imageUrls={imageUrls} displayName={displayName} uploading={uploading} />
              <div className="space-y-4 p-5">
                <h2 className={`${titleSizeClass} font-bold leading-tight`} style={{ color: textColor, textAlign: titleAlign }}>{displayName}</h2>
                <div className="relative pt-10">
                  <TextToolbar block={focusedBlock === 'subtitle' ? 'subtitle' : null} form={form} onChange={(patch) => setForm((p) => ({ ...p, ...patch }))} />
                  <p ref={subtitleRef} contentEditable suppressContentEditableWarning
                    onFocus={() => { setFocusedBlock('subtitle'); if (!form.subtitle?.trim() && subtitleRef.current) subtitleRef.current.innerText = ''; }}
                    onBlur={(e) => { setFocusedBlock(null); setForm((p) => ({ ...p, subtitle: e.currentTarget.innerText.trim() })); }}
                    className="min-h-6 rounded px-1 text-sm font-bold leading-6 opacity-75 outline-none focus:bg-gray-50 focus:ring-1 focus:ring-[#06C755]/30"
                    style={{ color: textColor, textAlign: titleAlign }}>
                    {form.subtitle?.trim() || 'サブタイトル（クリックして編集）'}
                  </p>
                </div>
                <div className="relative pt-10">
                  <TextToolbar block={focusedBlock === 'body' ? 'body' : null} form={form} onChange={(patch) => setForm((p) => ({ ...p, ...patch }))} />
                  <p ref={bodyRef} contentEditable suppressContentEditableWarning
                    onFocus={() => { setFocusedBlock('body'); if (!previewBody && bodyRef.current) bodyRef.current.innerText = ''; }}
                    onBlur={(e) => { setFocusedBlock(null); setForm((p) => ({ ...p, body: e.currentTarget.innerText })); }}
                    className={`${bodySizeClass} min-h-32 whitespace-pre-wrap rounded px-1 opacity-85 outline-none focus:bg-gray-50 focus:ring-1 focus:ring-[#06C755]/30`}
                    style={{ color: textColor }}>
                    {previewBody || '団体説明（クリックして編集）'}
                  </p>
                </div>
                <section className="rounded-lg p-4" style={{ backgroundColor: navColor }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">必須 — 予約セクション</p>
                  <p className="text-sm font-bold" style={{ color: textColor }}>{navLabels.reserve}</p>
                  <p className="mt-1 text-xs text-gray-400">予約カレンダー・カード・スレッドが表示されます</p>
                </section>
                <section className="rounded-lg p-4" style={{ backgroundColor: navColor }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">必須 — ブログセクション</p>
                  <p className="text-sm font-bold" style={{ color: textColor }}>{navLabels.blog}</p>
                  <p className="mt-1 text-xs text-gray-400">公開した記事が表示されます</p>
                </section>
              </div>
              {form.footerText?.trim() && (
                <div className="border-t border-gray-100 px-4 py-3 text-center text-xs" style={{ backgroundColor: navColor, color: textColor }}>
                  {form.footerText}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </form>
  );
}
