'use client';

import { useEffect, useRef, useState } from 'react';
import { api, PublicPageInput, Tenant } from '@/lib/api';
import { SITE_URL } from '@/lib/config';
import { SaveToast } from '@/components/ui/SaveToast';
import { ReservationViewShowcase } from '@/components/public/ReservationViewShowcase';

type BlockType = 'text' | 'media-text' | 'profile' | 'feature';
interface Block {
  id: string;
  type: BlockType;
  content: string;
  imageUrl?: string;
  imagePosition?: 'left' | 'right';
}
const BLOCK_LABELS: Record<BlockType, string> = {
  'text': 'テキスト',
  'media-text': 'メディアテキスト',
  'profile': 'プロフィール',
  'feature': 'フィーチャー',
};
function genId() { return Math.random().toString(36).slice(2); }

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
  navOpacity: 100,
  imageLayout: 'slider',
  heroImageMode: 'fixed',
  heroNavPosition: 'below',
  heroOverlayOpacity: 0,
  heroOverlayColor: '#000000',
  reserveViewStyle: 'calendar',
  fontFamily: 'mincho',
  titleFont: '',
  titleColor: '',
  titleSize: 'large',
  titleAlign: 'left',
  subtitleFont: '',
  subtitleSize: 'base',
  subtitleColor: '',
  bodySize: 'base',
  layoutVariant: 'static',
  buttonStyle: 'rounded',
  buttonLayout: 'grid2x2',
  buttonOpacity: 100,
  buttonBgColor: '',
  buttonBgOpacity: 100,
  buttonTextOpacity: 100,
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
  { label: '背景', value: 'background' },
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

function clampPercent(value: number | string | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function hexToRgba(hex: string, opacity: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity / 100})`;
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

  if (mode === 'background') {
    return (
      <div className={`relative overflow-hidden rounded-xl ${className}`}
        style={{ backgroundImage: `url(${list[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0" style={overlayStyle} />
      </div>
    );
  }

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
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const blockUploadRefs = useRef<Record<string, HTMLInputElement | null>>({});
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
  const navOpacity = clampPercent(form.navOpacity ?? 100);
  const navBg = hexToRgba(navColor, navOpacity);
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
    : ['fixed', 'slider', 'grid', 'background'].includes(rawHeroImageMode)
      ? rawHeroImageMode
      : 'fixed';
  const heroOverlayOpacity = clampPercent(form.heroOverlayOpacity);
  const heroOverlayColor = form.heroOverlayColor?.trim() || '#000000';
  const heroOverlayBg = hexToRgba(heroOverlayColor, heroOverlayOpacity);

  const titleFontFamily = (form.titleFont?.trim()
    ? fontOptions.find(f => f.value === form.titleFont)?.family
    : undefined) ?? fontFamily;
  const titleColor = form.titleColor?.trim() || textColor;
  const titleSizeClass = (() => {
    switch (form.titleSize) {
      case 'small': return 'text-base';
      case 'large': return 'text-2xl';
      case 'xl': return 'text-3xl';
      default: return 'text-xl';
    }
  })();
  const subtitleFontFamily = (form.subtitleFont?.trim()
    ? fontOptions.find(f => f.value === form.subtitleFont)?.family
    : undefined) ?? fontFamily;
  const subtitleColor = form.subtitleColor?.trim() || textColor;
  const subtitleSizeClass = (() => {
    switch (form.subtitleSize) {
      case 'small': return 'text-xs';
      case 'large': return 'text-base';
      default: return 'text-sm';
    }
  })();
  const heroNavPosition = form.heroNavPosition === 'inside' ? 'inside' : 'below';
  const navLabels = {
    about: form.aboutLabel?.trim() || '団体詳細',
    reserve: form.reserveLabel?.trim() || '予約する',
    blog: form.blogLabel?.trim() || 'ブログ',
    contact: form.contactLabel?.trim() || 'お問い合わせ',
  };
  const buttonStyle = form.buttonStyle ?? 'rounded';
  const buttonLayout = form.buttonLayout === 'row1x4' ? 'row1x4' : 'grid2x2';
  const buttonOpacity = clampPercent(form.buttonOpacity ?? 100);
  const buttonBgOpacity = clampPercent(form.buttonBgOpacity ?? 100);
  const buttonTextOpacity = clampPercent(form.buttonTextOpacity ?? 100);
  const buttonBgColor = form.buttonBgColor?.trim() || undefined;
  const btnBorderColor = hexToRgba(accentColor, buttonOpacity);
  const btnFillColor = buttonBgColor ? hexToRgba(buttonBgColor, buttonBgOpacity) : undefined;
  const btnTextColor = hexToRgba(textColor, buttonTextOpacity);
  const buttonBgStyle = btnFillColor ? { backgroundColor: btnFillColor } : {};
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
            navOpacity: first.navOpacity ?? 100,
            imageLayout: first.imageLayout ?? 'slider',
            heroImageMode: first.heroImageMode === 'auto' ? 'fixed' : first.heroImageMode ?? 'fixed',
            heroNavPosition: first.heroNavPosition ?? 'below',
            heroOverlayOpacity: first.heroOverlayOpacity ?? 0,
            heroOverlayColor: first.heroOverlayColor ?? '#000000',
            reserveViewStyle: first.reserveViewStyle ?? 'calendar',
            fontFamily: first.fontFamily ?? 'mincho',
            titleFont: first.titleFont ?? '',
            titleColor: first.titleColor ?? '',
            titleSize: first.titleSize ?? 'large',
            titleAlign: first.titleAlign ?? 'left',
            subtitleFont: first.subtitleFont ?? '',
            subtitleSize: first.subtitleSize ?? 'base',
            subtitleColor: first.subtitleColor ?? '',
            bodySize: first.bodySize ?? 'base',
            layoutVariant: variant === 'category' ? 'category' : 'static',
            buttonStyle: (first as any).buttonStyle ?? 'rounded',
            buttonLayout: first.buttonLayout ?? 'grid2x2',
            buttonOpacity: first.buttonOpacity ?? 100,
            buttonBgColor: first.buttonBgColor ?? '',
            buttonBgOpacity: first.buttonBgOpacity ?? 100,
            buttonTextOpacity: first.buttonTextOpacity ?? 100,
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
          const loaded = (first.blocks as any[] | null);
          if (loaded?.length) {
            setBlocks(loaded.map((b: any) => ({ ...b, id: genId() })));
          } else if (first.body) {
            setBlocks([{ id: genId(), type: 'text', content: first.body }]);
          }
        } else {
          const desc = tenantData.description ?? '';
          setForm({ ...emptyForm, title: tenantName, slug: tenantSlug, body: desc });
          if (desc) setBlocks([{ id: genId(), type: 'text', content: desc }]);
        }
      })
      .catch((err: any) => setError(err?.message ?? '読み込みに失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  function addBlock(type: BlockType) {
    setBlocks(prev => [...prev, { id: genId(), type, content: '', imagePosition: 'left' as const }]);
  }
  function updateBlock(id: string, updates: Partial<Block>) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }
  function deleteBlock(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }
  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  async function handleBlockImage(id: string, file: File) {
    try {
      const url = await uploadFile(file);
      updateBlock(id, { imageUrl: url });
    } catch (err: any) {
      setError(err?.message ?? 'アップロードに失敗しました');
    }
  }

  function renderPreviewText(content: string) {
    return (
      <p className={`${bodySizeClass} whitespace-pre-wrap opacity-90`} style={{ color: textColor, fontFamily }}>
        {content || '団体説明'}
      </p>
    );
  }

  function renderPreviewBlocks() {
    if (!blocks.length) return renderPreviewText(previewBody);

    return (
      <div className="space-y-5">
        {blocks.map((block) => {
          const content = block.content?.trim() || '';

          if (block.type === 'media-text') {
            const imageRight = block.imagePosition === 'right';
            return (
              <div key={block.id} className={`flex items-start gap-3 ${imageRight ? 'flex-row-reverse' : ''}`}>
                {block.imageUrl && (
                  <img src={block.imageUrl} alt="" className="h-24 w-28 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">{renderPreviewText(content)}</div>
              </div>
            );
          }

          if (block.type === 'profile') {
            return (
              <div key={block.id} className="flex items-start gap-3">
                {block.imageUrl && (
                  <img src={block.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
                )}
                <div className="min-w-0 flex-1">{renderPreviewText(content)}</div>
              </div>
            );
          }

          if (block.type === 'feature') {
            return (
              <div key={block.id} className="space-y-3">
                {block.imageUrl && (
                  <img src={block.imageUrl} alt="" className="max-h-52 w-full rounded-xl object-cover" />
                )}
                {renderPreviewText(content)}
              </div>
            );
          }

          return <div key={block.id}>{renderPreviewText(content)}</div>;
        })}
      </div>
    );
  }

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
      textColor, accentColor, backgroundColor, navColor, navOpacity,
      imageLayout: form.imageLayout || 'slider',
      heroImageMode,
      heroNavPosition,
      heroOverlayOpacity,
      heroOverlayColor,
      fontFamily: form.fontFamily,
      titleFont: form.titleFont?.trim() || undefined,
      titleColor: form.titleColor?.trim() || undefined,
      titleSize: form.titleSize,
      titleAlign,
      subtitleFont: form.subtitleFont?.trim() || undefined,
      subtitleSize: form.subtitleSize,
      subtitleColor: form.subtitleColor?.trim() || undefined,
      bodySize: form.bodySize,
      layoutVariant: isCategory ? 'category' : 'static',
      aboutLabel: navLabels.about,
      reserveLabel: navLabels.reserve,
      blogLabel: navLabels.blog,
      contactLabel: navLabels.contact,
      buttonStyle,
      buttonLayout,
      buttonOpacity,
      buttonBgColor: form.buttonBgColor?.trim() || undefined,
      buttonBgOpacity: form.buttonBgOpacity ?? 100,
      buttonTextOpacity: form.buttonTextOpacity ?? 100,
      blocks: blocks.length > 0 ? blocks.map(({ id: _id, ...rest }) => rest) : undefined,
      status: 'published',
      seoTitle: displayName,
      seoDescription: blocks.map(b => b.content).join(' ').replace(/\s+/g, ' ').trim().slice(0, 150) || form.body.replace(/[#>*_-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 150),
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
    <form onSubmit={handleSubmit} className="flex h-screen flex-col">
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

      {error && <div className="px-4 pt-2"><div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div></div>}

      <div className="flex flex-1 min-h-0 gap-5 px-4 pb-4 lg:grid lg:max-w-[1420px] lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] xl:grid-cols-[minmax(0,1fr)_minmax(400px,460px)] [&>*]:min-h-0 [&>*]:h-full">
      {/* Settings panel */}
      <section className="flex-1 space-y-3 overflow-y-auto py-4 pr-1">

        {/* 全体 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <p className="text-xs font-bold text-gray-500">全体</p>
          {/* 背景色 */}
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400">背景色</p>
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
          {/* ナビ背景 */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs font-bold text-gray-500">ナビ背景</span>
              <input type="color" value={navColor}
                onChange={(e) => setForm((p) => ({ ...p, navColor: e.target.value }))}
                className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
              <input type="range" min="20" max="100" step="5" value={navOpacity}
                onChange={(e) => setForm((p) => ({ ...p, navOpacity: Number(e.target.value) }))}
                className="flex-1 accent-[#06C755]" />
              <span className="w-8 text-right text-xs text-gray-400">{navOpacity}%</span>
            </div>
          </div>
        </div>

        {/* ヘッダー */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-gray-500">ヘッダー</p>
            <span className="text-[11px] font-bold text-gray-400">{imageUrls.length}/3</span>
          </div>
          {/* 画像 */}
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
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
                <div key={`${url}-${i}`} className="rounded-lg border border-gray-200 bg-gray-50 p-2">
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
                  <input type="file" accept="image/*" disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageFile(f); e.currentTarget.value = ''; }}
                    className="hidden" />
                  {uploading ? '...' : '+ 追加'}
                </label>
              )}
            </div>
            {heroImageMode === 'background' && (
              <div className="mt-3">
                <p className="mb-2 text-[11px] font-bold text-gray-400">ナビボタン位置</p>
                <div className="flex gap-2">
                  {[{ label: '背景の中', value: 'inside' }, { label: '背景の下', value: 'below' }].map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm((p) => ({ ...p, heroNavPosition: opt.value }))}
                      className={`rounded-full border px-4 py-2 text-xs font-bold transition ${heroNavPosition === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      style={heroNavPosition === opt.value ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {imageUrls.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
                <p className="text-[11px] font-bold text-gray-400">画像の色味</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="color" value={heroOverlayColor}
                    onChange={(e) => setForm((p) => ({ ...p, heroOverlayColor: e.target.value }))}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
                  {TONE_COLORS.map((c) => (
                    <button key={c.value} type="button" title={c.label}
                      onClick={() => setForm((p) => ({ ...p, heroOverlayColor: c.value }))}
                      className={`h-8 w-8 rounded-full border-2 ${heroOverlayColor === c.value ? 'border-gray-500' : 'border-transparent'}`}
                      style={{ backgroundColor: c.value, boxShadow: '0 0 0 1px #e5e7eb' }} />
                  ))}
                  <div className="flex flex-1 min-w-[120px] items-center gap-2 pl-1">
                    <input type="range" min="0" max="80" step="5" value={heroOverlayOpacity}
                      onChange={(e) => setForm((p) => ({ ...p, heroOverlayOpacity: Number(e.target.value) }))}
                      className="flex-1 accent-[#06C755]" />
                    <span className="w-8 text-right text-xs text-gray-400">{heroOverlayOpacity}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* ナビ・ボタン */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-bold text-gray-500">外枠色</span>
                <input type="color" value={accentColor}
                  onChange={(e) => setForm((p) => ({ ...p, accentColor: e.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
                <input type="range" min="20" max="100" step="5" value={buttonOpacity}
                  onChange={(e) => setForm((p) => ({ ...p, buttonOpacity: Number(e.target.value) }))}
                  className="flex-1 accent-[#06C755]" />
                <span className="w-8 text-right text-xs text-gray-400">{buttonOpacity}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-bold text-gray-500">中の色</span>
                <input type="color" value={buttonBgColor || '#ffffff'}
                  onChange={(e) => setForm((p) => ({ ...p, buttonBgColor: e.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
                {buttonBgColor ? (
                  <>
                    <input type="range" min="0" max="100" step="5" value={buttonBgOpacity}
                      onChange={(e) => setForm((p) => ({ ...p, buttonBgOpacity: Number(e.target.value) }))}
                      className="flex-1 accent-[#06C755]" />
                    <span className="w-8 text-right text-xs text-gray-400">{buttonBgOpacity}%</span>
                    <button type="button" onClick={() => setForm((p) => ({ ...p, buttonBgColor: '' }))}
                      className="text-xs text-gray-400 hover:text-gray-600">なし</button>
                  </>
                ) : (
                  <span className="text-xs text-gray-300">なし</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-bold text-gray-500">文字色</span>
                <input type="color" value={textColor}
                  onChange={(e) => setForm((p) => ({ ...p, textColor: e.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
                <input type="range" min="0" max="100" step="5" value={buttonTextOpacity}
                  onChange={(e) => setForm((p) => ({ ...p, buttonTextOpacity: Number(e.target.value) }))}
                  className="flex-1 accent-[#06C755]" />
                <span className="w-8 text-right text-xs text-gray-400">{buttonTextOpacity}%</span>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold text-gray-400">ボタン形状</p>
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
            {isCategory && (
              <div>
                <p className="mb-2 text-[11px] font-bold text-gray-400">ボタン配置</p>
                <div className="flex flex-wrap gap-2">
                  {BUTTON_LAYOUT_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm((p) => ({ ...p, buttonLayout: opt.value }))}
                      className={`rounded-full border px-4 py-2 text-xs font-bold transition ${buttonLayout === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      style={buttonLayout === opt.value ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* ナビラベル */}
          <div className="border-t border-gray-100 pt-4">
            <p className="mb-2 text-[11px] font-bold text-gray-400">ナビラベル</p>
            <div className="grid gap-2 grid-cols-2">
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
          {/* サブタイトル */}
          <div className="border-t border-gray-100 pt-4">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-gray-400">サブタイトル</span>
              <input value={form.subtitle ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                placeholder="例：初心者歓迎の社会人サークル"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            </label>
          </div>

          {/* タイトル / サブタイトル スタイル */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            {/* タイトル */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400">タイトル（団体名）</p>
              <div className="flex flex-wrap gap-1.5">
                {fontOptions.map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm((p) => ({ ...p, titleFont: opt.value }))}
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition ${(form.titleFont || form.fontFamily) === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    style={(form.titleFont || form.fontFamily) === opt.value ? { backgroundColor: accentColor, borderColor: accentColor, fontFamily: opt.family } : { fontFamily: opt.family }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {[{ label: '小', value: 'small' }, { label: '標準', value: 'base' }, { label: '大', value: 'large' }, { label: '特大', value: 'xl' }].map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm((p) => ({ ...p, titleSize: opt.value }))}
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition ${form.titleSize === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    style={form.titleSize === opt.value ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">色</span>
                <input type="color" value={form.titleColor || textColor}
                  onChange={(e) => setForm((p) => ({ ...p, titleColor: e.target.value }))}
                  className="h-8 w-10 cursor-pointer rounded border border-gray-200 bg-white p-0.5" />
              </div>
            </div>

            {/* サブタイトル スタイル */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400">サブタイトル スタイル</p>
              <div className="flex flex-wrap gap-1.5">
                {fontOptions.map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm((p) => ({ ...p, subtitleFont: opt.value }))}
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition ${(form.subtitleFont || form.fontFamily) === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    style={(form.subtitleFont || form.fontFamily) === opt.value ? { backgroundColor: accentColor, borderColor: accentColor, fontFamily: opt.family } : { fontFamily: opt.family }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {[{ label: '小', value: 'small' }, { label: '標準', value: 'base' }, { label: '大', value: 'large' }].map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm((p) => ({ ...p, subtitleSize: opt.value }))}
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition ${form.subtitleSize === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    style={form.subtitleSize === opt.value ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">色</span>
                <input type="color" value={form.subtitleColor || textColor}
                  onChange={(e) => setForm((p) => ({ ...p, subtitleColor: e.target.value }))}
                  className="h-8 w-10 cursor-pointer rounded border border-gray-200 bg-white p-0.5" />
              </div>
            </div>
          </div>
        </div>

        {/* 団体詳細 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500">団体詳細</p>
          <div>
            <p className="mb-2 text-[11px] font-bold text-gray-400">文字サイズ</p>
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

          {/* ブロック追加ボタン */}
          <div>
            <p className="mb-2 text-[11px] font-bold text-gray-400">ブロック追加（最大3つ）</p>
            {blocks.length < 3 ? (
              <div className="flex flex-wrap gap-2">
                {(['text', 'media-text', 'profile', 'feature'] as BlockType[]).map((type) => (
                  <button key={type} type="button"
                    onClick={() => addBlock(type)}
                    className="rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition">
                    + {BLOCK_LABELS[type]}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">上限に達しました（削除してから追加できます）</p>
            )}
          </div>

          {/* ブロックリスト */}
          <div className="space-y-2">
            {blocks.map((block, index) => (
              <div key={block.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                {/* ヘッダー行 */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-400">{BLOCK_LABELS[block.type]}</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={index === 0}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-200 disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={index === blocks.length - 1}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-200 disabled:opacity-30">↓</button>
                    <button type="button" onClick={() => deleteBlock(block.id)}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-red-100 hover:text-red-500">×</button>
                  </div>
                </div>

                {/* 画像フィールド (media-text / profile / feature) */}
                {(block.type === 'media-text' || block.type === 'profile' || block.type === 'feature') && (
                  <div className="space-y-1.5">
                    {block.imageUrl ? (
                      <div className="flex items-center gap-2">
                        <img src={block.imageUrl} alt=""
                          className={`object-cover ${block.type === 'profile' ? 'h-12 w-12 rounded-full' : 'h-14 w-20 rounded-lg'}`} />
                        <button type="button" onClick={() => updateBlock(block.id, { imageUrl: undefined })}
                          className="text-xs text-gray-400 hover:text-red-500">削除</button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 hover:bg-gray-100">
                        + 画像追加
                        <input type="file" accept="image/*" className="hidden"
                          ref={el => { blockUploadRefs.current[block.id] = el; }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) await handleBlockImage(block.id, file);
                            e.target.value = '';
                          }} />
                      </label>
                    )}
                    {block.type === 'media-text' && (
                      <div className="flex gap-2">
                        {(['left', 'right'] as const).map(pos => (
                          <button key={pos} type="button"
                            onClick={() => updateBlock(block.id, { imagePosition: pos })}
                            className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${block.imagePosition === pos ? 'text-white' : 'border-gray-200 text-gray-500'}`}
                            style={block.imagePosition === pos ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                            {pos === 'left' ? '画像を左' : '画像を右'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* テキスト */}
                <textarea value={block.content}
                  onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                  rows={3}
                  placeholder={block.type === 'profile' ? '名前や紹介文' : block.type === 'feature' ? 'キャプションや説明文' : '内容を入力'}
                  className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-7 focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
              </div>
            ))}
            {blocks.length === 0 && (
              <p className="py-4 text-center text-xs text-gray-400">上のボタンからブロックを追加してください</p>
            )}
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
      <aside className="hidden w-full max-w-[430px] shrink-0 overflow-y-auto py-4 lg:block">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500">反映後の画面</p>
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-gray-400 ring-1 ring-gray-200">
            {isCategory ? 'カテゴリー型' : '静止サイト型'}
          </span>
        </div>
        <div className="overflow-x-hidden rounded-2xl bg-gray-100 p-2 shadow-inner">
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
                <p className={`${titleSizeClass} font-bold`} style={{ color: titleColor, fontFamily: titleFontFamily }}>{displayName}</p>
                {form.subtitle?.trim() && (
                  <p className={subtitleSizeClass} style={{ color: subtitleColor, fontFamily: subtitleFontFamily }}>{form.subtitle.trim()}</p>
                )}
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
                    style={{ borderColor: btnBorderColor, color: btnTextColor, ...buttonBgStyle }}>
                    {label}
                  </div>
                ))}
              </div>

              <div className="w-full max-w-sm">
                <div className="rounded-xl px-5 py-4 shadow-sm ring-1 ring-gray-100" style={{ backgroundColor: navBg }}>
                  <p className="mb-2 text-xs font-bold text-gray-400">{navLabels.about}</p>
                  {renderPreviewBlocks()}
                </div>
              </div>

            </div>
          )}

          {/* 静止サイト型 preview */}
          {!isCategory && (
            <>
              {heroImageMode === 'background' && imageUrls[0] ? (
                /* 背景モード: 大きいヒーロー */
                <>
                  <div className="relative overflow-hidden" style={{ minHeight: 220 }}>
                    <div className="absolute inset-0" style={{ backgroundImage: `url(${imageUrls[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    <div className="absolute inset-0" style={{ backgroundColor: heroOverlayBg }} />
                    <div className="relative z-10 flex flex-col justify-between px-4 py-4" style={{ minHeight: 220 }}>
                      <div className="flex items-center justify-end">
                        <span className={`px-3 py-1 text-[11px] font-bold text-white ${getBtnShapeClass(buttonStyle)}`} style={{ backgroundColor: accentColor }}>
                          {navLabels.reserve}
                        </span>
                      </div>
                      <div>
                        <p className={`${titleSizeClass} font-bold drop-shadow`} style={{ color: titleColor, fontFamily: titleFontFamily }}>{displayName}</p>
                        {form.subtitle?.trim() && (
                          <p className={`mt-1 ${subtitleSizeClass}`} style={{ color: subtitleColor, fontFamily: subtitleFontFamily }}>{form.subtitle.trim()}</p>
                        )}
                        {heroNavPosition === 'inside' && (
                          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold">
                            {[navLabels.about, navLabels.blog, navLabels.reserve, navLabels.contact].map((label) => (
                              <span key={label} className={`truncate whitespace-nowrap px-3 py-1.5 text-center leading-4 ${getBtnShapeClass(buttonStyle)}`} style={{ borderColor: btnBorderColor, color: btnTextColor, ...buttonBgStyle }}>{label}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {heroNavPosition === 'below' && (
                    <div className="grid grid-cols-2 gap-2 border-b border-gray-100 px-4 py-3 text-[11px] font-bold">
                      {[navLabels.about, navLabels.blog, navLabels.reserve, navLabels.contact].map((label) => (
                        <span key={label} className={`truncate whitespace-nowrap px-3 py-1.5 text-center leading-4 ${getBtnShapeClass(buttonStyle)}`} style={{ borderColor: btnBorderColor, color: btnTextColor, ...buttonBgStyle }}>{label}</span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* 通常モード: 薄いナビバー */
                <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3">
                  <span className="text-sm font-bold leading-5" style={{ color: textColor }}>{displayName}</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                    {[navLabels.about, navLabels.blog, navLabels.reserve, navLabels.contact].map((label) => (
                      <span key={label} className={`truncate whitespace-nowrap px-3 py-1.5 text-center leading-4 ${getBtnShapeClass(buttonStyle)}`} style={{ borderColor: btnBorderColor, color: btnTextColor, ...buttonBgStyle }}>{label}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-4 p-5">
                {form.subtitle?.trim() && heroImageMode !== 'background' && (
                  <p className="text-sm font-bold leading-6 opacity-75" style={{ color: textColor, textAlign: titleAlign }}>
                    {form.subtitle.trim()}
                  </p>
                )}
                {heroImageMode !== 'background' && (
                  <HeaderImagePreview
                    images={imageUrls}
                    captions={imageCaptions}
                    mode={heroImageMode}
                    overlayColor={heroOverlayColor}
                    overlayOpacity={heroOverlayOpacity}
                  />
                )}
                <div className="rounded-lg p-4" style={{ backgroundColor: navBg }}>
                  {renderPreviewBlocks()}
                </div>
                <section className="rounded-lg p-4" style={{ backgroundColor: navBg }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">必須 — 予約セクション</p>
                  <p className="text-sm font-bold" style={{ color: textColor }}>{navLabels.reserve}</p>
                  <ReservationViewShowcase
                    accentColor={accentColor}
                    buttonLabel={navLabels.reserve}
                    viewStyle={form.reserveViewStyle}
                    className="mt-3"
                  />
                </section>
                <section className="rounded-lg p-4" style={{ backgroundColor: navBg }}>
                  <p className="text-xs font-bold text-gray-400 mb-1">必須 — ブログセクション</p>
                  <p className="text-sm font-bold" style={{ color: textColor }}>{navLabels.blog}</p>
                  <p className="mt-1 text-xs text-gray-400">公開した記事が表示されます</p>
                </section>
                <section className="rounded-lg p-4" style={{ backgroundColor: navBg }}>
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
