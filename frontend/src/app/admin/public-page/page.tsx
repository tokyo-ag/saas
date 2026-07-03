'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, BlogPost, LiffEvent, PublicPageInput, Tenant } from '@/lib/api';
import { API_URL, SITE_URL } from '@/lib/config';
import { imgUrl } from '@/lib/imgUrl';
import { getToken } from '@/lib/auth';
import { SaveToast } from '@/components/ui/SaveToast';
import { ReservationViewShowcase } from '@/components/public/ReservationViewShowcase';

type BlockType = 'text' | 'media-text' | 'profile' | 'feature' | 'sns' | 'faq';
interface FaqItem { q: string; a: string; }
interface Block {
  id: string;
  type: BlockType;
  content: string;
  imageUrl?: string;
  imagePosition?: 'left' | 'right';
  imageFocal?: string;
  fontSize?: string;
  // SNS block fields
  instagramUrl?: string;
  xUrl?: string;
  threadsUrl?: string;
  instagramLabel?: string;
  xLabel?: string;
  threadsLabel?: string;
  xUsername?: string;
  instagramEmbedUrl?: string;
  threadsEmbedUrl?: string;
  // FAQ block fields
  faqItems?: FaqItem[];
}
const BLOCK_LABELS: Record<BlockType, string> = {
  'text': 'テキスト',
  'media-text': 'メディアテキスト',
  'profile': 'プロフィール',
  'feature': 'フィーチャー',
  'sns': 'SNS',
  'faq': 'Q&A',
};
const BLOG_IMAGE_RE = /!\[[^\]]*]\(([^)]+)\)/;
function genId() { return Math.random().toString(36).slice(2); }

function firstBlogImage(body: string | null | undefined) {
  return body?.match(BLOG_IMAGE_RE)?.[1] ?? null;
}

const DEFAULT_SECTION_ORDER = ['title', 'subtitle', 'nav', 'image'] as const;
const SECTION_LABELS: Record<string, string> = { title: 'タイトル', subtitle: 'サブタイトル', nav: 'ボタン', image: '画像' };

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
  backgroundOpacity: 100,
  navColor: '#F3F4F6',
  navOpacity: 100,
  imageLayout: 'slider',
  heroImageMode: 'fixed',
  heroNavPosition: 'below',
  heroImagePosition: 'center center',
  heroTextPosition: 'bottom',
  heroTextX: 5,
  heroTextY: 65,
  heroTextWidth: 85,
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
  subtitleMarginTop: 8,
  bodySize: 'base',
  layoutVariant: 'static',
  buttonStyle: 'rounded',
  buttonLayout: 'grid2x2',
  buttonOpacity: 100,
  buttonRadius: 8,
  buttonSize: 40,
  buttonBgColor: '',
  buttonBgOpacity: 100,
  buttonTextOpacity: 100,
  headerText: '',
  footerText: '',
  footerTextColor: '#111827',
  footerContact: '',
  footerContactColor: '',
  footerContactTextColor: '#111827',
  contactTitle: '',
  contactLead: '',
  contactMessage: '',
  contactTitleColor: '',
  contactLeadColor: '',
  contactMessageColor: '#111827',
  reserveTitle: '',
  reserveLead: '',
  reserveTitleColor: '',
  reserveLeadColor: '',
  reserveEventTitleColor: '',
  reserveEventDateColor: '',
  reserveEventMetaColor: '',
  reserveEventCardBg: '',
  reserveActionStyle: 'comiu',
  reserveLineUrl: '',
  blogPostCardBg: '',
  blogTitle: '',
  blogLead: '',
  blogTitleColor: '',
  blogLeadColor: '',
  footerLine: '',
  footerInstagram: '',
  footerX: '',
  aboutLabel: '団体詳細',
  reserveLabel: '予約する',
  blogLabel: 'ブログ',
  contactLabel: 'お問い合わせ',
  navAboutUrl: '',
  navReserveUrl: '',
  navBlogUrl: '',
  navContactUrl: '',
  seoTitle: '',
  seoDescription: '',
  orgNameDisplayType: 'text',
  orgLogoWordmarkUrl: '',
  orgLogoWordmarkAlt: '',
  orgLogoWordmarkSize: 60,
  subtitleHeroX: 5,
  subtitleHeroY: null as unknown as number,
  sectionOrder: [...DEFAULT_SECTION_ORDER] as string[],
  displayFields: { location: true, price: true, capacity: true, description: true } as { location: boolean; price: boolean; capacity: boolean; description: boolean },
  status: 'published',
};

function normalizeFooterTextColor(color?: string | null) {
  const value = color?.trim();
  if (!value) return '#111827';
  return ['#6B7280', '#9CA3AF'].includes(value.toUpperCase()) ? '#111827' : value;
}

const fontOptions = [
  { label: '明朝', value: 'mincho', family: '"Yu Mincho", "Hiragino Mincho ProN", serif' },
  { label: '手書き', value: 'handwriting', family: '"Hachi Maru Pop", "Comic Sans MS", "Yu Gothic", cursive' },
  { label: '強調', value: 'marker', family: '"Arial Rounded MT Bold", "Arial Black", "Yu Gothic", sans-serif' },
];

const TITLE_SIZE_LEGACY: Record<string, number> = { small: 22, base: 26, large: 30, xl: 36, xlarge: 36 };
const SUBTITLE_SIZE_LEGACY: Record<string, number> = { small: 12, base: 14, large: 16 };
const BODY_SIZE_LEGACY: Record<string, number> = { small: 14, base: 16, large: 18 };

function resolvePxSize(
  value: string | number | null | undefined,
  fallback: number,
  min: number,
  max: number,
  legacy: Record<string, number>,
) {
  const raw = typeof value === 'string' ? value.trim() : value;
  const mapped = typeof raw === 'string' ? legacy[raw] : undefined;
  const parsed = mapped ?? Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function bodyLeadingClass(size: number) {
  if (size <= 14) return 'leading-7';
  if (size >= 19) return 'leading-10';
  if (size >= 17) return 'leading-9';
  return 'leading-8';
}

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
];

const HERO_IMAGE_MODE_OPTIONS = [
  { label: '固定', value: 'fixed' },
  { label: 'スライダー', value: 'slider' },
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

async function removeBgAndTrim(imageUrl: string): Promise<{ blob: Blob; msg: string }> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`画像の取得に失敗しました (${res.status})`);
  const srcBlob = await res.blob();
  const isSvg = srcBlob.type === 'image/svg+xml';

  const bitmap = await createImageBitmap(srcBlob);
  const scale = isSvg ? 2 : 1;
  const cw = (bitmap.width || 600) * scale;
  const ch = (bitmap.height || 200) * scale;

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, cw, ch);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, cw, ch);
  const { data, width, height } = imageData;

  // Sample background color from 4 corners + edge midpoints for robustness
  const px = (x: number, y: number) => (y * width + x) * 4;
  const samples = [
    px(0, 0), px(width-1, 0), px(0, height-1), px(width-1, height-1),
    px(Math.floor(width/2), 0), px(0, Math.floor(height/2)),
    px(width-1, Math.floor(height/2)), px(Math.floor(width/2), height-1),
  ];
  const bgA = Math.round(samples.reduce((s, i) => s + data[i+3], 0) / samples.length);
  const bgR = Math.round(samples.reduce((s, i) => s + data[i],   0) / samples.length);
  const bgG = Math.round(samples.reduce((s, i) => s + data[i+1], 0) / samples.length);
  const bgB = Math.round(samples.reduce((s, i) => s + data[i+2], 0) / samples.length);
  const hasSolidBg = bgA > 128;

  // Step 1: Remove background — make background-colored pixels transparent
  if (hasSolidBg) {
    const HARD = 25;  // fully erase pixels within this color distance
    const SOFT = 60;  // fade pixels in this transitional range
    for (let i = 0; i < data.length; i += 4) {
      const dist = Math.max(
        Math.abs(data[i]   - bgR),
        Math.abs(data[i+1] - bgG),
        Math.abs(data[i+2] - bgB),
      );
      if (dist < HARD) {
        data[i+3] = 0;
      } else if (dist < SOFT) {
        data[i+3] = Math.round(data[i+3] * (dist - HARD) / (SOFT - HARD));
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // Step 2: Trim transparent borders — find bounding box of visible content
  // Re-read pixel data after bg removal
  const { data: d2, width: w2, height: h2 } = ctx.getImageData(0, 0, cw, ch);
  let top = h2, left = w2, right = -1, bottom = -1;
  for (let y = 0; y < h2; y++)
    for (let x = 0; x < w2; x++)
      if (d2[(y * w2 + x) * 4 + 3] > 20) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }

  if (top > bottom || left > right) throw new Error('コンテンツが検出できませんでした');

  const pad = 6;
  const cropX = Math.max(0, left - pad);
  const cropY = Math.max(0, top - pad);
  const cropW = Math.min(right + 1 + pad, w2) - cropX;
  const cropH = Math.min(bottom + 1 + pad, h2) - cropY;

  const out = document.createElement('canvas');
  out.width = cropW;
  out.height = cropH;
  out.getContext('2d')!.putImageData(ctx.getImageData(cropX, cropY, cropW, cropH), 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) =>
    out.toBlob(b => b ? resolve(b) : reject(new Error('canvas export failed')), 'image/png')
  );
  return { blob, msg: `${width}×${height} → ${cropW}×${cropH}` };
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
    case 'double': return 'rounded-lg border-2';
    case 'stylish': return 'rounded-lg border border-dashed';
    case 'gorgeous': return 'rounded-xl border-4 border-double shadow-md';
    default: return 'rounded-xl border-2';
  }
}

function getBtnBoxShadow(style: string | null | undefined, borderColor: string): string | undefined {
  if (style === 'double') return `inset 0 0 0 3px ${borderColor}`;
  return undefined;
}

function parseFocal(focal: string | undefined): { x: number; y: number } {
  if (!focal) return { x: 50, y: 50 };
  const parts = focal.trim().split(/\s+/);
  const parse = (s: string) => {
    if (s.endsWith('%')) return parseFloat(s);
    if (s === 'left' || s === 'top') return 0;
    if (s === 'right' || s === 'bottom') return 100;
    return 50;
  };
  return { x: parse(parts[0] ?? '50%'), y: parse(parts[1] ?? '50%') };
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
  const [reserveEvents, setReserveEvents] = useState<LiffEvent[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const blockUploadRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const blockFocalDragRef = useRef<{ startX: number; startY: number; startFocal: { x: number; y: number } } | null>(null);
  const heroFocalDragRef = useRef<{ startX: number; startY: number; startFocal: { x: number; y: number } } | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ global: true, header: true, structure: true, reserve: false, blog: false, footer: false });
  const toggleSection = (key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] }));

  const tenantCode = tenant?.code ?? tenant?.id ?? '';
  const displayName = tenant?.lineDisplayName ?? tenant?.name ?? '公開サイト';
  const tenantIcon = tenant?.iconUrl ?? tenant?.linePictureUrl ?? null;
  const generatedSlug = slugify(displayName) || slugify(tenantCode) || 'home';
  const previewUrl = tenantCode ? `${SITE_URL}/clubs/${tenantCode}/${generatedSlug}` : '';
  const textColor = form.textColor?.trim() || '#111827';
  const accentColor = form.accentColor?.trim() || '#06C755';
  const backgroundColor = form.backgroundColor?.trim() || '#F7F8FA';
  const backgroundOpacity = clampPercent(form.backgroundOpacity ?? 100);
  const bgColor = hexToRgba(backgroundColor, backgroundOpacity);
  const navColor = form.navColor?.trim() || '#F3F4F6';
  const navOpacity = clampPercent(form.navOpacity ?? 100);
  const navBg = hexToRgba(navColor, navOpacity);
  const fontFamily = fontOptions.find((o) => o.value === form.fontFamily)?.family ?? fontOptions[0].family;
  const bodyFontSize = resolvePxSize(form.bodySize, 16, 12, 24, BODY_SIZE_LEGACY);
  const bodySizeClass = bodyLeadingClass(bodyFontSize);
  const titleAlign = (['left', 'center', 'right'].includes(form.titleAlign || '') ? form.titleAlign! : 'left') as 'left' | 'center' | 'right';
  const subtitleGap = form.subtitleMarginTop ?? 8;
  const btnRadius = form.buttonRadius ?? 8;
  const previewBody = form.body.trim() || tenant?.description || '';
  const imageUrls = (form.imageUrls?.length ? form.imageUrls : form.coverImageUrl ? [form.coverImageUrl] : []).filter(Boolean).slice(0, 3);
  const imageCaptions = imageUrls.map((_, i) => (form.imageCaptions?.[i] ?? '').slice(0, 80));
  const rawHeroImageMode = form.heroImageMode || 'fixed';
  const heroImageMode = rawHeroImageMode === 'auto'
    ? 'fixed'
    : ['fixed', 'slider', 'background'].includes(rawHeroImageMode)
      ? rawHeroImageMode
      : 'fixed';
  const heroOverlayOpacity = clampPercent(form.heroOverlayOpacity);
  const heroOverlayColor = form.heroOverlayColor?.trim() || '#000000';
  const heroOverlayBg = hexToRgba(heroOverlayColor, heroOverlayOpacity);

  const heroRef = useRef<HTMLDivElement>(null);

  const handleTextDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startTX = form.heroTextX ?? 5, startTY = form.heroTextY ?? 65;
    function onMove(ev: MouseEvent) {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const nx = Math.max(0, Math.min(90, Math.round(startTX + ((ev.clientX - startX) / rect.width) * 100)));
      const ny = Math.max(0, Math.min(90, Math.round(startTY + ((ev.clientY - startY) / rect.height) * 100)));
      setForm(p => ({ ...p, heroTextX: nx, heroTextY: ny }));
    }
    function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [form.heroTextX, form.heroTextY]);


  const handleTextResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX, startW = form.heroTextWidth ?? 85;
    function onMove(ev: MouseEvent) {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const nw = Math.max(15, Math.min(100, Math.round(startW + ((ev.clientX - startX) / rect.width) * 100)));
      setForm(p => ({ ...p, heroTextWidth: nw }));
    }
    function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [form.heroTextWidth]);

  const titleFontFamily = (form.titleFont?.trim()
    ? fontOptions.find(f => f.value === form.titleFont)?.family
    : undefined) ?? fontFamily;
  const titleColor = form.titleColor?.trim() || textColor;
  const titleFontSize = resolvePxSize(form.titleSize, 30, 18, 48, TITLE_SIZE_LEGACY);
  const titleTextStyle = { color: titleColor, fontFamily: titleFontFamily, fontSize: titleFontSize, lineHeight: 1.25 };
  const subtitleFontFamily = (form.subtitleFont?.trim()
    ? fontOptions.find(f => f.value === form.subtitleFont)?.family
    : undefined) ?? fontFamily;
  const subtitleColor = form.subtitleColor?.trim() || textColor;
  const subtitleFontSize = resolvePxSize(form.subtitleSize, 14, 11, 28, SUBTITLE_SIZE_LEGACY);
  const subtitleTextStyle = { color: subtitleColor, fontFamily: subtitleFontFamily, fontSize: subtitleFontSize, lineHeight: 1.6 };
  const heroNavPosition = form.heroNavPosition === 'inside' ? 'inside' : 'below';
  const navLabels = {
    about: form.aboutLabel?.trim() || '団体詳細',
    reserve: form.reserveLabel?.trim() || '予約する',
    blog: form.blogLabel?.trim() || 'ブログ',
    contact: form.contactLabel?.trim() || 'お問い合わせ',
  };
  const reserveActionStyle = form.reserveActionStyle === 'line' ? 'line' : 'comiu';
  const hasReserveSection = reserveActionStyle === 'line' || reserveEvents.length > 0;
  const hasBlogSection = blogPosts.length > 0;
  const visibleNavItems = [
    { key: 'about', label: navLabels.about },
    ...(hasBlogSection ? [{ key: 'blog', label: navLabels.blog }] : []),
    ...(hasReserveSection ? [{ key: 'reserve', label: navLabels.reserve }] : []),
    { key: 'contact', label: navLabels.contact },
  ];
  const reserveSectionTitle = form.reserveTitle?.trim() || navLabels.reserve;
  const reserveSectionLead = form.reserveLead?.trim() || '募集中のイベントを表示します。';
  const reserveTitleColor = form.reserveTitleColor?.trim() || textColor;
  const reserveLeadColor = form.reserveLeadColor?.trim() || '#6B7280';
  const reserveEventTitleColor = form.reserveEventTitleColor?.trim() || '#111827';
  const reserveEventDateColor = form.reserveEventDateColor?.trim() || '#4B5563';
  const reserveEventMetaColor = form.reserveEventMetaColor?.trim() || '#6B7280';
  const reserveEventCardBg = form.reserveEventCardBg?.trim() || '#ffffff';
  const blogPostCardBg = form.blogPostCardBg?.trim() || '#ffffff';
  const blogSectionTitle = form.blogTitle?.trim() || navLabels.blog;
  const blogSectionLead = form.blogLead?.trim() || '活動日記やお知らせを表示するエリアです。';
  const blogTitleColor = form.blogTitleColor?.trim() || textColor;
  const blogLeadColor = form.blogLeadColor?.trim() || '#6B7280';
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
  const btnBoxShadow = getBtnBoxShadow(buttonStyle, btnBorderColor);
  const previewButtonLayoutClass = buttonLayout === 'row1x4' ? 'grid gap-2' : 'grid gap-2';
  const previewButtonGridStyle = {
    gridTemplateColumns: `repeat(${buttonLayout === 'row1x4' ? visibleNavItems.length : Math.min(2, visibleNavItems.length)}, minmax(0, 1fr))`,
  };
  const btnSize = form.buttonSize ?? 40;
  const btnIsPill = buttonStyle === 'pill';
  const dragRef = useRef<{ startY: number; startSize: number } | null>(null);
  const subtitleDragRef = useRef<{ startX: number; startY: number; startSX: number; startSY: number } | null>(null);
  const imageDragIndexRef = useRef<number | null>(null);

  const renderCopyInput = (
    label: string,
    field: keyof PublicPageInput,
    colorField: keyof PublicPageInput,
    placeholder: string,
    fallbackColor: string,
    multiline = false,
  ) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-gray-400">{label}</span>
        <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
          色
          <input
            type="color"
            value={((form[colorField] as string | undefined)?.trim() || fallbackColor)}
            onChange={(e) => setForm((p) => ({ ...p, [colorField]: e.target.value }))}
            className="h-7 w-9 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
          />
        </label>
      </div>
      {multiline ? (
        <textarea
          value={(form[field] as string | undefined) ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
        />
      ) : (
        <input
          type="text"
          value={(form[field] as string | undefined) ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
        />
      )}
    </div>
  );

  const loadPublishedBlogPosts = useCallback(() => {
    void api.blog.list()
      .then((posts) => setBlogPosts(posts.filter((post) => post.status === 'published')))
      .catch(() => setBlogPosts([]));
  }, []);

  useEffect(() => {
    Promise.all([api.tenant.get(), api.publicPages.list()])
      .then(([tenantData, pageData]) => {
        setTenant(tenantData);
        void api.liff.events(tenantData.code ?? tenantData.id)
          .then(setReserveEvents)
          .catch(() => setReserveEvents([]));
        loadPublishedBlogPosts();
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
            backgroundOpacity: first.backgroundOpacity ?? 100,
            navColor: first.navColor ?? '#F3F4F6',
            navOpacity: first.navOpacity ?? 100,
            imageLayout: first.imageLayout ?? 'slider',
            heroImageMode: first.heroImageMode === 'auto' ? 'fixed' : first.heroImageMode ?? 'fixed',
            heroNavPosition: first.heroNavPosition ?? 'below',
            heroImagePosition: first.heroImagePosition ?? 'center center',
            heroTextPosition: first.heroTextPosition ?? 'bottom',
            heroTextX: first.heroTextX ?? 5,
            heroTextY: first.heroTextY ?? 65,
            heroTextWidth: first.heroTextWidth ?? 85,
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
            subtitleMarginTop: first.subtitleMarginTop ?? 8,
            bodySize: first.bodySize ?? 'base',
            layoutVariant: 'static',
            buttonStyle: (first as any).buttonStyle ?? 'rounded',
            buttonLayout: first.buttonLayout === 'circle4' ? 'row1x4' : (first.buttonLayout ?? 'grid2x2'),
            buttonOpacity: first.buttonOpacity ?? 100,
            buttonRadius: first.buttonRadius ?? 8,
            buttonSize: first.buttonSize ?? 40,
            buttonBgColor: first.buttonBgColor ?? '',
            buttonBgOpacity: first.buttonBgOpacity ?? 100,
            buttonTextOpacity: first.buttonTextOpacity ?? 100,
            headerText: (first as any).headerText ?? '',
            footerText: (first as any).footerText ?? '',
            ...(() => {
              try {
                const fd = JSON.parse((first as any).footerText ?? '{}');
                return {
                  footerContact: fd.contact ?? '',
                  footerTextColor: normalizeFooterTextColor(fd.footerTextColor),
                  footerContactColor: fd.contactColor ?? '',
                  footerContactTextColor: normalizeFooterTextColor(fd.contactTextColor),
                  contactTitle: fd.contactTitle ?? '',
                  contactLead: fd.contactLead ?? '',
                  contactMessage: fd.contactMessage ?? '',
                  contactTitleColor: fd.contactTitleColor ?? '',
                  contactLeadColor: fd.contactLeadColor ?? '',
                  contactMessageColor: normalizeFooterTextColor(fd.contactMessageColor),
                  reserveTitle: fd.reserveTitle ?? '',
                  reserveLead: fd.reserveLead ?? '',
                  reserveTitleColor: fd.reserveTitleColor ?? '',
                  reserveLeadColor: fd.reserveLeadColor ?? '',
                  reserveEventTitleColor: fd.reserveEventTitleColor ?? '',
                  reserveEventDateColor: fd.reserveEventDateColor ?? '',
                  reserveEventMetaColor: fd.reserveEventMetaColor ?? '',
                  reserveEventCardBg: fd.reserveEventCardBg ?? '',
                  reserveActionStyle: fd.reserveActionStyle === 'line' ? 'line' : 'comiu',
                  reserveLineUrl: fd.reserveLineUrl ?? fd.line ?? '',
                  blogPostCardBg: fd.blogPostCardBg ?? '',
                  blogTitle: fd.blogTitle ?? '',
                  blogLead: fd.blogLead ?? '',
                  blogTitleColor: fd.blogTitleColor ?? '',
                  blogLeadColor: fd.blogLeadColor ?? '',
                  footerLine: fd.footerLine ?? '',
                  footerInstagram: fd.instagram ?? '',
                  footerX: fd.x ?? '',
                  navAboutUrl: fd.aboutUrl ?? '',
                  navReserveUrl: fd.reserveUrl ?? '',
                  navBlogUrl: fd.blogUrl ?? '',
                  navContactUrl: fd.contactUrl ?? '',
                  subtitleHeroX: fd.subtitleHeroX ?? 5,
                  subtitleHeroY: fd.subtitleHeroY ?? null,
                  sectionOrder: Array.isArray(fd.sectionOrder) ? fd.sectionOrder : [...DEFAULT_SECTION_ORDER],
                  displayFields: (fd.displayFields && typeof fd.displayFields === 'object') ? {
                    location: fd.displayFields.location !== false,
                    price: fd.displayFields.price !== false,
                    capacity: fd.displayFields.capacity !== false,
                    description: fd.displayFields.description !== false,
                  } : { location: true, price: true, capacity: true, description: true },
                };
              } catch {
                return {
                  footerContact: (first as any).footerText ?? '',
                  footerTextColor: '#111827',
                  footerContactColor: '',
                  footerContactTextColor: '#111827',
                  contactTitle: '',
                  contactLead: '',
                  contactMessage: '',
                  contactTitleColor: '',
                  contactLeadColor: '',
                  contactMessageColor: '#111827',
                  reserveTitle: '',
                  reserveLead: '',
                  reserveTitleColor: '',
                  reserveLeadColor: '',
                  reserveEventTitleColor: '',
                  reserveEventDateColor: '',
                  reserveEventMetaColor: '',
                  reserveEventCardBg: '',
                  reserveActionStyle: 'comiu',
                  reserveLineUrl: '',
                  blogPostCardBg: '',
                  blogTitle: '',
                  blogLead: '',
                  blogTitleColor: '',
                  blogLeadColor: '',
                  footerLine: '',
                  footerInstagram: '',
                  footerX: '',
                };
              }
            })(),
            aboutLabel: first.aboutLabel ?? '団体詳細',
            reserveLabel: first.reserveLabel ?? '予約する',
            blogLabel: first.blogLabel ?? 'ブログ',
            contactLabel: first.contactLabel ?? 'お問い合わせ',
            seoTitle: first.seoTitle ?? '',
            seoDescription: first.seoDescription ?? '',
            orgNameDisplayType: (first as any).orgNameDisplayType ?? 'text',
            orgLogoWordmarkUrl: (first as any).orgLogoWordmarkUrl ?? '',
            orgLogoWordmarkAlt: (first as any).orgLogoWordmarkAlt ?? '',
            orgLogoWordmarkSize: (first as any).orgLogoWordmarkSize ?? 60,
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
  }, [loadPublishedBlogPosts]);

  useEffect(() => {
    window.addEventListener('focus', loadPublishedBlogPosts);
    return () => window.removeEventListener('focus', loadPublishedBlogPosts);
  }, [loadPublishedBlogPosts]);

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
  const logoUploadRef = useRef<HTMLInputElement | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoTrimming, setLogoTrimming] = useState(false);
  async function handleLogoTrim() {
    if (!form.orgLogoWordmarkUrl) return;
    setLogoTrimming(true);
    try {
      const result = await removeBgAndTrim(form.orgLogoWordmarkUrl);
      const file = new File([result.blob], `logo-nobg-${Date.now()}.png`, { type: 'image/png' });
      await handleLogoUpload(file);
    } catch (err: any) {
      setError(err?.message ?? '背景の削除に失敗しました');
    } finally {
      setLogoTrimming(false);
    }
  }
  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    try {
      const url = await uploadFile(file);
      setForm(p => ({ ...p, orgLogoWordmarkUrl: url, orgLogoWordmarkAlt: p.orgLogoWordmarkAlt || displayName }));
    } catch (err: any) {
      setError(err?.message ?? 'ロゴのアップロードに失敗しました');
    } finally {
      setLogoUploading(false);
    }
  }

  function renderPreviewText(content: string, fontSize = bodyFontSize) {
    return (
      <p
        className={`${bodyLeadingClass(fontSize)} whitespace-pre-wrap break-words opacity-90`}
        style={{ color: textColor, fontFamily, fontSize, overflowWrap: 'anywhere' }}>
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
          const blockFontSize = resolvePxSize(block.fontSize, bodyFontSize, 10, 28, BODY_SIZE_LEGACY);

          if (block.type === 'media-text') {
            const imageRight = block.imagePosition === 'right';
            return (
              <div key={block.id} className={`flex items-start gap-3 ${imageRight ? 'flex-row-reverse' : ''}`}>
                {block.imageUrl && (
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                    <img src={block.imageUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: block.imageFocal ?? 'center center' }} />
                  </div>
                )}
                <div className="min-w-0 flex-1">{renderPreviewText(content, blockFontSize)}</div>
              </div>
            );
          }

          if (block.type === 'profile') {
            return (
              <div key={block.id} className="flex items-start gap-3">
                {block.imageUrl && (
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
                    <img src={block.imageUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: block.imageFocal ?? 'center center' }} />
                  </div>
                )}
                <div className="min-w-0 flex-1">{renderPreviewText(content, blockFontSize)}</div>
              </div>
            );
          }

          if (block.type === 'feature') {
            return (
              <div key={block.id} className="space-y-3">
                {block.imageUrl && (
                  <div className="h-48 w-full overflow-hidden rounded-xl">
                    <img src={block.imageUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: block.imageFocal ?? 'center center' }} />
                  </div>
                )}
                {renderPreviewText(content, blockFontSize)}
              </div>
            );
          }

          if (block.type === 'faq') {
            const items = block.faqItems ?? [];
            return (
              <div key={block.id} className="space-y-1.5">
                {items.length === 0 && <p className="text-xs text-gray-400">Q&Aを追加してください</p>}
                {items.map((item, j) => (
                  <div key={j} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-xs font-bold" style={{ color: textColor }}>Q. {item.q || '（質問）'}</p>
                    {item.a && <p className="mt-0.5 text-xs opacity-60" style={{ color: textColor }}>A. {item.a}</p>}
                  </div>
                ))}
              </div>
            );
          }

          if (block.type === 'sns') {
            const snsItems = [
              { url: block.instagramUrl, label: block.instagramLabel || 'Instagramでフォロー', color: '#E1306C' },
              { url: block.xUrl, label: block.xLabel || 'Xでフォロー', color: '#000000' },
              { url: block.threadsUrl, label: block.threadsLabel || 'Threadsでフォロー', color: '#000000' },
            ].filter(s => s.url);
            return (
              <div key={block.id} className="space-y-3">
                {snsItems.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {snsItems.map(({ label, color }) => (
                      <span key={label} className="flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-bold" style={{ borderColor: color, color }}>
                        {label}
                      </span>
                    ))}
                  </div>
                )}
                {block.xUsername && (
                  <div className="rounded-xl border border-gray-200 p-3 text-center text-xs text-gray-400">
                    X タイムライン @{block.xUsername}
                  </div>
                )}
                {block.instagramEmbedUrl && (
                  <div className="rounded-xl border border-gray-200 p-3 text-center text-xs text-gray-400">
                    Instagram 投稿 埋め込み
                  </div>
                )}
                {block.threadsEmbedUrl && (
                  <div className="rounded-xl border border-gray-200 p-3 text-center text-xs text-gray-400">
                    Threads 投稿 埋め込み
                  </div>
                )}
              </div>
            );
          }

          return <div key={block.id}>{renderPreviewText(content, blockFontSize)}</div>;
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
      textColor, accentColor, backgroundColor, backgroundOpacity: clampPercent(form.backgroundOpacity ?? 100), navColor, navOpacity,
      imageLayout: form.imageLayout || 'slider',
      heroImageMode,
      heroNavPosition,
      heroOverlayOpacity,
      heroOverlayColor,
      fontFamily: form.fontFamily,
      titleFont: form.titleFont?.trim() || undefined,
      titleColor: form.titleColor?.trim() || undefined,
      titleSize: String(titleFontSize),
      titleAlign,
      subtitleFont: form.subtitleFont?.trim() || undefined,
      subtitleSize: String(subtitleFontSize),
      subtitleColor: form.subtitleColor?.trim() || undefined,
      subtitleMarginTop: subtitleGap,
      bodySize: String(bodyFontSize),
      layoutVariant: 'static',
      aboutLabel: navLabels.about,
      reserveLabel: navLabels.reserve,
      blogLabel: navLabels.blog,
      contactLabel: navLabels.contact,
      buttonStyle,
      buttonLayout,
      buttonOpacity,
      buttonRadius: btnRadius,
      buttonSize: btnSize,
      buttonBgColor: form.buttonBgColor?.trim() || undefined,
      buttonBgOpacity: form.buttonBgOpacity ?? 100,
      buttonTextOpacity: form.buttonTextOpacity ?? 100,
      blocks: blocks.length > 0 ? blocks.map(({ id: _id, ...rest }) => rest) : undefined,
      footerText: JSON.stringify({
        contact: form.footerContact?.trim() || '',
        footerTextColor: form.footerTextColor?.trim() || '',
        contactColor: form.footerContactColor?.trim() || '',
        contactTextColor: form.footerContactTextColor?.trim() || '#111827',
        contactTitle: form.contactTitle?.trim() || '',
        contactLead: form.contactLead?.trim() || '',
        contactMessage: form.contactMessage?.trim() || '',
        contactTitleColor: form.contactTitleColor?.trim() || '',
        contactLeadColor: form.contactLeadColor?.trim() || '',
        contactMessageColor: form.contactMessageColor?.trim() || '#111827',
        reserveTitle: form.reserveTitle?.trim() || '',
        reserveLead: form.reserveLead?.trim() || '',
        reserveTitleColor: form.reserveTitleColor?.trim() || '',
        reserveLeadColor: form.reserveLeadColor?.trim() || '',
        reserveEventTitleColor: form.reserveEventTitleColor?.trim() || '',
        reserveEventDateColor: form.reserveEventDateColor?.trim() || '',
        reserveEventMetaColor: form.reserveEventMetaColor?.trim() || '',
        reserveEventCardBg: form.reserveEventCardBg?.trim() || '',
        reserveActionStyle,
        reserveLineUrl: form.reserveLineUrl?.trim() || '',
        blogPostCardBg: form.blogPostCardBg?.trim() || '',
        blogTitle: form.blogTitle?.trim() || '',
        blogLead: form.blogLead?.trim() || '',
        blogTitleColor: form.blogTitleColor?.trim() || '',
        blogLeadColor: form.blogLeadColor?.trim() || '',
        footerLine: form.footerLine?.trim() || '',
        instagram: form.footerInstagram?.trim() || '',
        x: form.footerX?.trim() || '',
        aboutUrl: form.navAboutUrl?.trim() || '',
        reserveUrl: form.navReserveUrl?.trim() || '',
        blogUrl: form.navBlogUrl?.trim() || '',
        contactUrl: form.navContactUrl?.trim() || '',
        subtitleHeroX: form.subtitleHeroX ?? 5,
        subtitleHeroY: form.subtitleHeroY ?? null,
        sectionOrder: form.sectionOrder ?? [...DEFAULT_SECTION_ORDER],
        displayFields: form.displayFields,
      }),
      status: 'published',
      seoTitle: form.seoTitle?.trim() || displayName,
      seoDescription: form.seoDescription?.trim() || blocks.map(b => b.content).join(' ').replace(/\s+/g, ' ').trim().slice(0, 150) || form.body.replace(/[#>*_-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 150),
      orgNameDisplayType: form.orgNameDisplayType || 'text',
      orgLogoWordmarkUrl: form.orgLogoWordmarkUrl?.trim() || '',
      orgLogoWordmarkAlt: form.orgLogoWordmarkAlt?.trim() || displayName,
      orgLogoWordmarkSize: form.orgLogoWordmarkSize ?? 60,
    };
    try {
      const page = selectedId
        ? await api.publicPages.update(selectedId, payload)
        : await api.publicPages.create(payload);
      setSelectedId(page.id);
      if (tenantCode) {
        const token = getToken();
        await fetch('/api/revalidate-public-page', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ tenantCode, slug: page.slug || generatedSlug }),
        }).catch(() => null);
      }
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

        {/* 全体の設定 */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button type="button" onClick={() => toggleSection('global')}
            className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
            <p className="text-xs font-bold text-gray-700">全体の設定</p>
            <svg className={`h-4 w-4 text-gray-400 transition-transform ${openSections.global ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {openSections.global && <div className="space-y-4 border-t border-gray-100 p-4">
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
          {/* 背景透明度 */}
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs font-bold text-gray-500">透明度</span>
            <input type="range" min="10" max="100" step="5" value={backgroundOpacity}
              onChange={(e) => setForm((p) => ({ ...p, backgroundOpacity: Number(e.target.value) }))}
              className="flex-1 accent-[#06C755]" />
            <span className="w-8 text-right text-xs text-gray-400">{backgroundOpacity}%</span>
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
          </div>}
        </div>

        {/* ヘッダー */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button type="button" onClick={() => toggleSection('header')}
            className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
            <p className="text-xs font-bold text-gray-700">ヘッダー</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">{imageUrls.length}/3</span>
              <svg className={`h-4 w-4 text-gray-400 transition-transform ${openSections.header ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </button>
          {openSections.header && <div className="space-y-4 border-t border-gray-100 p-4">
          {/* ロゴ / ワードマーク */}
          <div className="space-y-3 rounded-lg bg-gray-50 p-3">
            <p className="text-[11px] font-bold text-gray-400">団体名の表示方法</p>
            <div className="flex gap-1.5">
              {([['text', 'テキスト'], ['image', 'ロゴ画像'], ['both', '両方']] as const).map(([val, lbl]) => (
                <button key={val} type="button"
                  onClick={() => setForm(p => ({ ...p, orgNameDisplayType: val }))}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition ${form.orgNameDisplayType === val ? 'border-[#06C755] bg-[#06C755]/10 text-[#06C755]' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100'}`}>
                  {lbl}
                </button>
              ))}
            </div>
            {(form.orgNameDisplayType === 'image' || form.orgNameDisplayType === 'both') && (
              <div className="space-y-2">
                <input ref={logoUploadRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }} />
                {form.orgLogoWordmarkUrl ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-1.5">
                    <div className="rounded bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] bg-[length:12px_12px] p-2">
                      <img src={form.orgLogoWordmarkUrl} alt={form.orgLogoWordmarkAlt || displayName}
                        className="mx-auto max-h-20 max-w-full object-contain" />
                    </div>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => logoUploadRef.current?.click()} disabled={logoUploading || logoTrimming}
                        className="flex-1 rounded border border-gray-200 bg-gray-50 py-1 text-[11px] text-gray-500 hover:bg-gray-100 disabled:opacity-40">
                        {logoUploading ? 'アップロード中...' : '変更'}
                      </button>
                      <button type="button" onClick={handleLogoTrim} disabled={logoUploading || logoTrimming}
                        className="flex-1 rounded border border-gray-200 bg-gray-50 py-1 text-[11px] text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                        title="背景色を自動検出して透明化し、余白をトリムします">
                        {logoTrimming ? '処理中...' : '背景を透明化'}
                      </button>
                    </div>
                    <button type="button" onClick={() => setForm(p => ({ ...p, orgLogoWordmarkUrl: '' }))}
                      className="w-full rounded py-0.5 text-[11px] text-red-400 hover:text-red-600">
                      削除
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => logoUploadRef.current?.click()} disabled={logoUploading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-white py-5 text-sm text-gray-400 hover:border-[#06C755] hover:text-[#06C755] transition disabled:opacity-50">
                    {logoUploading ? 'アップロード中...' : 'PNG / SVG をアップロード'}
                  </button>
                )}
                <label className="block">
                  <span className="mb-1 flex items-center justify-between text-[11px] text-gray-400">
                    <span>表示サイズ</span>
                    <span className="font-bold">{form.orgLogoWordmarkSize ?? 60}px</span>
                  </span>
                  <input type="range" min="20" max="200" step="4" value={form.orgLogoWordmarkSize ?? 60}
                    onChange={e => setForm(p => ({ ...p, orgLogoWordmarkSize: Number(e.target.value) }))}
                    className="w-full accent-[#06C755]" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-gray-400">alt テキスト（SEO用）</span>
                  <input value={form.orgLogoWordmarkAlt ?? ''} placeholder={displayName}
                    onChange={e => setForm(p => ({ ...p, orgLogoWordmarkAlt: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                </label>
              </div>
            )}
          </div>
          {/* タイトル / サブタイトル */}
          <div className="space-y-5 rounded-lg bg-gray-50 p-3">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400">タイトル（団体名）</p>
              <input value={displayName} readOnly
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-500" />
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
              <label className="block">
                <span className="mb-1 flex items-center justify-between text-xs text-gray-500">
                  <span>文字サイズ</span>
                  <span className="font-bold">{titleFontSize}px</span>
                </span>
                <input type="range" min="18" max="48" step="1" value={titleFontSize}
                  onChange={(e) => setForm((p) => ({ ...p, titleSize: e.target.value }))}
                  className="w-full accent-[#06C755]" />
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">色</span>
                <input type="color" value={form.titleColor || textColor}
                  onChange={(e) => setForm((p) => ({ ...p, titleColor: e.target.value }))}
                  className="h-8 w-10 cursor-pointer rounded border border-gray-200 bg-white p-0.5" />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-gray-400">サブタイトル</span>
                <textarea value={form.subtitle ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                  placeholder="例：初心者歓迎の社会人サークル"
                  rows={5}
                  className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
              </label>
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
              <label className="block">
                <span className="mb-1 flex items-center justify-between text-xs text-gray-500">
                  <span>文字サイズ</span>
                  <span className="font-bold">{subtitleFontSize}px</span>
                </span>
                <input type="range" min="11" max="28" step="1" value={subtitleFontSize}
                  onChange={(e) => setForm((p) => ({ ...p, subtitleSize: e.target.value }))}
                  className="w-full accent-[#06C755]" />
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">色</span>
                <input type="color" value={form.subtitleColor || textColor}
                  onChange={(e) => setForm((p) => ({ ...p, subtitleColor: e.target.value }))}
                  className="h-8 w-10 cursor-pointer rounded border border-gray-200 bg-white p-0.5" />
              </div>
              <label className="block">
                <span className="mb-1 flex items-center justify-between text-xs text-gray-500">
                  <span>タイトルとの間隔</span>
                  <span className="font-bold">{subtitleGap}px</span>
                </span>
                <input type="range" min="0" max="48" step="2" value={subtitleGap}
                  onChange={(e) => setForm((p) => ({ ...p, subtitleMarginTop: Number(e.target.value) }))}
                  className="w-full accent-[#06C755]" />
              </label>
            </div>
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
                  <div className="mt-1.5 flex items-center gap-1">
                    <button type="button" disabled={i === 0}
                      onClick={() => setForm((prev) => {
                        const urls = [...(prev.imageUrls ?? [])];
                        const caps = [...(prev.imageCaptions ?? [])];
                        [urls[i - 1], urls[i]] = [urls[i], urls[i - 1]];
                        [caps[i - 1], caps[i]] = [caps[i], caps[i - 1]];
                        return { ...prev, imageUrls: urls, imageCaptions: caps, coverImageUrl: urls[0] ?? '' };
                      })}
                      className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-xs text-gray-400 disabled:opacity-30 hover:enabled:bg-gray-100">
                      ←
                    </button>
                    <button type="button" disabled={i === imageUrls.length - 1}
                      onClick={() => setForm((prev) => {
                        const urls = [...(prev.imageUrls ?? [])];
                        const caps = [...(prev.imageCaptions ?? [])];
                        [urls[i + 1], urls[i]] = [urls[i], urls[i + 1]];
                        [caps[i + 1], caps[i]] = [caps[i], caps[i + 1]];
                        return { ...prev, imageUrls: urls, imageCaptions: caps, coverImageUrl: urls[0] ?? '' };
                      })}
                      className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-white text-xs text-gray-400 disabled:opacity-30 hover:enabled:bg-gray-100">
                      →
                    </button>
                    <input
                      value={imageCaptions[i] ?? ''}
                      onChange={(e) => setForm((prev) => {
                        const captions = [...(prev.imageCaptions ?? [])];
                        captions[i] = e.target.value.slice(0, 80);
                        return { ...prev, imageCaptions: captions.slice(0, 3) };
                      })}
                      placeholder="画像説明（任意）"
                      className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                    />
                  </div>
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
            {heroImageMode !== 'background' && (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-bold text-gray-400">セクションの順番</p>
                <div className="space-y-1.5">
                  {(form.sectionOrder ?? [...DEFAULT_SECTION_ORDER]).map((key, i, arr) => (
                    <div key={key} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                      <span className="flex-1 text-xs font-bold text-gray-700">{SECTION_LABELS[key] ?? key}</span>
                      <button type="button" disabled={i === 0}
                        onClick={() => setForm(p => {
                          const a = [...(p.sectionOrder ?? [...DEFAULT_SECTION_ORDER])];
                          [a[i - 1], a[i]] = [a[i], a[i - 1]];
                          return { ...p, sectionOrder: a };
                        })}
                        className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-xs text-gray-400 disabled:opacity-30 hover:enabled:bg-gray-100">↑</button>
                      <button type="button" disabled={i === arr.length - 1}
                        onClick={() => setForm(p => {
                          const a = [...(p.sectionOrder ?? [...DEFAULT_SECTION_ORDER])];
                          [a[i + 1], a[i]] = [a[i], a[i + 1]];
                          return { ...p, sectionOrder: a };
                        })}
                        className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-xs text-gray-400 disabled:opacity-30 hover:enabled:bg-gray-100">↓</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {heroImageMode === 'background' && (
              <div className="mt-3 space-y-4">
                {/* 画像の焦点位置: ドラッグで調整 */}
                {imageUrls[0] && (
                  <div>
                    <p className="mb-1.5 text-[11px] font-bold text-gray-400">画像の位置</p>
                    <div
                      className="relative h-36 w-full overflow-hidden rounded-xl cursor-grab active:cursor-grabbing select-none"
                      style={{ touchAction: 'none' }}
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        heroFocalDragRef.current = { startX: e.clientX, startY: e.clientY, startFocal: parseFocal(form.heroImagePosition) };
                      }}
                      onPointerMove={(e) => {
                        if (!heroFocalDragRef.current) return;
                        const dx = e.clientX - heroFocalDragRef.current.startX;
                        const dy = e.clientY - heroFocalDragRef.current.startY;
                        const x = Math.round(Math.min(100, Math.max(0, heroFocalDragRef.current.startFocal.x - dx * 0.5)));
                        const y = Math.round(Math.min(100, Math.max(0, heroFocalDragRef.current.startFocal.y - dy * 0.5)));
                        setForm(p => ({ ...p, heroImagePosition: `${x}% ${y}%` }));
                      }}
                      onPointerUp={() => { heroFocalDragRef.current = null; }}
                    >
                      <img src={imageUrls[0]} alt="" draggable={false}
                        className="pointer-events-none h-full w-full object-cover"
                        style={{ objectPosition: form.heroImagePosition ?? '50% 50%' }} />
                      <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 hover:opacity-100 transition-opacity">
                        <div className="rounded-full bg-black/40 px-2 py-1 text-[10px] text-white">ドラッグで調整</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* テキスト位置: 右プレビューでドラッグ */}
                <p className="text-[11px] text-gray-400">テキスト位置は右のプレビューでドラッグして調整できます</p>

                {/* ナビボタン位置 */}
                <div>
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
              <p className="mb-2 text-[11px] font-bold text-gray-400">枠スタイル</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {([{ label: '角丸', r: 8 }, { label: '四角', r: 0 }, { label: 'まる', r: 50 }] as const).map((p) => (
                  <button key={p.r} type="button"
                    onClick={() => setForm((prev) => ({ ...prev, buttonRadius: p.r }))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${btnRadius === p.r ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    style={btnRadius === p.r ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                    {p.label}
                  </button>
                ))}
                <button type="button"
                  onClick={() => setForm((p) => ({ ...p, buttonStyle: buttonStyle === 'double' ? 'rounded' : 'double' }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${buttonStyle === 'double' ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  style={buttonStyle === 'double' ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                  二重枠
                </button>
              </div>
              <label className="block">
                <span className="mb-1 flex items-center justify-between text-xs text-gray-500">
                  <span>角丸の大きさ</span>
                  <span className="font-bold">{btnRadius}px</span>
                </span>
                <input type="range" min="0" max="50" step="1" value={btnRadius}
                  onChange={(e) => setForm((p) => ({ ...p, buttonRadius: Number(e.target.value) }))}
                  className="w-full accent-[#06C755]" />
              </label>
            </div>
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
          </div>
          {/* ナビラベル */}
          <div className="border-t border-gray-100 pt-4">
            <p className="mb-2 text-[11px] font-bold text-gray-400">ナビラベル・リンク先</p>
            <div className="space-y-2">
              {[
                { labelField: 'aboutLabel' as const, urlField: 'navAboutUrl' as const, placeholder: '団体詳細', defaultUrl: '#about' },
                { labelField: 'reserveLabel' as const, urlField: 'navReserveUrl' as const, placeholder: '予約する', defaultUrl: '#reserve' },
                { labelField: 'blogLabel' as const, urlField: 'navBlogUrl' as const, placeholder: 'ブログ', defaultUrl: '#blog' },
                { labelField: 'contactLabel' as const, urlField: 'navContactUrl' as const, placeholder: 'お問い合わせ', defaultUrl: '#contact' },
              ].map(({ labelField, urlField, placeholder, defaultUrl }) => (
                <div key={labelField} className="flex gap-1.5">
                  <input value={(form[labelField] as string) ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, [labelField]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-24 shrink-0 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                  <input value={(form[urlField] as string) ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, [urlField]: e.target.value }))}
                    placeholder={`リンク先 (空欄: ${defaultUrl})`}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                </div>
              ))}
            </div>
          </div>
          </div>}
        </div>

        {/* 構成 */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button type="button" onClick={() => toggleSection('structure')}
            className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
            <p className="text-xs font-bold text-gray-700">構成</p>
            <svg className={`h-4 w-4 text-gray-400 transition-transform ${openSections.structure ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {openSections.structure && <div className="space-y-3 border-t border-gray-100 p-4">
          {/* 予約表示スタイルは予約管理ページで設定 */}
          <div>
            <label className="block">
              <span className="mb-2 flex items-center justify-between text-xs text-gray-500">
                <span className="font-bold text-gray-400">文字サイズ</span>
                <span className="font-bold">{bodyFontSize}px</span>
              </span>
              <input type="range" min="12" max="24" step="1" value={bodyFontSize}
                onChange={(e) => setForm((p) => ({ ...p, bodySize: e.target.value }))}
                className="w-full accent-[#06C755]" />
            </label>
          </div>

          {/* ブロック追加ボタン */}
          <div>
            <p className="mb-2 text-[11px] font-bold text-gray-400">ブロック追加（最大4つ）</p>
            {blocks.length < 4 ? (
              <div className="flex flex-wrap gap-2">
                {(['text', 'media-text', 'profile', 'feature', 'sns', 'faq'] as BlockType[]).map((type) => (
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
            {blocks.map((block, index) => {
              const blockFontSize = resolvePxSize(block.fontSize, bodyFontSize, 10, 28, BODY_SIZE_LEGACY);
              return (
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
                        <div className="space-y-1">
                          {/* ドラッグで切り取り位置を調整 */}
                          <div
                            className={`relative overflow-hidden cursor-grab active:cursor-grabbing select-none ${block.type === 'profile' ? 'h-24 w-24 rounded-full' : 'h-32 w-full rounded-xl'}`}
                            style={{ touchAction: 'none' }}
                            onPointerDown={(e) => {
                              e.currentTarget.setPointerCapture(e.pointerId);
                              blockFocalDragRef.current = { startX: e.clientX, startY: e.clientY, startFocal: parseFocal(block.imageFocal) };
                            }}
                            onPointerMove={(e) => {
                              if (!blockFocalDragRef.current) return;
                              const dx = e.clientX - blockFocalDragRef.current.startX;
                              const dy = e.clientY - blockFocalDragRef.current.startY;
                              const x = Math.round(Math.min(100, Math.max(0, blockFocalDragRef.current.startFocal.x - dx * 0.5)));
                              const y = Math.round(Math.min(100, Math.max(0, blockFocalDragRef.current.startFocal.y - dy * 0.5)));
                              updateBlock(block.id, { imageFocal: `${x}% ${y}%` });
                            }}
                            onPointerUp={() => { blockFocalDragRef.current = null; }}
                          >
                            <img src={block.imageUrl} alt="" draggable={false}
                              className="pointer-events-none h-full w-full object-cover"
                              style={{ objectPosition: block.imageFocal ?? '50% 50%' }} />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <div className="rounded-full bg-black/40 px-2 py-1 text-[10px] text-white">ドラッグで調整</div>
                            </div>
                          </div>
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

                  {/* FAQ フィールド */}
                  {block.type === 'faq' && (
                    <div className="space-y-2">
                      {(block.faqItems ?? []).map((item, j) => (
                        <div key={j} className="rounded-lg border border-gray-100 bg-white p-2 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="shrink-0 text-[11px] font-bold text-[#06C755]">Q</span>
                            <input value={item.q}
                              onChange={(e) => { const items = [...(block.faqItems ?? [])]; items[j] = { ...items[j], q: e.target.value }; updateBlock(block.id, { faqItems: items }); }}
                              placeholder="質問を入力"
                              className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#06C755]" />
                            <button type="button" onClick={() => { const items = (block.faqItems ?? []).filter((_, k) => k !== j); updateBlock(block.id, { faqItems: items }); }}
                              className="shrink-0 text-gray-400 hover:text-red-500 text-xs">×</button>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="shrink-0 mt-1 text-[11px] font-bold text-gray-400">A</span>
                            <textarea value={item.a} rows={2}
                              onChange={(e) => { const items = [...(block.faqItems ?? [])]; items[j] = { ...items[j], a: e.target.value }; updateBlock(block.id, { faqItems: items }); }}
                              placeholder="回答を入力"
                              className="flex-1 resize-y rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#06C755]" />
                          </div>
                        </div>
                      ))}
                      <button type="button"
                        onClick={() => updateBlock(block.id, { faqItems: [...(block.faqItems ?? []), { q: '', a: '' }] })}
                        className="w-full rounded-lg border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:border-[#06C755] hover:text-[#06C755] transition">
                        + Q&A 追加
                      </button>
                    </div>
                  )}

                  {block.type !== 'sns' && block.type !== 'faq' && (
                    <label className="block">
                      <span className="mb-1 flex items-center justify-between text-xs text-gray-500">
                        <span className="font-bold text-gray-400">文字サイズ</span>
                        <span className="font-bold">{blockFontSize}px</span>
                      </span>
                      <input type="range" min="10" max="28" step="1" value={blockFontSize}
                        onChange={(e) => updateBlock(block.id, { fontSize: e.target.value })}
                        className="w-full accent-[#06C755]" />
                    </label>
                  )}

                  {/* SNS フィールド */}
                  {block.type === 'sns' ? (
                    <div className="space-y-3">
                      <p className="text-[11px] font-bold text-gray-400">リンクボタン（プロフィール URL）</p>
                      {[
                        { urlKey: 'instagramUrl', labelKey: 'instagramLabel', name: 'Instagram', urlPlaceholder: 'https://www.instagram.com/yourname', labelPlaceholder: 'Instagramでフォロー' },
                        { urlKey: 'xUrl', labelKey: 'xLabel', name: 'X (Twitter)', urlPlaceholder: 'https://x.com/yourname', labelPlaceholder: 'Xでフォロー' },
                        { urlKey: 'threadsUrl', labelKey: 'threadsLabel', name: 'Threads', urlPlaceholder: 'https://www.threads.net/@yourname', labelPlaceholder: 'Threadsでフォロー' },
                      ].map(({ urlKey, labelKey, name, urlPlaceholder, labelPlaceholder }) => (
                        <div key={urlKey} className="space-y-1">
                          <span className="block text-[11px] font-bold text-gray-500">{name}</span>
                          <input type="url" value={(block as any)[urlKey] ?? ''}
                            onChange={(e) => updateBlock(block.id, { [urlKey]: e.target.value })}
                            placeholder={urlPlaceholder}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                          <input type="text" value={(block as any)[labelKey] ?? ''}
                            onChange={(e) => updateBlock(block.id, { [labelKey]: e.target.value })}
                            placeholder={labelPlaceholder}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                        </div>
                      ))}
                      <p className="text-[11px] font-bold text-gray-400">埋め込み（任意）</p>
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-gray-500">X ユーザー名（タイムライン表示）</span>
                        <input type="text" value={block.xUsername ?? ''}
                          onChange={(e) => updateBlock(block.id, { xUsername: e.target.value.replace(/^@/, '') })}
                          placeholder="yourname（@ なし）"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-gray-500">Instagram 投稿 URL（投稿を埋め込み）</span>
                        <input type="url" value={block.instagramEmbedUrl ?? ''}
                          onChange={(e) => updateBlock(block.id, { instagramEmbedUrl: e.target.value })}
                          placeholder="https://www.instagram.com/p/..."
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-gray-500">Threads 投稿 URL（投稿を埋め込み）</span>
                        <input type="url" value={block.threadsEmbedUrl ?? ''}
                          onChange={(e) => updateBlock(block.id, { threadsEmbedUrl: e.target.value })}
                          placeholder="https://www.threads.net/@yourname/post/..."
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                      </label>
                    </div>
                  ) : block.type !== 'faq' ? (
                  /* テキスト */
                  <textarea value={block.content}
                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    rows={3}
                    placeholder={block.type === 'profile' ? '名前や紹介文' : block.type === 'feature' ? 'キャプションや説明文' : '内容を入力'}
                    className="w-full resize-y break-words rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                    style={{ fontSize: blockFontSize, lineHeight: 1.7, overflowWrap: 'anywhere' }} />
                  ) : null}
                </div>
              );
            })}
            {blocks.length === 0 && (
              <p className="py-4 text-center text-xs text-gray-400">上のボタンからブロックを追加してください</p>
            )}
          </div>
          </div>}
        </div>

        {/* 予約管理 */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <button type="button" onClick={() => toggleSection('reserve')}
            className="flex w-full items-center justify-between px-4 py-3 transition hover:bg-gray-50">
            <p className="text-xs font-bold text-gray-700">予約管理</p>
            <svg className={`h-4 w-4 text-gray-400 transition-transform ${openSections.reserve ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {openSections.reserve && (
            <div className="space-y-4 border-t border-gray-100 p-4">
              <div className={`rounded-lg px-3 py-2 text-xs font-bold ${hasReserveSection ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                {reserveActionStyle === 'line'
                  ? reserveEvents.length > 0
                    ? `LINEで予約：カレンダーを表示→タップで公式LINE追加（${reserveEvents.length}件）`
                    : 'LINEで予約する：公開サイトにはLINE予約ボタンを表示します'
                  : hasReserveSection
                    ? `公開中イベント ${reserveEvents.length}件：公開サイトに表示されます`
                    : '公開中イベント 0件：公開サイトでは非表示になります'}
              </div>
              <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                <p className="text-[11px] font-bold text-gray-400">イベントカードの見た目</p>
                <label className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <span className="text-[11px] font-bold text-gray-500">カード背景色</span>
                  <input
                    type="color"
                    value={form.reserveEventCardBg?.trim() || '#ffffff'}
                    onChange={(e) => setForm((p) => ({ ...p, reserveEventCardBg: e.target.value }))}
                    className="h-7 w-9 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                  />
                </label>
                <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-[11px] font-bold text-gray-400">予約スタイル</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([
                      {
                        value: 'comiu' as const,
                        label: 'COMIUで予約管理',
                        description: '予約画面へ進み、参加者をCOMIUのDBに登録します。',
                      },
                      {
                        value: 'line' as const,
                        label: 'LINEで予約する',
                        description: 'イベントやカレンダーをタップすると公式LINEへ誘導します。',
                      },
                    ]).map((option) => {
                      const active = reserveActionStyle === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, reserveActionStyle: option.value }))}
                          className={`rounded-xl border px-3 py-3 text-left transition ${
                            active
                              ? 'border-[#06C755] bg-green-50 text-green-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <span className="block text-sm font-bold">{option.label}</span>
                          <span className="mt-1 block text-[11px] leading-relaxed">{option.description}</span>
                        </button>
                      );
                    })}
                  </div>
                  {reserveActionStyle === 'line' && (
                    <label className="block space-y-1">
                      <span className="text-[11px] font-bold text-gray-500">公式LINE URL</span>
                      <input
                        type="url"
                        value={form.reserveLineUrl ?? ''}
                        onChange={(e) => setForm((p) => ({ ...p, reserveLineUrl: e.target.value }))}
                        placeholder="https://lin.ee/..."
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                      />
                      <span className="block text-[11px] leading-relaxed text-gray-400">
                        未設定の場合は、お問い合わせ画面へつながります。
                      </span>
                    </label>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { label: 'イベント名', field: 'reserveEventTitleColor' as const, fallback: '#111827' },
                    { label: '日時', field: 'reserveEventDateColor' as const, fallback: '#4B5563' },
                    { label: '場所・料金', field: 'reserveEventMetaColor' as const, fallback: '#6B7280' },
                  ].map(({ label, field, fallback }) => (
                    <label key={field} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                      <span className="text-[11px] font-bold text-gray-500">{label}</span>
                      <input
                        type="color"
                        value={form[field]?.trim() || fallback}
                        onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                        className="h-7 w-9 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 活動ブログ */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <button type="button" onClick={() => toggleSection('blog')}
            className="flex w-full items-center justify-between px-4 py-3 transition hover:bg-gray-50">
            <p className="text-xs font-bold text-gray-700">活動ブログ</p>
            <svg className={`h-4 w-4 text-gray-400 transition-transform ${openSections.blog ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {openSections.blog && (
            <div className="space-y-4 border-t border-gray-100 p-4">
              <div className={`rounded-lg px-3 py-2 text-xs font-bold ${hasBlogSection ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                {hasBlogSection
                  ? `公開記事 ${blogPosts.length}件：公開サイトに表示されます`
                  : '公開記事 0件：公開サイトでは非表示になります'}
              </div>
              <label className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="text-[11px] font-bold text-gray-500">記事カードの背景色</span>
                <input
                  type="color"
                  value={form.blogPostCardBg?.trim() || '#ffffff'}
                  onChange={(e) => setForm((p) => ({ ...p, blogPostCardBg: e.target.value }))}
                  className="h-7 w-9 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                />
              </label>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button type="button" onClick={() => toggleSection('footer')}
            className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
            <p className="text-xs font-bold text-gray-700">フッター</p>
            <svg className={`h-4 w-4 text-gray-400 transition-transform ${openSections.footer ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {openSections.footer && (
            <div className="space-y-4 border-t border-gray-100 p-4">
              {/* COMIU固定メッセージ */}
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-[11px] font-bold text-gray-400 mb-1">COMIUメッセージ（固定）</p>
                <p className="text-xs" style={{ color: form.footerTextColor?.trim() || '#111827' }}>Powered by <span className="font-bold">COMIU</span></p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-400">文字色</span>
                  <input type="color" value={form.footerTextColor || '#111827'}
                    onChange={(e) => setForm((p) => ({ ...p, footerTextColor: e.target.value }))}
                    className="h-8 w-11 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
                </div>
              </div>
              {/* 問い合わせボタン */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-gray-400">問い合わせボタン</p>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <input type="color" value={form.footerContactColor || accentColor}
                      onChange={(e) => setForm((p) => ({ ...p, footerContactColor: e.target.value }))}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
                    文字色
                    <input type="color" value={form.footerContactTextColor || '#111827'}
                      onChange={(e) => setForm((p) => ({ ...p, footerContactTextColor: e.target.value }))}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
                  </label>
                  <input type="text" value={form.footerContact ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, footerContact: e.target.value }))}
                    placeholder="メール・電話番号（空欄=アプリ内メッセージ）"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                </div>
                <input type="text" value={form.contactMessage ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, contactMessage: e.target.value }))}
                  placeholder="ボタン下のサブテキスト（例：LINEまたはアプリ内でお気軽に）"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-400">説明文の色</span>
                  <input type="color" value={form.contactMessageColor || '#111827'}
                    onChange={(e) => setForm((p) => ({ ...p, contactMessageColor: e.target.value }))}
                    className="h-8 w-11 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
                </div>
              </div>
              {/* 公式SNSリンク */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-gray-400">公式SNSリンク</p>
                {([
                  { key: 'footerInstagram' as const, label: 'Instagram', placeholder: 'https://www.instagram.com/...' },
                  { key: 'footerX' as const, label: 'X', placeholder: 'https://x.com/...' },
                ] as const).map(({ key, label, placeholder }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-xs text-gray-500">{label}</span>
                    <input type="url" value={form[key] ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                  </div>
                ))}
              </div>
            </div>
          )}
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
            静止サイト型
          </span>
        </div>
        <div className="overflow-x-hidden rounded-2xl bg-gray-100 p-2 shadow-inner">
        <div className="mx-auto min-w-0 max-w-[390px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style={{ fontFamily, backgroundColor: bgColor }}>

          {/* 静止サイト型 preview */}
          <>
              {heroImageMode === 'background' && imageUrls[0] ? (
                /* 背景モード: 大きいヒーロー */
                <>
                  <div ref={heroRef} className="relative overflow-hidden select-none" style={{ minHeight: 220 }}>
                    <div className="absolute inset-0" style={{ backgroundImage: `url(${imageUrls[0]})`, backgroundSize: 'cover', backgroundPosition: form.heroImagePosition ?? 'center center' }} />
                    <div className="absolute inset-0" style={{ backgroundColor: heroOverlayBg }} />
                    {/* ドラッグ可能テキストブロック */}
                    <div
                      className="absolute z-10 group"
                      style={{ left: `${form.heroTextX ?? 5}%`, top: `${form.heroTextY ?? 65}%`, width: `${form.heroTextWidth ?? 85}%` }}
                    >
                      <div
                        className="cursor-move rounded border-2 border-dashed border-transparent p-1 transition-colors group-hover:border-white/60"
                        onMouseDown={handleTextDrag}
                      >
                        <p className="font-bold drop-shadow" style={titleTextStyle}>
                          {form.orgLogoWordmarkUrl && form.orgNameDisplayType !== 'text' ? (
                            <>
                              <img src={form.orgLogoWordmarkUrl} alt={form.orgLogoWordmarkAlt || displayName}
                                className="max-w-full object-contain drop-shadow"
                                style={{ height: form.orgLogoWordmarkSize ?? 60, maxWidth: '100%' }} />
                              {form.orgNameDisplayType === 'both' && <span>{displayName}</span>}
                            </>
                          ) : displayName}
                        </p>
                        {heroNavPosition === 'inside' && (
                          <div>
                            <div className={`mt-3 text-[10px] font-bold ${previewButtonLayoutClass}`} style={previewButtonGridStyle}>
                              {visibleNavItems.map((item) => (
                                <span key={item.key} className={`flex items-center justify-center truncate px-1 text-center leading-tight ${getBtnShapeClass(buttonStyle)}`} style={{ height: btnIsPill ? btnSize : undefined, minHeight: btnSize, borderRadius: btnIsPill ? 9999 : btnRadius, borderColor: btnBorderColor, color: btnTextColor, boxShadow: btnBoxShadow, ...buttonBgStyle }}>{item.label}</span>
                              ))}
                            </div>
                            <div className="mt-1 flex cursor-ns-resize select-none touch-none justify-center py-0.5"
                              style={{ touchAction: 'none' }}
                              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dragRef.current = { startY: e.clientY, startSize: btnSize }; }}
                              onPointerMove={(e) => { if (!dragRef.current) return; const d = e.clientY - dragRef.current.startY; setForm(p => ({ ...p, buttonSize: Math.round(Math.min(80, Math.max(24, dragRef.current!.startSize + d))) })); }}
                              onPointerUp={() => { dragRef.current = null; }}
                            ><div className="h-0.5 w-6 rounded bg-white/50" /></div>
                          </div>
                        )}
                      </div>
                      {/* リサイズハンドル（右端） */}
                      <div
                        className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-4 cursor-ew-resize items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onMouseDown={handleTextResize}
                      >
                        <div className="h-5 w-1 rounded-full bg-white/90 shadow" />
                        <div className="h-5 w-1 rounded-full bg-white/90 shadow" />
                      </div>
                    </div>
                    {/* 独立サブタイトル */}
                    {form.subtitle?.trim() && (
                      <div
                        className="absolute z-10 cursor-move select-none"
                        style={{
                          left: `${form.subtitleHeroX ?? 5}%`,
                          top: `${form.subtitleHeroY ?? Math.min(90, (form.heroTextY ?? 65) + 15)}%`,
                          width: `${form.heroTextWidth ?? 85}%`,
                          touchAction: 'none',
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          subtitleDragRef.current = {
                            startX: e.clientX,
                            startY: e.clientY,
                            startSX: form.subtitleHeroX ?? 5,
                            startSY: form.subtitleHeroY ?? Math.min(90, (form.heroTextY ?? 65) + 15),
                          };
                        }}
                        onPointerMove={(e) => {
                          if (!subtitleDragRef.current || !heroRef.current) return;
                          const rect = heroRef.current.getBoundingClientRect();
                          const { startX, startY, startSX, startSY } = subtitleDragRef.current;
                          const nx = Math.max(0, Math.min(90, Math.round(startSX + ((e.clientX - startX) / rect.width) * 100)));
                          const ny = Math.max(0, Math.min(90, Math.round(startSY + ((e.clientY - startY) / rect.height) * 100)));
                          setForm(p => ({ ...p, subtitleHeroX: nx, subtitleHeroY: ny }));
                        }}
                        onPointerUp={() => { subtitleDragRef.current = null; }}
                      >
                        <div className="rounded border-2 border-dashed border-white/50 p-1">
                          <p className="drop-shadow" style={subtitleTextStyle}>{form.subtitle.trim()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {heroNavPosition === 'below' && (
                    <div className="border-b border-gray-100 px-3 pb-1 pt-3">
                      <div className={`text-[11px] font-bold ${previewButtonLayoutClass}`} style={previewButtonGridStyle}>
                        {visibleNavItems.map((item) => (
                          <span key={item.key} className={`flex items-center justify-center truncate px-2 text-center leading-tight ${getBtnShapeClass(buttonStyle)}`} style={{ height: btnIsPill ? btnSize : undefined, minHeight: btnSize, borderRadius: btnIsPill ? 9999 : btnRadius, borderColor: btnBorderColor, color: btnTextColor, boxShadow: btnBoxShadow, ...buttonBgStyle }}>{item.label}</span>
                        ))}
                      </div>
                      <div className="mt-1 flex cursor-ns-resize select-none touch-none justify-center py-1"
                        style={{ touchAction: 'none' }}
                        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dragRef.current = { startY: e.clientY, startSize: btnSize }; }}
                        onPointerMove={(e) => { if (!dragRef.current) return; const d = e.clientY - dragRef.current.startY; setForm(p => ({ ...p, buttonSize: Math.round(Math.min(80, Math.max(24, dragRef.current!.startSize + d))) })); }}
                        onPointerUp={() => { dragRef.current = null; }}
                      ><div className="h-0.5 w-8 rounded bg-gray-300" /></div>
                    </div>
                  )}
                </>
              ) : (
                /* 通常モード: セクション順序に従って描画 */
                <div className="border-b border-gray-100">
                  {(form.sectionOrder ?? [...DEFAULT_SECTION_ORDER]).map((key) => {
                    if (key === 'title') return (
                      <div key="title" className="px-4 pt-3 pb-1">
                        <span className="block font-bold leading-5" style={{ ...titleTextStyle, lineHeight: 1.25 }}>
                          {form.orgLogoWordmarkUrl && form.orgNameDisplayType !== 'text' ? (
                            <>
                              <img src={form.orgLogoWordmarkUrl} alt={form.orgLogoWordmarkAlt || displayName}
                                className="max-w-full object-contain"
                                style={{ height: form.orgLogoWordmarkSize ?? 60, maxWidth: '100%' }} />
                              {form.orgNameDisplayType === 'both' && <span>{displayName}</span>}
                            </>
                          ) : displayName}
                        </span>
                      </div>
                    );
                    if (key === 'subtitle') return form.subtitle?.trim() ? (
                      <div key="subtitle" className="px-4 py-1">
                        <p className="whitespace-pre-wrap" style={{ ...subtitleTextStyle, textAlign: titleAlign }}>
                          {form.subtitle.trim()}
                        </p>
                      </div>
                    ) : null;
                    if (key === 'nav') return (
                      <div key="nav" className="px-4 pb-1 pt-1">
                        <div className={`text-[11px] font-bold ${previewButtonLayoutClass}`} style={previewButtonGridStyle}>
                          {visibleNavItems.map((item) => (
                            <span key={item.key} className={`flex items-center justify-center truncate px-2 text-center leading-tight ${getBtnShapeClass(buttonStyle)}`} style={{ height: btnIsPill ? btnSize : undefined, minHeight: btnSize, borderRadius: btnIsPill ? 9999 : btnRadius, borderColor: btnBorderColor, color: btnTextColor, boxShadow: btnBoxShadow, ...buttonBgStyle }}>{item.label}</span>
                          ))}
                        </div>
                        <div className="mt-1 flex cursor-ns-resize select-none touch-none justify-center py-1"
                          style={{ touchAction: 'none' }}
                          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dragRef.current = { startY: e.clientY, startSize: btnSize }; }}
                          onPointerMove={(e) => { if (!dragRef.current) return; const d = e.clientY - dragRef.current.startY; setForm(p => ({ ...p, buttonSize: Math.round(Math.min(80, Math.max(24, dragRef.current!.startSize + d))) })); }}
                          onPointerUp={() => { dragRef.current = null; }}
                        ><div className="h-0.5 w-8 rounded bg-gray-300" /></div>
                      </div>
                    );
                    if (key === 'image') return imageUrls.length ? (
                      <div key="image" className="px-4 py-2">
                        <HeaderImagePreview
                          images={imageUrls}
                          captions={imageCaptions}
                          mode={heroImageMode}
                          overlayColor={heroOverlayColor}
                          overlayOpacity={heroOverlayOpacity}
                        />
                      </div>
                    ) : null;
                    return null;
                  })}
                </div>
              )}
              <div className="space-y-4 p-5">
                <div className="rounded-lg p-4" style={{ backgroundColor: navBg }}>
                  {renderPreviewBlocks()}
                </div>
                {hasReserveSection && (
                  <section className="rounded-lg p-4" style={{ backgroundColor: navBg }}>
                    <p className="text-sm font-bold" style={{ color: reserveTitleColor }}>{reserveSectionTitle}</p>
                    {reserveSectionLead && (
                      <p className="mt-1 text-xs leading-5" style={{ color: reserveLeadColor }}>{reserveSectionLead}</p>
                    )}
                    {reserveActionStyle === 'line' && reserveEvents.length === 0 ? (
                      <span
                        className="mt-3 inline-flex w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-bold"
                        style={{ backgroundColor: accentColor, borderColor: accentColor, color: '#fff' }}
                      >
                        LINEで予約する
                      </span>
                    ) : (
                      <ReservationViewShowcase
                        accentColor={accentColor}
                        buttonLabel={reserveActionStyle === 'line' ? 'LINEで友達追加して予約する' : navLabels.reserve}
                        viewStyle={form.reserveViewStyle}
                        events={reserveEvents}
                        href={reserveActionStyle === 'line' ? (form.reserveLineUrl?.trim() || form.navContactUrl?.trim() || '#') : undefined}
                        tenantCode={reserveActionStyle === 'line' ? undefined : tenantCode}
                        lineMode={reserveActionStyle === 'line'}
                        eventTitleColor={reserveEventTitleColor}
                        eventDateColor={reserveEventDateColor}
                        eventMetaColor={reserveEventMetaColor}
                        eventCardBg={reserveEventCardBg}
                        className="mt-3"
                      />
                    )}
                  </section>
                )}
                {hasBlogSection && (
                  <section className="rounded-lg p-4" style={{ backgroundColor: navBg }}>
                    <p className="text-sm font-bold" style={{ color: blogTitleColor }}>{blogSectionTitle}</p>
                    {blogSectionLead && (
                      <p className="mt-1 text-xs leading-5" style={{ color: blogLeadColor }}>{blogSectionLead}</p>
                    )}
                    <div className="mt-3 space-y-2">
                      {blogPosts.slice(0, 3).map((post) => {
                        const image = imgUrl(post.coverImageUrl ?? firstBlogImage(post.body), API_URL);
                        return (
                          <div key={post.id} className="flex gap-2 rounded-lg p-2 ring-1 ring-black/5" style={{ backgroundColor: blogPostCardBg }}>
                            {image && <img src={image} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" />}
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold" style={{ color: textColor }}>{post.title}</p>
                              {post.excerpt && <p className="mt-0.5 line-clamp-2 text-[10px] leading-4" style={{ color: blogLeadColor }}>{post.excerpt}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
                <div>
                  <div className="flex w-full items-center justify-center rounded-xl py-3 text-sm font-bold"
                    style={{ backgroundColor: form.footerContactColor?.trim() || accentColor, color: form.footerContactTextColor?.trim() || '#111827' }}>
                    {navLabels.contact}
                  </div>
                  {form.contactMessage?.trim() && (
                    <p className="mt-1.5 text-center text-[11px]" style={{ color: form.contactMessageColor?.trim() || '#111827' }}>
                      {form.contactMessage.trim()}
                    </p>
                  )}
                  <p className="mt-3 text-center text-[10px]" style={{ color: form.footerTextColor?.trim() || '#111827' }}>
                    Powered by <span className="font-bold">COMIU</span>
                  </p>
                </div>
              </div>
            </>
        </div>
        </div>
      </aside>
      </div>
    </form>
  );
}
