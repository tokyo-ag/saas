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

const BTN_SIZE_OPTIONS = [
  { label: '小', value: 'small', cls: 'px-3 py-2.5 text-xs min-w-[5rem]' },
  { label: '中', value: 'medium', cls: 'px-5 py-4 text-sm min-w-[6.5rem]' },
  { label: '大', value: 'large', cls: 'px-6 py-5 text-base min-w-[8rem]' },
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

  // UI-only states (not persisted)
  const [btnEditOpen, setBtnEditOpen] = useState(false);
  const [textEditOpen, setTextEditOpen] = useState(false);
  const [btnSize, setBtnSize] = useState('medium');
  const [focusedBody, setFocusedBody] = useState(false);

  const bodyRef = useRef<HTMLParagraphElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

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
  const navLabels = {
    about: form.aboutLabel?.trim() || '団体詳細',
    reserve: form.reserveLabel?.trim() || '予約する',
    blog: form.blogLabel?.trim() || 'ブログ',
    contact: form.contactLabel?.trim() || 'お問い合わせ',
  };
  const buttonStyle = form.buttonStyle ?? 'rounded';
  const btnSizeCls = BTN_SIZE_OPTIONS.find((o) => o.value === btnSize)?.cls ?? BTN_SIZE_OPTIONS[1].cls;

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
      contactLabel: navLabels.contact,
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
    <form onSubmit={handleSubmit} className="pb-20" onClick={() => { setBtnEditOpen(false); setTextEditOpen(false); }}>
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

        {/* 背景 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500">背景</p>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input type="color" value={backgroundColor}
                onChange={(e) => setForm((p) => ({ ...p, backgroundColor: e.target.value }))}
                className="h-10 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
            </label>
            <div className="flex flex-wrap gap-2">
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

        {/* 画像 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-gray-500">画像</p>
            <span className="text-[11px] font-bold text-gray-400">{imageUrls.length}/3</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {imageUrls.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setForm((prev) => {
                  const next = (prev.imageUrls ?? []).filter((_, idx) => idx !== i);
                  return { ...prev, imageUrls: next, coverImageUrl: next[0] ?? '' };
                })}
                className="group relative h-16 w-24 overflow-hidden rounded-lg border border-gray-200"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-0 hidden items-center justify-center bg-black/50 text-xs font-bold text-white group-hover:flex">削除</span>
              </button>
            ))}
            {imageUrls.length < 3 && (
              <label className={`flex h-16 w-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs font-bold text-gray-400 hover:border-[#06C755] hover:text-[#06C755] ${uploading ? 'opacity-50' : ''}`}>
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
        </div>
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
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm" style={{ fontFamily, backgroundColor }}>

          {/* カテゴリー型 preview */}
          {isCategory && (
            <div className="flex flex-col items-center px-6 py-10 space-y-8">

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

              {imageUrls.length > 0 && (
                <div className="relative h-40 w-full max-w-sm overflow-hidden rounded-xl bg-gray-100">
                  <div className="flex h-full" style={{ width: `${imageUrls.length * 100}%`, animation: imageUrls.length >= 2 ? 'public-site-slide 10s infinite' : undefined }}>
                    {imageUrls.map((url, i) => (
                      <img key={`${url}-${i}`} src={url} alt="" className="h-full object-cover" style={{ width: `${100 / imageUrls.length}%` }} />
                    ))}
                  </div>
                  {imageUrls.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {imageUrls.map((_, i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/80" />)}
                    </div>
                  )}
                </div>
              )}

              {/* ボタン行 — 右下に編集ボタン */}
              <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex w-full flex-wrap justify-center gap-3">
                  {[navLabels.about, navLabels.reserve, navLabels.blog, navLabels.contact].map((label) => (
                    <div key={label}
                      className={`text-center font-bold ${getBtnShapeClass(buttonStyle)} ${btnSizeCls}`}
                      style={{ borderColor: accentColor, color: accentColor }}>
                      {label}
                    </div>
                  ))}
                </div>

                {/* ボタン編集ボタン */}
                <button type="button"
                  onClick={() => { setBtnEditOpen((o) => !o); setTextEditOpen(false); }}
                  className="absolute -bottom-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md text-gray-500 hover:text-[#06C755] hover:border-[#06C755] transition z-10">
                  {btnEditOpen ? <CheckIcon /> : <PencilIcon />}
                </button>

                {/* ボタン編集パネル */}
                {btnEditOpen && (
                  <div className="absolute right-0 top-full mt-4 z-30 w-72 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl space-y-4">
                    {/* 枠スタイル */}
                    <div>
                      <p className="mb-2 text-[11px] font-bold text-gray-400">枠スタイル</p>
                      <div className="flex flex-wrap gap-1.5">
                        {BTN_SHAPE_OPTIONS.map((opt) => {
                          const selected = buttonStyle === opt.value;
                          const shapeClass = opt.value === 'pill' ? 'rounded-full border-2'
                            : opt.value === 'square' ? 'rounded-none border-2'
                            : opt.value === 'stylish' ? 'rounded-lg border border-dashed'
                            : opt.value === 'gorgeous' ? 'rounded-xl border-4 border-double'
                            : 'rounded-xl border-2';
                          return (
                            <button key={opt.value} type="button"
                              onClick={() => setForm((p) => ({ ...p, buttonStyle: opt.value }))}
                              className={`px-3 py-1.5 text-xs font-bold transition ${shapeClass} ${selected ? 'text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}
                              style={selected ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* サイズ */}
                    <div>
                      <p className="mb-2 text-[11px] font-bold text-gray-400">ボタンサイズ</p>
                      <div className="flex gap-2">
                        {BTN_SIZE_OPTIONS.map((opt) => (
                          <button key={opt.value} type="button"
                            onClick={() => setBtnSize(opt.value)}
                            className={`flex-1 rounded-lg border py-1.5 text-xs font-bold transition ${btnSize === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            style={btnSize === opt.value ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* ボタン色 */}
                    <div>
                      <p className="mb-2 text-[11px] font-bold text-gray-400">ボタン色（枠＋文字）</p>
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer">
                          <input type="color" value={accentColor}
                            onChange={(e) => setForm((p) => ({ ...p, accentColor: e.target.value }))}
                            className="h-9 w-14 cursor-pointer rounded-lg border border-gray-200 p-1" />
                        </label>
                        <span className="text-xs text-gray-400">{accentColor}</span>
                      </div>
                    </div>
                    {/* 文字色 */}
                    <div>
                      <p className="mb-2 text-[11px] font-bold text-gray-400">テキスト色</p>
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer">
                          <input type="color" value={textColor}
                            onChange={(e) => setForm((p) => ({ ...p, textColor: e.target.value }))}
                            className="h-9 w-14 cursor-pointer rounded-lg border border-gray-200 p-1" />
                        </label>
                        <span className="text-xs text-gray-400">{textColor}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 団体詳細テキスト — 右上に編集ボタン */}
              <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                {/* テキスト編集ボタン */}
                <button type="button"
                  onClick={() => { setTextEditOpen((o) => !o); setBtnEditOpen(false); }}
                  className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md text-gray-500 hover:text-[#06C755] hover:border-[#06C755] transition z-10">
                  {textEditOpen ? <CheckIcon /> : <PencilIcon />}
                </button>

                {/* テキスト編集パネル */}
                {textEditOpen && (
                  <div className="absolute right-0 top-full mt-4 z-30 w-64 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl space-y-4">
                    <div>
                      <p className="mb-2 text-[11px] font-bold text-gray-400">フォント</p>
                      <div className="flex gap-1.5">
                        {fontOptions.map((opt) => (
                          <button key={opt.value} type="button"
                            onClick={() => setForm((p) => ({ ...p, fontFamily: opt.value }))}
                            className={`flex-1 rounded-lg border py-2 text-xs font-bold transition ${form.fontFamily === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            style={form.fontFamily === opt.value
                              ? { backgroundColor: accentColor, borderColor: accentColor, fontFamily: opt.family }
                              : { fontFamily: opt.family }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[11px] font-bold text-gray-400">文字色</p>
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer">
                          <input type="color" value={textColor}
                            onChange={(e) => setForm((p) => ({ ...p, textColor: e.target.value }))}
                            className="h-9 w-14 cursor-pointer rounded-lg border border-gray-200 p-1" />
                        </label>
                        <span className="text-xs text-gray-400">{textColor}</span>
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[11px] font-bold text-gray-400">テキストサイズ</p>
                      <div className="flex gap-1.5">
                        {bodySizeOptions.map((opt) => (
                          <button key={opt.value} type="button"
                            onClick={() => setForm((p) => ({ ...p, bodySize: opt.value }))}
                            className={`flex-1 rounded-lg border py-1.5 text-xs font-bold transition ${form.bodySize === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            style={form.bodySize === opt.value ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-100">
                  <p className="mb-2 text-xs font-bold text-gray-400">{navLabels.about}</p>
                  <p ref={bodyRef}
                    contentEditable suppressContentEditableWarning
                    onFocus={() => setFocusedBody(true)}
                    onBlur={(e) => { setFocusedBody(false); setForm((p) => ({ ...p, body: e.currentTarget.innerText })); }}
                    className={`${bodySizeClass} min-h-24 whitespace-pre-wrap rounded px-1 opacity-90 outline-none focus:bg-gray-50 focus:ring-1 focus:ring-[#06C755]/30`}
                    style={{ color: textColor, fontFamily }}>
                    {previewBody || '団体説明（クリックして編集）'}
                  </p>
                  {!focusedBody && !previewBody && (
                    <p className="mt-2 text-[10px] text-gray-300">クリックで直接編集できます</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* 静止サイト型 preview */}
          {!isCategory && (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="text-sm font-bold" style={{ color: textColor }}>{displayName}</span>
                <div className="flex gap-2 text-xs font-bold">
                  {[navLabels.about, navLabels.blog, navLabels.reserve, navLabels.contact].map((label) => (
                    <span key={label} className="rounded-full px-3 py-1" style={{ backgroundColor: navColor, color: textColor }}>{label}</span>
                  ))}
                </div>
              </div>
              <div className="space-y-4 p-5">
                <h2 className="text-2xl font-bold leading-tight" style={{ color: textColor, textAlign: titleAlign }}>{displayName}</h2>
                <div className="relative">
                  <p ref={subtitleRef} contentEditable suppressContentEditableWarning
                    onBlur={(e) => { setForm((p) => ({ ...p, subtitle: e.currentTarget.innerText.trim() })); }}
                    className="min-h-6 rounded px-1 text-sm font-bold leading-6 opacity-75 outline-none focus:bg-gray-50 focus:ring-1 focus:ring-[#06C755]/30"
                    style={{ color: textColor, textAlign: titleAlign }}>
                    {form.subtitle?.trim() || 'サブタイトル（クリックして編集）'}
                  </p>
                </div>
                {imageUrls.length > 0 && (
                  <div className="relative h-52 overflow-hidden rounded-xl bg-gray-100">
                    <div className="flex h-full" style={{ width: `${imageUrls.length * 100}%`, animation: imageUrls.length >= 2 ? 'public-site-slide 10s infinite' : undefined }}>
                      {imageUrls.map((url, i) => (
                        <img key={`${url}-${i}`} src={url} alt="" className="h-full object-cover" style={{ width: `${100 / imageUrls.length}%` }} />
                      ))}
                    </div>
                    {imageUrls.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                        {imageUrls.map((_, i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/80" />)}
                      </div>
                    )}
                  </div>
                )}
                <div className="relative">
                  <p ref={bodyRef} contentEditable suppressContentEditableWarning
                    onBlur={(e) => { setForm((p) => ({ ...p, body: e.currentTarget.innerText })); }}
                    className={`${bodySizeClass} min-h-32 whitespace-pre-wrap rounded px-1 opacity-85 outline-none focus:bg-gray-50 focus:ring-1 focus:ring-[#06C755]/30`}
                    style={{ color: textColor }}>
                    {previewBody || '団体説明（クリックして編集）'}
                  </p>
                </div>
                {/* フォント・色設定（静止サイト型） */}
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-3">
                  <div>
                    <p className="mb-2 text-[11px] font-bold text-gray-400">フォント</p>
                    <div className="flex gap-2">
                      {fontOptions.map((opt) => (
                        <button key={opt.value} type="button"
                          onClick={() => setForm((p) => ({ ...p, fontFamily: opt.value }))}
                          className={`flex-1 rounded-lg border py-1.5 text-xs font-bold transition ${form.fontFamily === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'}`}
                          style={form.fontFamily === opt.value
                            ? { backgroundColor: accentColor, borderColor: accentColor, fontFamily: opt.family }
                            : { fontFamily: opt.family }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex flex-col items-center gap-1 cursor-pointer">
                      <span className="text-[11px] text-gray-400">ボタン色</span>
                      <input type="color" value={accentColor}
                        onChange={(e) => setForm((p) => ({ ...p, accentColor: e.target.value }))}
                        className="h-9 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
                    </label>
                    <label className="flex flex-col items-center gap-1 cursor-pointer">
                      <span className="text-[11px] text-gray-400">文字色</span>
                      <input type="color" value={textColor}
                        onChange={(e) => setForm((p) => ({ ...p, textColor: e.target.value }))}
                        className="h-9 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
                    </label>
                    <label className="flex flex-col items-center gap-1 cursor-pointer">
                      <span className="text-[11px] text-gray-400">ナビ背景</span>
                      <input type="color" value={navColor}
                        onChange={(e) => setForm((p) => ({ ...p, navColor: e.target.value }))}
                        className="h-9 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
                    </label>
                  </div>
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
    </form>
  );
}
