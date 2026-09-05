'use client';

import { Fragment, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { api, BlogPost, LiffEvent, PublicPageInput, Tenant, TenantReview } from '@/lib/api';
import { API_URL, SITE_URL } from '@/lib/config';
import { imgUrl } from '@/lib/imgUrl';
import { getToken } from '@/lib/auth';
import { SaveToast } from '@/components/ui/SaveToast';
import { ReservationViewShowcase, ReservationButton } from '@/components/public/ReservationViewShowcase';

type BlockType = 'text' | 'media-text' | 'profile' | 'feature' | 'sns' | 'faq';
interface FaqItem { q: string; a: string; }
interface Block {
  id: string;
  type: BlockType;
  content: string;
  imageUrl?: string;
  imagePosition?: 'left' | 'right';
  imageFocal?: string;
  imageSize?: 'small' | 'medium' | 'large';
  fontSize?: string;
  lineHeight?: number;
  letterSpacing?: number;
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
  faqCardBg?: string;
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

// InstagramやThreadsの「埋め込みコードをコピー」で取得できる<blockquote>一式を
// そのまま貼り付けても、埋め込み用のURLだけを自動で抜き出して使えるようにする。
// 通常のURLがそのまま貼られた場合はそのまま返す。
function extractEmbedUrl(pasted: string): string {
  const trimmed = pasted.trim();
  const permalinkMatch = trimmed.match(/data-instgrm-permalink="([^"]+)"/) ?? trimmed.match(/data-url="([^"]+)"/);
  if (permalinkMatch) return permalinkMatch[1];
  const hrefMatch = trimmed.match(/href="(https?:\/\/[^"]+)"/);
  if (trimmed.includes('<') && hrefMatch) return hrefMatch[1];
  return trimmed;
}

function firstBlogImage(body: string | null | undefined) {
  return body?.match(BLOG_IMAGE_RE)?.[1] ?? null;
}

// 公開サイト側のrenderLine（見出し・箇条書きの検知）とプレビューの見た目を揃えるための簡易版。
function renderPreviewLine(line: string, index: number, textColor: string, bodyClassName: string, textStyle: CSSProperties = {}) {
  const style: CSSProperties = { color: textColor, overflowWrap: 'anywhere', ...textStyle };
  const baseFontSize = typeof textStyle.fontSize === 'number' ? textStyle.fontSize : 16;
  const h3Match = line.match(/^###\s*(.*)$/);
  if (h3Match) return <h3 key={index} className={`font-bold ${index === 0 ? '' : 'mt-7'}`} style={{ color: textColor, fontSize: Math.round(baseFontSize * 1.25), letterSpacing: textStyle.letterSpacing }}>{h3Match[1]}</h3>;
  const h2Match = line.match(/^#{1,2}\s*(.*)$/);
  if (h2Match) return <h2 key={index} className={`font-bold ${index === 0 ? '' : 'mt-9'}`} style={{ color: textColor, fontSize: Math.round(baseFontSize * 1.5), letterSpacing: textStyle.letterSpacing }}>{h2Match[1]}</h2>;
  if (line.startsWith('- ')) return <li key={index} className="ml-5 list-disc break-words" style={style}>{line.slice(2)}</li>;
  if (!line.trim()) return <div key={index} className="h-3" />;
  return <p key={index} className={`${bodyClassName} break-words`} style={style}>{line}</p>;
}

const DEFAULT_SECTION_ORDER = ['name', 'logo', 'subtitle', 'nav', 'image'] as const;
type TitleLogoLayout = 'stacked' | 'inline';
const SECTION_LABELS: Record<string, string> = { name: '名前', logo: 'ロゴ', subtitle: 'サブタイトル', nav: 'ナビボタン', image: '写真' };

const DEFAULT_NAV_ORDER = ['about', 'blog', 'reserve', 'reviews', 'contact'] as const;
const NAV_ITEM_LABELS: Record<string, string> = { about: '団体詳細', blog: '活動ブログ', reserve: '予約する', reviews: '口コミ', contact: 'お問い合わせ' };
type CustomNavButton = { id: string; label: string; url: string };
function normalizeNavOrder(order: string[], customKeys: string[] = []): string[] {
  const allKeys = [...(DEFAULT_NAV_ORDER as readonly string[]), ...customKeys];
  return [
    ...order.filter((key) => allKeys.includes(key)),
    ...allKeys.filter((key) => !order.includes(key)),
  ];
}

const DEFAULT_CONTENT_ORDER = ['about', 'reserve', 'blog', 'reviews'] as const;
const CONTENT_SECTION_LABELS: Record<string, string> = { about: '構成', reserve: '予約ページ', blog: '活動ブログ', reviews: '口コミ' };
function normalizeContentOrder(order: string[]): string[] {
  return [
    ...order.filter((key) => (DEFAULT_CONTENT_ORDER as readonly string[]).includes(key)),
    ...DEFAULT_CONTENT_ORDER.filter((key) => !order.includes(key)),
  ];
}

function normalizeSectionOrder(order: string[]): string[] {
  return order.flatMap((key) => (key === 'title' ? ['name', 'logo'] : [key]));
}

function SubSection({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-100">
      <button type="button" onClick={onToggle}
        className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-left transition hover:bg-gray-100">
        <span className="text-xs font-bold text-gray-600">{label}</span>
        <svg className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="space-y-3 p-3">{children}</div>}
    </div>
  );
}

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
  bodyTextColor: '',
  navButtonTextColor: '',
  accentColor: '#06C755',
  backgroundColor: '#F7F8FA',
  backgroundOpacity: 100,
  navColor: '#F3F4F6',
  navOpacity: 100,
  imageLayout: 'slider',
  heroImageMode: 'fixed',
  heroNavPosition: 'below',
  heroOutsideKeys: ['nav'] as string[],
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
  reserveButtonBgColor: '',
  reserveButtonTextColor: '',
  reserveButtonBorderColor: '',
  globalBorderColor: '',
  globalRadius: 12,
  globalBorderWidth: 1,
  reserveActionStyle: 'comiu',
  reserveLineUrl: '',
  blogPostCardBg: '',
  blogPostTitleColor: '',
  blogTitle: '',
  blogLead: '',
  blogTitleColor: '',
  blogLeadColor: '',
  reviewsEnabled: true,
  reviewsLabel: '',
  reviewsTitle: '',
  reviewsLead: '',
  reviewsTitleColor: '',
  reviewsLeadColor: '',
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
  titleLogoLayout: 'stacked' as TitleLogoLayout,
  subtitleHeroX: 5,
  subtitleHeroY: null as unknown as number,
  sectionOrder: [...DEFAULT_SECTION_ORDER] as string[],
  navOrder: [...DEFAULT_NAV_ORDER] as string[],
  customNavButtons: [] as CustomNavButton[],
  contentOrder: [...DEFAULT_CONTENT_ORDER] as string[],
  blockOrder: [] as string[],
  displayFields: { location: true, price: true, capacity: false, description: true } as { location: boolean; price: boolean; capacity: boolean; description: boolean },
  slugLocked: false,
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

// Same px values as the leading-* classes above, expressed as a ratio of the given font size -
// used as the 行間 slider's starting position so existing content doesn't visually jump before
// the organizer has touched it.
const LEADING_CLASS_PX: Record<string, number> = { 'leading-7': 28, 'leading-8': 32, 'leading-9': 36, 'leading-10': 40 };
function defaultLineHeightFor(fontSizePx: number): number {
  return Math.round((LEADING_CLASS_PX[bodyLeadingClass(fontSizePx)] / fontSizePx) * 10) / 10;
}

// Pixel size for メディアテキスト blocks' thumbnail. Both this admin preview and the real
// public page (frontend/src/app/clubs/[tenantCode]/[slug]/page.tsx) must stay in sync.
const MEDIA_TEXT_IMAGE_SIZE_PX: Record<'small' | 'medium' | 'large', number> = {
  small: 56,
  medium: 96,
  large: 140,
};

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
  { label: '上3下2', value: 'row3' },
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
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .normalize('NFC');
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
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [form, setForm] = useState<PublicPageInput>(emptyForm);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [reserveEvents, setReserveEvents] = useState<LiffEvent[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [reviews, setReviews] = useState<TenantReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const blockUploadRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const blockFocalDragRef = useRef<{ startX: number; startY: number; startFocal: { x: number; y: number } } | null>(null);
  const heroFocalDragRef = useRef<{ startX: number; startY: number; startFocal: { x: number; y: number } } | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    global: true, seo: false, header: true, structure: true, reserve: false, blog: false, reviews: false, footer: false,
    headerLogo: false, headerTitle: false, headerSubtitle: false, headerPhoto: false, headerLayout: false, headerButton: false, headerNavLabel: false,
  });
  const toggleSection = (key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] }));

  const tenantCode = tenant?.code ?? tenant?.id ?? '';
  const displayName = tenant?.name ?? tenant?.lineDisplayName ?? '公開サイト';
  const siteTitle = form.title?.trim() || displayName;
  const tenantIcon = tenant?.iconUrl ?? tenant?.linePictureUrl ?? null;
  const generatedSlug = slugify(displayName) || slugify(tenantCode) || 'home';
  const previewUrl = tenantCode ? `${SITE_URL}/clubs/${tenantCode}/${savedSlug || generatedSlug}` : '';
  const textColor = form.textColor?.trim() || '#111827';
  const bodyTextColor = form.bodyTextColor?.trim() || textColor;
  const navButtonTextColor = form.navButtonTextColor?.trim() || textColor;
  const accentColor = form.accentColor?.trim() || '#06C755';
  const backgroundColor = form.backgroundColor?.trim() || '#F7F8FA';
  const backgroundOpacity = clampPercent(form.backgroundOpacity ?? 100);
  const bgColor = hexToRgba(backgroundColor, backgroundOpacity);
  const navColor = form.navColor?.trim() || form.buttonBgColor?.trim() || accentColor;
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
  const titleLogoLayout: TitleLogoLayout = form.titleLogoLayout === 'inline' ? 'inline' : 'stacked';
  const canRenderTitle = form.orgNameDisplayType !== 'image';
  const canRenderLogo = Boolean(form.orgLogoWordmarkUrl && form.orgNameDisplayType !== 'text');
  const shouldRenderInlineTitleLogo = titleLogoLayout === 'inline' && canRenderTitle && canRenderLogo;
  const subtitleFontFamily = (form.subtitleFont?.trim()
    ? fontOptions.find(f => f.value === form.subtitleFont)?.family
    : undefined) ?? fontFamily;
  const subtitleColor = form.subtitleColor?.trim() || textColor;
  const subtitleFontSize = resolvePxSize(form.subtitleSize, 14, 11, 28, SUBTITLE_SIZE_LEGACY);
  const subtitleTextStyle = { color: subtitleColor, fontFamily: subtitleFontFamily, fontSize: subtitleFontSize, lineHeight: 1.6 };
  const heroKeys = ['name', 'logo', 'nav', 'image', 'subtitle'] as const;
  const heroOutsideKeysList = form.heroOutsideKeys ?? ['nav'];
  const heroOutsideSet = new Set(heroOutsideKeysList);
  const heroFullOrder = [
    ...(form.sectionOrder ?? [...DEFAULT_SECTION_ORDER]).filter((k) => (heroKeys as readonly string[]).includes(k)),
    ...heroKeys.filter((k) => !(form.sectionOrder ?? [...DEFAULT_SECTION_ORDER]).includes(k)),
  ];
  const heroInsideKeys = heroFullOrder.filter((k) => k !== 'image' && k !== 'subtitle' && !heroOutsideSet.has(k));
  const heroImageIdx = heroFullOrder.indexOf('image');
  const heroOutsideBefore = heroFullOrder.slice(0, heroImageIdx).filter((k) => heroOutsideSet.has(k));
  const heroOutsideAfter = heroFullOrder.slice(heroImageIdx + 1).filter((k) => heroOutsideSet.has(k));
  const renderInlineTitleLogo = (dropShadow = false) => (
    <div className={`flex min-w-0 items-center gap-3 ${dropShadow ? 'drop-shadow' : ''}`}>
      <img src={form.orgLogoWordmarkUrl || ''} alt={form.orgLogoWordmarkAlt || siteTitle}
        className="shrink-0 object-contain"
        style={{ height: form.orgLogoWordmarkSize ?? 60, maxWidth: '38%' }} />
      <p className="min-w-0 flex-1 break-words font-bold" style={titleTextStyle}>{siteTitle}</p>
    </div>
  );
  const renderHeroOutsideItem = (key: string) => {
    if (shouldRenderInlineTitleLogo && key === 'name') return <div key="name">{renderInlineTitleLogo(false)}</div>;
    if (shouldRenderInlineTitleLogo && key === 'logo') return null;
    if (key === 'name') return (
      <p key="name" className={`font-bold ${form.orgNameDisplayType === 'image' ? 'sr-only' : ''}`} style={form.orgNameDisplayType === 'image' ? undefined : titleTextStyle}>
        {siteTitle}
      </p>
    );
    if (key === 'logo') return form.orgLogoWordmarkUrl && form.orgNameDisplayType !== 'text' ? (
      <img key="logo" src={form.orgLogoWordmarkUrl} alt={form.orgLogoWordmarkAlt || siteTitle}
        className="max-w-full object-contain"
        style={{ height: form.orgLogoWordmarkSize ?? 60, maxWidth: '100%' }} />
    ) : null;
    if (key === 'nav') return (
      <div key="nav">
        <div className={`text-[11px] font-bold ${previewButtonLayoutClass}`} style={previewButtonGridStyle}>
          {visibleNavItems.map((item) => (
            <span key={item.key} className={`flex items-center justify-center truncate px-2 text-center leading-tight ${getBtnShapeClass(buttonStyle)}`} style={{ height: btnIsPill ? btnSize : undefined, minHeight: btnSize, borderRadius: btnIsPill ? 9999 : btnRadius, borderColor: btnBorderColor, color: btnTextColor, boxShadow: btnBoxShadow, ...buttonBgStyle, ...row3ItemStyle }}>{item.label}</span>
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
    if (key === 'subtitle') return form.subtitle?.trim() ? (
      <p key="subtitle" style={subtitleTextStyle}>{form.subtitle.trim()}</p>
    ) : null;
    return null;
  };
  const navLabels = {
    about: form.aboutLabel?.trim() || '団体詳細',
    reserve: form.reserveLabel?.trim() || '予約する',
    blog: form.blogLabel?.trim() || '活動ブログ',
    reviews: form.reviewsLabel?.trim() || '口コミ',
    contact: form.contactLabel?.trim() || 'お問い合わせ',
  };
  const reserveActionStyle = form.reserveActionStyle === 'line' ? 'line' : 'comiu';
  const hasReserveSection = reserveActionStyle === 'line' || reserveEvents.length > 0;
  const hasBlogSection = blogPosts.length > 0;
  const reviewsEnabled = form.reviewsEnabled !== false;
  const hasReviewsSection = reviewsEnabled;
  const customNavButtons = (form.customNavButtons ?? []).filter((b) => b.label.trim() && b.url.trim());
  const navItemsByKey: Record<string, { key: string; label: string } | undefined> = {
    about: { key: 'about', label: navLabels.about },
    blog: hasBlogSection ? { key: 'blog', label: navLabels.blog } : undefined,
    reserve: hasReserveSection ? { key: 'reserve', label: navLabels.reserve } : undefined,
    reviews: hasReviewsSection ? { key: 'reviews', label: navLabels.reviews } : undefined,
    contact: { key: 'contact', label: navLabels.contact },
  };
  customNavButtons.forEach((b) => {
    navItemsByKey[`custom:${b.id}`] = { key: `custom:${b.id}`, label: b.label.trim() };
  });
  const customNavKeys = customNavButtons.map((b) => `custom:${b.id}`);
  const visibleNavItems = normalizeNavOrder(form.navOrder ?? [...DEFAULT_NAV_ORDER], customNavKeys)
    .map((key) => navItemsByKey[key])
    .filter((item): item is { key: string; label: string } => item !== undefined);
  const contentOrder = normalizeContentOrder(form.contentOrder ?? [...DEFAULT_CONTENT_ORDER])
    .filter((key) => key === 'about' || (key === 'reserve' && hasReserveSection) || (key === 'blog' && hasBlogSection) || (key === 'reviews' && hasReviewsSection));
  const reserveSectionTitle = form.reserveTitle?.trim() || '';
  const reserveSectionLead = form.reserveLead?.trim() || '';
  const reserveTitleColor = form.reserveTitleColor?.trim() || textColor;
  const reserveLeadColor = form.reserveLeadColor?.trim() || bodyTextColor;
  const reserveEventTitleColor = form.reserveEventTitleColor?.trim() || '#111827';
  const reserveEventDateColor = form.reserveEventDateColor?.trim() || '#4B5563';
  const reserveEventMetaColor = form.reserveEventMetaColor?.trim() || '#6B7280';
  const reserveEventCardBg = form.reserveEventCardBg?.trim() || navBg;
  const reserveButtonBgColor = form.reserveButtonBgColor?.trim() || '#06C755';
  const reserveButtonTextColor = form.reserveButtonTextColor?.trim() || '#111827';
  const globalBorderColor = form.globalBorderColor?.trim() || '#E5E7EB';
  const reserveButtonBorderColor = globalBorderColor;
  const globalRadius = Number.isFinite(form.globalRadius) ? Number(form.globalRadius) : 12;
  const globalBorderWidth = Number.isFinite(form.globalBorderWidth) ? Number(form.globalBorderWidth) : 1;
  const cardBorderStyle: CSSProperties = { borderRadius: globalRadius, borderWidth: globalBorderWidth, borderColor: globalBorderColor, borderStyle: 'solid' };
  const blogPostCardBg = form.blogPostCardBg?.trim() || navBg;
  const DEFAULT_BLOCK_ORDER = [...blocks.map((_, i) => `block-${i}`), 'reserve', 'blog', 'reviews'];
  const configuredBlockOrder = Array.isArray(form.blockOrder) ? form.blockOrder : [];
  const hasCustomBlockOrder = configuredBlockOrder.length > 0 &&
    JSON.stringify(configuredBlockOrder) !== JSON.stringify(DEFAULT_BLOCK_ORDER);
  const blockOrder = [
    ...configuredBlockOrder.filter((key) => DEFAULT_BLOCK_ORDER.includes(key)),
    ...DEFAULT_BLOCK_ORDER.filter((key) => !configuredBlockOrder.includes(key)),
  ];
  const blogPostTitleColor = form.blogPostTitleColor?.trim() || textColor;
  const blogSectionTitle = form.blogTitle?.trim() || '';
  const blogSectionLead = form.blogLead?.trim() || '';
  const blogTitleColor = form.blogTitleColor?.trim() || textColor;
  const blogLeadColor = form.blogLeadColor?.trim() || bodyTextColor;
  const reviewsSectionTitle = form.reviewsTitle?.trim() || '';
  const reviewsSectionLead = form.reviewsLead?.trim() || '';
  const reviewsTitleColor = form.reviewsTitleColor?.trim() || textColor;
  const reviewsLeadColor = form.reviewsLeadColor?.trim() || bodyTextColor;
  const buttonStyle = form.buttonStyle ?? 'rounded';
  const buttonLayout = form.buttonLayout === 'row1x4' ? 'row1x4' : form.buttonLayout === 'row3' ? 'row3' : 'grid2x2';
  const buttonOpacity = clampPercent(form.buttonOpacity ?? 100);
  const buttonBgOpacity = clampPercent(form.buttonBgOpacity ?? 100);
  const buttonTextOpacity = clampPercent(form.buttonTextOpacity ?? 100);
  const buttonBgColor = form.buttonBgColor?.trim() || undefined;
  const btnBorderColor = hexToRgba(accentColor, buttonOpacity);
  const btnFillColor = hexToRgba(buttonBgColor || accentColor, buttonBgOpacity);
  const btnTextColor = hexToRgba(navButtonTextColor, buttonTextOpacity);
  const buttonBgStyle = { backgroundColor: btnFillColor };
  const btnBoxShadow = getBtnBoxShadow(buttonStyle, btnBorderColor);
  const previewButtonLayoutClass = buttonLayout === 'row3' ? 'flex flex-wrap justify-center gap-2' : 'grid gap-2';
  const previewButtonGridStyle = buttonLayout === 'row3' ? {} : {
    gridTemplateColumns: `repeat(${buttonLayout === 'row1x4' ? visibleNavItems.length : Math.min(2, visibleNavItems.length)}, minmax(0, 1fr))`,
  };
  const row3ItemStyle = buttonLayout === 'row3' ? { flex: '0 0 calc((100% - 16px) / 3)', maxWidth: 'calc((100% - 16px) / 3)' } as CSSProperties : undefined;
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
        void api.public.reviews(tenantData.code ?? tenantData.id)
          .then(setReviews)
          .catch(() => setReviews([]));
        const tenantName = tenantData.name ?? tenantData.lineDisplayName;
        const tenantSlug = slugify(tenantName) || slugify(tenantData.code ?? tenantData.id) || 'home';
        const first = pageData[0];
        if (first) {
          setSelectedId(first.id);
          setSavedSlug(first.slug || null);
          const variant = first.layoutVariant;
          setForm({
            title: first.title?.trim() || tenantName, slug: first.slug || tenantSlug,
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
                  bodyTextColor: fd.bodyTextColor ?? '',
                  navButtonTextColor: fd.navButtonTextColor ?? '',
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
                  reserveButtonBgColor: fd.reserveButtonBgColor ?? '',
                  reserveButtonTextColor: fd.reserveButtonTextColor ?? '',
                  reserveButtonBorderColor: fd.reserveButtonBorderColor ?? '',
                  globalBorderColor: fd.globalBorderColor ?? '',
                  globalRadius: Number.isFinite(fd.globalRadius) ? fd.globalRadius : 12,
                  globalBorderWidth: Number.isFinite(fd.globalBorderWidth) ? fd.globalBorderWidth : 1,
                  reserveActionStyle: fd.reserveActionStyle === 'line' ? 'line' : 'comiu',
                  reserveLineUrl: fd.reserveLineUrl ?? fd.line ?? '',
                  blogPostCardBg: fd.blogPostCardBg ?? '',
                  blogPostTitleColor: fd.blogPostTitleColor ?? '',
                  blogTitle: fd.blogTitle ?? '',
                  blogLead: fd.blogLead ?? '',
                  blogTitleColor: fd.blogTitleColor ?? '',
                  blogLeadColor: fd.blogLeadColor ?? '',
                  reviewsEnabled: fd.reviewsEnabled !== false,
                  reviewsLabel: fd.reviewsLabel ?? '',
                  reviewsTitle: fd.reviewsTitle ?? '',
                  reviewsLead: fd.reviewsLead ?? '',
                  reviewsTitleColor: fd.reviewsTitleColor ?? '',
                  reviewsLeadColor: fd.reviewsLeadColor ?? '',
                  footerLine: fd.footerLine ?? '',
                  footerInstagram: fd.instagram ?? '',
                  footerX: fd.x ?? '',
                  navAboutUrl: fd.aboutUrl ?? '',
                  navReserveUrl: fd.reserveUrl ?? '',
                  navBlogUrl: fd.blogUrl ?? '',
                  navContactUrl: fd.contactUrl ?? '',
                  subtitleHeroX: fd.subtitleHeroX ?? 5,
                  subtitleHeroY: fd.subtitleHeroY ?? null,
                  sectionOrder: Array.isArray(fd.sectionOrder) ? normalizeSectionOrder(fd.sectionOrder) : [...DEFAULT_SECTION_ORDER],
                  customNavButtons: Array.isArray(fd.customNavButtons)
                    ? fd.customNavButtons.filter((b: any) => b && typeof b.id === 'string').map((b: any) => ({ id: b.id, label: String(b.label ?? ''), url: String(b.url ?? '') }))
                    : [],
                  navOrder: Array.isArray(fd.navOrder)
                    ? normalizeNavOrder(fd.navOrder, (Array.isArray(fd.customNavButtons) ? fd.customNavButtons : []).filter((b: any) => b?.id).map((b: any) => `custom:${b.id}`))
                    : [...DEFAULT_NAV_ORDER],
                  contentOrder: Array.isArray(fd.contentOrder) ? normalizeContentOrder(fd.contentOrder) : [...DEFAULT_CONTENT_ORDER],
                  blockOrder: Array.isArray(fd.blockOrder) ? fd.blockOrder : [],
                  heroOutsideKeys: Array.isArray(fd.heroOutsideKeys) ? fd.heroOutsideKeys : (first.heroNavPosition === 'inside' ? [] : ['nav']),
                  titleLogoLayout: fd.titleLogoLayout === 'inline' ? 'inline' : 'stacked',
                  displayFields: (fd.displayFields && typeof fd.displayFields === 'object') ? {
                    location: fd.displayFields.location !== false,
                    price: fd.displayFields.price !== false,
                    capacity: fd.displayFields.capacity === true,
                    description: fd.displayFields.description !== false,
                  } : { location: true, price: true, capacity: false, description: true },
                  slugLocked: fd.slugLocked === true,
                };
              } catch {
                return {
                  footerContact: (first as any).footerText ?? '',
                  footerTextColor: '#111827',
                  footerContactColor: '',
                  footerContactTextColor: '#111827',
                  bodyTextColor: '',
                  navButtonTextColor: '',
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
                  reserveButtonBgColor: '',
                  reserveButtonTextColor: '',
                  reserveButtonBorderColor: '',
                  globalBorderColor: '',
                  globalRadius: 12,
                  globalBorderWidth: 1,
                  reserveActionStyle: 'comiu',
                  reserveLineUrl: '',
                  blogPostCardBg: '',
                  blogPostTitleColor: '',
                  blogTitle: '',
                  blogLead: '',
                  blogTitleColor: '',
                  blogLeadColor: '',
                  reviewsEnabled: true,
                  reviewsLabel: '',
                  reviewsTitle: '',
                  reviewsLead: '',
                  reviewsTitleColor: '',
                  reviewsLeadColor: '',
                  footerLine: '',
                  footerInstagram: '',
                  footerX: '',
                  titleLogoLayout: 'stacked',
                  slugLocked: false,
                };
              }
            })(),
            aboutLabel: first.aboutLabel ?? '団体詳細',
            reserveLabel: first.reserveLabel ?? '予約する',
            blogLabel: first.blogLabel ?? '活動ブログ',
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
      setForm(p => ({ ...p, orgLogoWordmarkUrl: url, orgLogoWordmarkAlt: p.orgLogoWordmarkAlt || siteTitle }));
    } catch (err: any) {
      setError(err?.message ?? 'ロゴのアップロードに失敗しました');
    } finally {
      setLogoUploading(false);
    }
  }

  function renderPreviewText(content: string, fontSize = bodyFontSize, lineHeight?: number, letterSpacing?: number) {
    const bodyClassName = lineHeight == null ? bodyLeadingClass(fontSize) : '';
    const textStyle: CSSProperties = { fontFamily, fontSize, lineHeight: lineHeight ?? undefined, letterSpacing: typeof letterSpacing === 'number' ? `${letterSpacing}em` : undefined };
    if (!content) {
      return <p className={`${bodyClassName} opacity-90`} style={{ color: bodyTextColor, ...textStyle }}>団体説明</p>;
    }
    return (
      <div className="space-y-1" style={{ fontFamily }}>
        {content.split('\n').map((line, i) => renderPreviewLine(line, i, bodyTextColor, bodyClassName, textStyle))}
      </div>
    );
  }

  function renderPreviewBlockInner(block: Block) {
    const content = block.content?.trim() || '';
    const blockFontSize = resolvePxSize(block.fontSize, bodyFontSize, 10, 28, BODY_SIZE_LEGACY);

    if (block.type === 'media-text') {
      const imageRight = block.imagePosition === 'right';
      const mediaTextPx = MEDIA_TEXT_IMAGE_SIZE_PX[block.imageSize ?? 'medium'];
      return (
        <div className={`flex items-start gap-3 ${imageRight ? 'flex-row-reverse' : ''}`}>
          {block.imageUrl && (
            <div className="shrink-0 overflow-hidden rounded-xl" style={{ height: mediaTextPx, width: mediaTextPx }}>
              <img src={block.imageUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: block.imageFocal ?? 'center center' }} />
            </div>
          )}
          <div className="min-w-0 flex-1">{renderPreviewText(content, blockFontSize, block.lineHeight, block.letterSpacing)}</div>
        </div>
      );
    }

    if (block.type === 'profile') {
      return (
        <div className="flex items-start gap-3">
          {block.imageUrl && (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
              <img src={block.imageUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: block.imageFocal ?? 'center center' }} />
            </div>
          )}
          <div className="min-w-0 flex-1">{renderPreviewText(content, blockFontSize, block.lineHeight, block.letterSpacing)}</div>
        </div>
      );
    }

    if (block.type === 'feature') {
      return (
        <div className="space-y-3">
          {block.imageUrl && (
            <div className="h-48 w-full overflow-hidden rounded-xl">
              <img src={block.imageUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: block.imageFocal ?? 'center center' }} />
            </div>
          )}
          {renderPreviewText(content, blockFontSize, block.lineHeight, block.letterSpacing)}
        </div>
      );
    }

    if (block.type === 'faq') {
      const items = block.faqItems ?? [];
      const faqTextStyle = { fontSize: blockFontSize, color: bodyTextColor };
      return (
        <div className="space-y-1.5">
          {items.length === 0 && <p className="text-xs text-gray-400">Q&Aを追加してください</p>}
          {items.map((item, j) => (
            <div key={j} className="px-3 py-2" style={{ backgroundColor: block.faqCardBg?.trim() || navBg, ...cardBorderStyle }}>
              <p className="font-bold" style={faqTextStyle}>Q. {item.q || '（質問）'}</p>
              {item.a && <p className="mt-0.5 opacity-60" style={faqTextStyle}>A. {item.a}</p>}
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
        <div className="space-y-3">
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

    return <div>{renderPreviewText(content, blockFontSize, block.lineHeight, block.letterSpacing)}</div>;
  }

  function renderPreviewBlocks() {
    if (!blocks.length) return renderPreviewText(previewBody);

    const hasMultipleBlocks = blocks.length > 1;
    return (
      <div className="space-y-5">
        {blocks.map((block) => {
          const inner = renderPreviewBlockInner(block);
          if (block.type === 'faq' || block.type === 'sns') return <Fragment key={block.id}>{inner}</Fragment>;
          return hasMultipleBlocks ? (
            <div key={block.id} className="p-4" style={{ backgroundColor: reserveEventCardBg, ...cardBorderStyle }}>{inner}</div>
          ) : (
            <Fragment key={block.id}>{inner}</Fragment>
          );
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
    const nextSlug = slugify(form.slug ?? '') || generatedSlug;
    // 初回作成時（savedSlugがまだ無い）だけは自由に編集できるようにし、
    // 既存ページの保存（値を変えていない場合も含む）からは常にロックする。
    const nextSlugLocked = form.slugLocked === true || savedSlug !== null;
    const payload: PublicPageInput = {
      ...form,
      title: siteTitle, slug: nextSlug,
      subtitle: (form.subtitle ?? '').trim().slice(0, 1000),
      coverImageUrl: imageUrls[0]?.trim(),
      imageUrls,
      imageCaptions: imageCaptions.map((caption) => caption.trim()).slice(0, imageUrls.length),
      dividerText: '',
      textColor, accentColor, backgroundColor, backgroundOpacity: clampPercent(form.backgroundOpacity ?? 100), navColor, navOpacity,
      imageLayout: form.imageLayout || 'slider',
      heroImageMode,
      heroNavPosition: form.heroNavPosition,
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
        bodyTextColor: form.bodyTextColor?.trim() || '',
        navButtonTextColor: form.navButtonTextColor?.trim() || '',
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
        reserveButtonBgColor: form.reserveButtonBgColor?.trim() || '',
        reserveButtonTextColor: form.reserveButtonTextColor?.trim() || '',
        reserveButtonBorderColor: form.reserveButtonBorderColor?.trim() || '',
        globalBorderColor: form.globalBorderColor?.trim() || '',
        globalRadius: Number.isFinite(form.globalRadius) ? form.globalRadius : 12,
        globalBorderWidth: Number.isFinite(form.globalBorderWidth) ? form.globalBorderWidth : 1,
        reserveActionStyle,
        reserveLineUrl: form.reserveLineUrl?.trim() || '',
        blogPostCardBg: form.blogPostCardBg?.trim() || '',
        blogPostTitleColor: form.blogPostTitleColor?.trim() || '',
        blogTitle: form.blogTitle?.trim() || '',
        blogLead: form.blogLead?.trim() || '',
        blogTitleColor: form.blogTitleColor?.trim() || '',
        blogLeadColor: form.blogLeadColor?.trim() || '',
        reviewsEnabled: form.reviewsEnabled !== false,
        reviewsLabel: form.reviewsLabel?.trim() || '',
        reviewsTitle: form.reviewsTitle?.trim() || '',
        reviewsLead: form.reviewsLead?.trim() || '',
        reviewsTitleColor: form.reviewsTitleColor?.trim() || '',
        reviewsLeadColor: form.reviewsLeadColor?.trim() || '',
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
        navOrder: form.navOrder ?? [...DEFAULT_NAV_ORDER],
        customNavButtons: form.customNavButtons ?? [],
        contentOrder: form.contentOrder ?? [...DEFAULT_CONTENT_ORDER],
        blockOrder: form.blockOrder ?? [],
        heroOutsideKeys: form.heroOutsideKeys ?? ['nav'],
        titleLogoLayout,
        displayFields: form.displayFields,
        slugLocked: nextSlugLocked,
      }),
      status: 'published',
      // Leave blank as empty when the organizer hasn't typed one - the public page generates a
      // richer fallback at render time from the tenant's name/area/category/audience instead of
      // baking in just the display title here.
      seoTitle: form.seoTitle?.trim() || '',
      seoDescription: form.seoDescription?.trim() || '',
      orgNameDisplayType: form.orgNameDisplayType || 'text',
      orgLogoWordmarkUrl: form.orgLogoWordmarkUrl?.trim() || '',
      orgLogoWordmarkAlt: form.orgLogoWordmarkAlt?.trim() || siteTitle,
      orgLogoWordmarkSize: form.orgLogoWordmarkSize ?? 60,
    };
    try {
      const page = selectedId
        ? await api.publicPages.update(selectedId, payload)
        : await api.publicPages.create(payload);
      setSelectedId(page.id);
      setSavedSlug(page.slug || null);
      setForm((p) => ({ ...p, slug: page.slug || p.slug, slugLocked: nextSlugLocked }));
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
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
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
        {tenantCode && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <span className="shrink-0">URL：{SITE_URL}/clubs/{tenantCode}/</span>
            {form.slugLocked ? (
              <span className="min-w-0 flex-1 truncate rounded border border-gray-100 bg-gray-50 px-2 py-1 text-xs text-gray-700">
                {form.slug}
              </span>
            ) : (
              <input type="text" value={form.slug ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                onBlur={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
                placeholder={generatedSlug}
                className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            )}
            {form.slugLocked && (
              <span className="shrink-0 text-[10px] text-gray-400">設定済み（編集不可）</span>
            )}
          </div>
        )}
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
          {/* テーマ色（構成/予約/ブログの各セクション背景） */}
          <div className="space-y-2 rounded-lg border border-[#06C755]/30 bg-[#06C755]/5 p-3">
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs font-bold text-gray-700">テーマ色</span>
              <input type="color" value={navColor}
                onChange={(e) => setForm((p) => ({ ...p, navColor: e.target.value }))}
                className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
              <input type="range" min="20" max="100" step="5" value={navOpacity}
                onChange={(e) => setForm((p) => ({ ...p, navOpacity: Number(e.target.value) }))}
                className="flex-1 accent-[#06C755]" />
              <span className="w-8 text-right text-xs text-gray-400">{navOpacity}%</span>
            </div>
            <span className="text-[11px] text-gray-500">構成/予約ページ/活動ブログの背景の色を一括で変更します</span>
          </div>
          {/* サブテーマ色（ナビボタン・お問い合わせボタン・予約イベントカード・記事カード・Q&Aカードの中の色） */}
          <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs font-bold text-gray-700">サブテーマ色</span>
              <input type="color" value={reserveEventCardBg.startsWith('rgba') ? '#ffffff' : reserveEventCardBg}
                onChange={(e) => {
                  const color = e.target.value;
                  setForm((p) => ({
                    ...p,
                    reserveEventCardBg: color,
                    blogPostCardBg: color,
                    buttonBgColor: color,
                    buttonBgOpacity: 100,
                    footerContactColor: color,
                  }));
                  setBlocks((prev) => prev.map((b) => (b.type === 'faq' ? { ...b, faqCardBg: color } : b)));
                }}
                className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
              <span className="text-[11px] text-gray-500">ナビボタン・お問い合わせボタン・予約イベントカード・記事カード・Q&amp;Aカードの色を一括で変更します</span>
            </div>
          </div>
          {/* 全体の外枠色 */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs font-bold text-gray-500">外枠色</span>
              <input type="color" value={globalBorderColor}
                onChange={(e) => setForm((p) => ({ ...p, globalBorderColor: e.target.value }))}
                className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
              <span className="text-[11px] text-gray-400">予約ボタン・お問い合わせボタンなど、サイト全体のボタンの外枠に使われます</span>
            </div>
          </div>
          {/* カードの角の丸み・枠線の太さ */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs font-bold text-gray-500">角の丸み</span>
              <input type="range" min="0" max="24" step="1" value={globalRadius}
                onChange={(e) => setForm((p) => ({ ...p, globalRadius: Number(e.target.value) }))}
                className="flex-1 accent-[#06C755]" />
              <span className="w-10 text-right text-xs text-gray-400">{globalRadius}px</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs font-bold text-gray-500">枠線の太さ</span>
              <input type="range" min="0" max="4" step="1" value={globalBorderWidth}
                onChange={(e) => setForm((p) => ({ ...p, globalBorderWidth: Number(e.target.value) }))}
                className="flex-1 accent-[#06C755]" />
              <span className="w-10 text-right text-xs text-gray-400">{globalBorderWidth}px</span>
            </div>
            <span className="text-[11px] text-gray-400">構成・予約ページ・活動ブログのカードや記事カードの角丸・枠線に一括で使われます</span>
          </div>
          {/* 全体の文字色 */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs font-bold text-gray-500">文字色</span>
              <input type="color" value={textColor}
                onChange={(e) => setForm((p) => ({ ...p, textColor: e.target.value }))}
                className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
              <span className="text-[11px] text-gray-400">個別に色指定していないタイトル・本文すべてに使われます</span>
            </div>
          </div>
          {/* 全体のフォント */}
          <div className="space-y-2">
            <span className="w-16 shrink-0 text-xs font-bold text-gray-500">フォント</span>
            <div className="flex flex-wrap gap-1.5">
              {fontOptions.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setForm((p) => ({ ...p, fontFamily: opt.value }))}
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition ${form.fontFamily === opt.value ? 'text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  style={form.fontFamily === opt.value ? { backgroundColor: accentColor, borderColor: accentColor, fontFamily: opt.family } : { fontFamily: opt.family }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-gray-400">個別にフォント指定していないタイトル・本文すべてに使われます</span>
          </div>
          </div>}
        </div>

        {/* SEO設定 */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button type="button" onClick={() => toggleSection('seo')}
            className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
            <p className="text-xs font-bold text-gray-700">SEO設定</p>
            <svg className={`h-4 w-4 text-gray-400 transition-transform ${openSections.seo ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {openSections.seo && <div className="space-y-4 border-t border-gray-100 p-4">
            <p className="text-[11px] leading-relaxed text-gray-400">
              Google検索結果に表示されるタイトル・説明文です。画面に表示される「{siteTitle}」とは別に設定できます。未入力の場合は、団体名・活動エリア・カテゴリ・対象者から自動生成されます。
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500">Google検索に表示するタイトル</label>
              <input
                value={form.seoTitle ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, seoTitle: e.target.value }))}
                placeholder={`例: 東京の社会人バドミントンサークル${siteTitle}｜初心者・1人参加歓迎`}
                maxLength={160}
                className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500">Google検索に表示する説明文</label>
              <textarea
                value={form.seoDescription ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, seoDescription: e.target.value }))}
                placeholder={`例: ${siteTitle}は、東京都内で活動するバドミントンサークルです。初心者、経験者、1人参加歓迎。`}
                maxLength={300}
                rows={3}
                className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
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
          <SubSection label="団体名・ロゴ" open={openSections.headerLogo} onToggle={() => toggleSection('headerLogo')}>
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
                      <img src={form.orgLogoWordmarkUrl} alt={form.orgLogoWordmarkAlt || siteTitle}
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
                    {logoUploading ? 'アップロード中...' : 'PNG / JPEG / SVG をアップロード'}
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
                  <input value={form.orgLogoWordmarkAlt ?? ''} placeholder={siteTitle}
                    onChange={e => setForm(p => ({ ...p, orgLogoWordmarkAlt: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                </label>
              </div>
            )}
          </SubSection>
          {/* タイトル / サブタイトル */}
          <SubSection label="タイトル文字" open={openSections.headerTitle} onToggle={() => toggleSection('headerTitle')}>
            <p className="text-[11px] font-bold text-gray-400">タイトル（団体名）</p>
            <input value={form.title ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder={displayName}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            <p className="text-[11px] text-gray-400">空欄にするとLINE公式アカウントの表示名「{displayName}」が使われます。</p>
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
          </SubSection>

          <SubSection label="サブタイトル文字" open={openSections.headerSubtitle} onToggle={() => toggleSection('headerSubtitle')}>
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
          </SubSection>

          <SubSection label="写真" open={openSections.headerPhoto} onToggle={() => toggleSection('headerPhoto')}>
            <div className="flex flex-wrap gap-2">
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
            {heroImageMode === 'background' && imageUrls[0] && (
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
            {heroImageMode === 'background' && (
              <p className="text-[11px] text-gray-400">写真に重ねる名前・ロゴ・サブタイトルの位置は右のプレビューでドラッグして調整できます。名前・ロゴ・サブタイトル・ナビボタンの配置(写真の中/外・順番)は下の「レイアウト」で設定します。</p>
            )}
            {imageUrls.length > 0 && (
              <div className="border-t border-gray-100 pt-3 space-y-2">
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
          </SubSection>

          <SubSection label="レイアウト(要素の並び順)" open={openSections.headerLayout} onToggle={() => toggleSection('headerLayout')}>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="mb-2 text-[11px] font-bold text-gray-500">名前とロゴの並び</p>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  ['stacked', '上下に表示'],
                  ['inline', 'ロゴの右に名前'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, titleLogoLayout: value }))}
                    className={`rounded-lg border px-3 py-2 text-[11px] font-bold transition ${
                      titleLogoLayout === value
                        ? 'border-[#06C755] bg-[#06C755]/10 text-[#06C755]'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {titleLogoLayout === 'inline' && !shouldRenderInlineTitleLogo && (
                <p className="mt-2 text-[11px] text-gray-400">ロゴ画像とテキスト表示の両方を有効にすると反映されます。</p>
              )}
            </div>
            {heroImageMode === 'background' ? (
              <div>
                <p className="mb-2 text-[11px] font-bold text-gray-400">名前・ロゴ・サブタイトル・ナビボタン・写真の順番と配置</p>
                <p className="mb-2 text-[11px] text-gray-400">「写真の中」を選んだ項目は写真に重ねて表示され、「写真の外」は写真との前後関係が順番通りに並びます(写真より上に置けば写真の上、下に置けば写真の下に表示されます)。</p>
                <div className="space-y-1.5">
                  {(() => {
                    const bgKeys = ['name', 'logo', 'nav', 'image', 'subtitle'] as const;
                    const order = form.sectionOrder ?? [...DEFAULT_SECTION_ORDER];
                    const ordered = [
                      ...order.filter((k) => (bgKeys as readonly string[]).includes(k)),
                      ...bgKeys.filter((k) => !order.includes(k)),
                    ];
                    const outsideKeys = form.heroOutsideKeys ?? ['nav'];
                    const moveBgKey = (key: string, direction: 1 | -1) => setForm(p => {
                      const a = [...(p.sectionOrder ?? [...DEFAULT_SECTION_ORDER])];
                      bgKeys.forEach((k) => { if (!a.includes(k)) a.push(k); });
                      const ord = a.filter((k) => (bgKeys as readonly string[]).includes(k));
                      const idx = ord.indexOf(key);
                      const swapWith = ord[idx + direction];
                      if (!swapWith) return p;
                      const ai = a.indexOf(key);
                      const bi = a.indexOf(swapWith);
                      [a[ai], a[bi]] = [a[bi], a[ai]];
                      return { ...p, sectionOrder: a };
                    });
                    const setOutside = (key: string, outside: boolean) => setForm(p => {
                      const cur = p.heroOutsideKeys ?? ['nav'];
                      const next = outside ? [...cur.filter((k) => k !== key), key] : cur.filter((k) => k !== key);
                      return { ...p, heroOutsideKeys: next };
                    });
                    return ordered.map((key, i) => (
                      <div key={key} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <span className="flex-1 text-xs font-bold text-gray-700">{SECTION_LABELS[key] ?? key}</span>
                        {key !== 'image' && (
                          <div className="flex overflow-hidden rounded-full border border-gray-200">
                            {[{ label: '写真の中', outside: false }, { label: '写真の外', outside: true }].map((opt) => (
                              <button key={opt.label} type="button"
                                onClick={() => setOutside(key, opt.outside)}
                                className={`px-2 py-1 text-[10px] font-bold transition ${outsideKeys.includes(key) === opt.outside ? 'text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                                style={outsideKeys.includes(key) === opt.outside ? { backgroundColor: accentColor } : undefined}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                        <button type="button" disabled={i === 0} onClick={() => moveBgKey(key, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-xs text-gray-400 disabled:opacity-30 hover:enabled:bg-gray-100">↑</button>
                        <button type="button" disabled={i === ordered.length - 1} onClick={() => moveBgKey(key, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-xs text-gray-400 disabled:opacity-30 hover:enabled:bg-gray-100">↓</button>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ) : (
              <div>
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
          </SubSection>
          <SubSection label="ボタンのスタイル" open={openSections.headerButton} onToggle={() => toggleSection('headerButton')}>
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
                <input type="color" value={navButtonTextColor}
                  onChange={(e) => setForm((p) => ({ ...p, navButtonTextColor: e.target.value }))}
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
          </SubSection>

          <SubSection label="ナビラベル・リンク先" open={openSections.headerNavLabel} onToggle={() => toggleSection('headerNavLabel')}>
            <div className="space-y-2">
              <div>
                <p className="mb-2 text-[11px] font-bold text-gray-400">ボタンの並び順</p>
                <div className="space-y-1.5">
                  {normalizeNavOrder(form.navOrder ?? [...DEFAULT_NAV_ORDER], (form.customNavButtons ?? []).map((b) => `custom:${b.id}`)).map((key, i, arr) => (
                    <div key={key} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                      <span className="flex-1 truncate text-xs font-bold text-gray-700">
                        {NAV_ITEM_LABELS[key] ?? ((form.customNavButtons ?? []).find((b) => `custom:${b.id}` === key)?.label.trim() || 'ボタン')}
                      </span>
                      <button type="button" disabled={i === 0}
                        onClick={() => setForm((p) => {
                          const a = normalizeNavOrder(p.navOrder ?? [...DEFAULT_NAV_ORDER], (p.customNavButtons ?? []).map((b) => `custom:${b.id}`));
                          [a[i - 1], a[i]] = [a[i], a[i - 1]];
                          return { ...p, navOrder: a };
                        })}
                        className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-xs text-gray-400 disabled:opacity-30 hover:enabled:bg-gray-100">↑</button>
                      <button type="button" disabled={i === arr.length - 1}
                        onClick={() => setForm((p) => {
                          const a = normalizeNavOrder(p.navOrder ?? [...DEFAULT_NAV_ORDER], (p.customNavButtons ?? []).map((b) => `custom:${b.id}`));
                          [a[i + 1], a[i]] = [a[i], a[i + 1]];
                          return { ...p, navOrder: a };
                        })}
                        className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-xs text-gray-400 disabled:opacity-30 hover:enabled:bg-gray-100">↓</button>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-gray-400">「活動ブログ」「予約する」は記事・予約設定が無い団体では表示されません</p>
              </div>
              {[
                { labelField: 'aboutLabel' as const, urlField: 'navAboutUrl' as const, placeholder: '団体詳細', defaultUrl: '#about' },
                { labelField: 'reserveLabel' as const, urlField: 'navReserveUrl' as const, placeholder: '予約する', defaultUrl: '#reserve' },
                { labelField: 'blogLabel' as const, urlField: 'navBlogUrl' as const, placeholder: '活動ブログ', defaultUrl: '#blog' },
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
              <div className="space-y-1.5 border-t border-gray-100 pt-2">
                {(form.customNavButtons ?? []).map((btn) => (
                  <div key={btn.id} className="flex gap-1.5">
                    <input value={btn.label}
                      onChange={(e) => setForm((p) => ({
                        ...p,
                        customNavButtons: (p.customNavButtons ?? []).map((b) => b.id === btn.id ? { ...b, label: e.target.value } : b),
                      }))}
                      placeholder="ボタン名（例: Instagram）"
                      className="w-24 shrink-0 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                    <input value={btn.url}
                      onChange={(e) => setForm((p) => ({
                        ...p,
                        customNavButtons: (p.customNavButtons ?? []).map((b) => b.id === btn.id ? { ...b, url: e.target.value } : b),
                      }))}
                      placeholder="リンク先 (例: https://www.instagram.com/...)"
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                    <button type="button"
                      onClick={() => setForm((p) => ({
                        ...p,
                        customNavButtons: (p.customNavButtons ?? []).filter((b) => b.id !== btn.id),
                      }))}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500">×</button>
                  </div>
                ))}
                <button type="button"
                  onClick={() => setForm((p) => {
                    const id = crypto.randomUUID();
                    return {
                      ...p,
                      customNavButtons: [...(p.customNavButtons ?? []), { id, label: '', url: '' }],
                      navOrder: [...normalizeNavOrder(p.navOrder ?? [...DEFAULT_NAV_ORDER], (p.customNavButtons ?? []).map((b) => `custom:${b.id}`)), `custom:${id}`],
                    };
                  })}
                  className="rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition">
                  + ボタンを追加
                </button>
              </div>
            </div>
          </SubSection>
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
          <div>
            <p className="mb-2 text-[11px] font-bold text-gray-400">ページの並び順（構成のブロック／予約ページ／活動ブログ／口コミ）</p>
            <div className="space-y-1.5">
              {(form.blockOrder && form.blockOrder.length > 0 ? form.blockOrder : DEFAULT_BLOCK_ORDER).map((key, i, arr) => (
                <div key={key} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <span className="flex-1 text-xs font-bold text-gray-700">
                    {key === 'reserve' ? '予約ページ' : key === 'blog' ? '活動ブログ' : key === 'reviews' ? '口コミ' : `構成: ${BLOCK_LABELS[blocks[Number(key.replace('block-', ''))]?.type] ?? key}`}
                  </span>
                  <button type="button" disabled={i === 0}
                    onClick={() => setForm((p) => {
                      const a = [...(p.blockOrder && p.blockOrder.length > 0 ? p.blockOrder : DEFAULT_BLOCK_ORDER)];
                      [a[i - 1], a[i]] = [a[i], a[i - 1]];
                      return { ...p, blockOrder: a };
                    })}
                    className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-xs text-gray-400 disabled:opacity-30 hover:enabled:bg-gray-100">↑</button>
                  <button type="button" disabled={i === arr.length - 1}
                    onClick={() => setForm((p) => {
                      const a = [...(p.blockOrder && p.blockOrder.length > 0 ? p.blockOrder : DEFAULT_BLOCK_ORDER)];
                      [a[i + 1], a[i]] = [a[i], a[i + 1]];
                      return { ...p, blockOrder: a };
                    })}
                    className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-xs text-gray-400 disabled:opacity-30 hover:enabled:bg-gray-100">↓</button>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-gray-400">構成のブロックを予約ページ・活動ブログ・口コミと自由に入れ替えられます（「予約ページ」「活動ブログ」は記事・予約設定が無い団体では表示されません。「口コミ」はON/OFF設定に従い、口コミが無い場合は「まだ口コミはありません」と表示されます）。単独で配置したブロックは予約ページ・活動ブログ・口コミと同じカードデザインになります</p>
          </div>
          {/* 予約表示スタイルは予約ページで設定 */}
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
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">文字色</span>
            <input type="color" value={bodyTextColor}
              onChange={(e) => setForm((p) => ({ ...p, bodyTextColor: e.target.value }))}
              className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
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
                        <div className="space-y-1.5">
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
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-gray-400">画像サイズ</span>
                            {(['small', 'medium', 'large'] as const).map(size => (
                              <button key={size} type="button"
                                onClick={() => updateBlock(block.id, { imageSize: size })}
                                className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${(block.imageSize ?? 'medium') === size ? 'text-white' : 'border-gray-200 text-gray-500'}`}
                                style={(block.imageSize ?? 'medium') === size ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}>
                                {size === 'small' ? '小' : size === 'medium' ? '中' : '大'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* FAQ フィールド */}
                  {block.type === 'faq' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-400">カードの背景色</span>
                        <input type="color" value={block.faqCardBg || '#F9FAFB'}
                          onChange={(e) => updateBlock(block.id, { faqCardBg: e.target.value })}
                          className="h-8 w-10 cursor-pointer rounded border border-gray-200 bg-white p-0.5" />
                      </div>
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

                  {block.type !== 'sns' && block.type !== 'faq' && (
                    <label className="block">
                      <span className="mb-1 flex items-center justify-between text-xs text-gray-500">
                        <span className="font-bold text-gray-400">行間</span>
                        <span className="font-bold">{(block.lineHeight ?? defaultLineHeightFor(blockFontSize)).toFixed(1)}</span>
                      </span>
                      <input type="range" min="1.0" max="3.0" step="0.1" value={block.lineHeight ?? defaultLineHeightFor(blockFontSize)}
                        onChange={(e) => updateBlock(block.id, { lineHeight: Number(e.target.value) })}
                        className="w-full accent-[#06C755]" />
                    </label>
                  )}

                  {block.type !== 'sns' && block.type !== 'faq' && (
                    <label className="block">
                      <span className="mb-1 flex items-center justify-between text-xs text-gray-500">
                        <span className="font-bold text-gray-400">文字の間隔</span>
                        <span className="font-bold">{(block.letterSpacing ?? 0).toFixed(2)}em</span>
                      </span>
                      <input type="range" min="-0.05" max="0.3" step="0.01" value={block.letterSpacing ?? 0}
                        onChange={(e) => updateBlock(block.id, { letterSpacing: Number(e.target.value) })}
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
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData('text');
                            if (!pasted.includes('<')) return;
                            e.preventDefault();
                            updateBlock(block.id, { instagramEmbedUrl: extractEmbedUrl(pasted) });
                          }}
                          placeholder="https://www.instagram.com/p/...（埋め込みコードの貼り付けもOK）"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-gray-500">Threads 投稿 URL（投稿を埋め込み）</span>
                        <input type="url" value={block.threadsEmbedUrl ?? ''}
                          onChange={(e) => updateBlock(block.id, { threadsEmbedUrl: e.target.value })}
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData('text');
                            if (!pasted.includes('<')) return;
                            e.preventDefault();
                            updateBlock(block.id, { threadsEmbedUrl: extractEmbedUrl(pasted) });
                          }}
                          placeholder="https://www.threads.net/@yourname/post/...（埋め込みコードの貼り付けもOK）"
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

        {/* 予約ページ */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <button type="button" onClick={() => toggleSection('reserve')}
            className="flex w-full items-center justify-between px-4 py-3 transition hover:bg-gray-50">
            <p className="text-xs font-bold text-gray-700">予約ページ</p>
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
                <p className="text-[11px] font-bold text-gray-400">セクションのタイトル・説明文</p>
                <label className="block space-y-1">
                  <span className="text-[11px] text-gray-500">タイトル(空欄: 非表示)</span>
                  <input value={form.reserveTitle ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, reserveTitle: e.target.value }))}
                    placeholder="例：予約する"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-gray-500">説明文</span>
                  <textarea value={form.reserveLead ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, reserveLead: e.target.value }))}
                    rows={2}
                    placeholder="募集中のイベントを表示します。"
                    className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                </label>
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
                <label className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <span className="text-[11px] font-bold text-gray-500">予約ボタンの色</span>
                  <input
                    type="color"
                    value={reserveButtonBgColor}
                    onChange={(e) => setForm((p) => ({ ...p, reserveButtonBgColor: e.target.value }))}
                    className="h-7 w-9 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <span className="text-[11px] font-bold text-gray-500">予約ボタンの文字色</span>
                  <input
                    type="color"
                    value={reserveButtonTextColor}
                    onChange={(e) => setForm((p) => ({ ...p, reserveButtonTextColor: e.target.value }))}
                    className="h-7 w-9 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                  />
                </label>
                <p className="text-[11px] text-gray-400">外枠色は「全体の設定」で一括設定できます。</p>
                <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-[11px] font-bold text-gray-400">予約スタイル</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([
                      {
                        value: 'comiu' as const,
                        label: 'COMIUで予約する',
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
              <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                <p className="text-[11px] font-bold text-gray-400">セクションのタイトル・説明文</p>
                <label className="block space-y-1">
                  <span className="text-[11px] text-gray-500">タイトル(空欄: 非表示)</span>
                  <input value={form.blogTitle ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, blogTitle: e.target.value }))}
                    placeholder="例：活動ブログ"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-gray-500">説明文</span>
                  <textarea value={form.blogLead ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, blogLead: e.target.value }))}
                    rows={2}
                    placeholder="活動日記やお知らせを表示するエリアです。"
                    className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                </label>
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
              <label className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="text-[11px] font-bold text-gray-500">記事タイトルの文字色</span>
                <input
                  type="color"
                  value={blogPostTitleColor}
                  onChange={(e) => setForm((p) => ({ ...p, blogPostTitleColor: e.target.value }))}
                  className="h-7 w-9 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                />
              </label>
            </div>
          )}
        </div>

        {/* 口コミ */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <button type="button" onClick={() => toggleSection('reviews')}
            className="flex w-full items-center justify-between px-4 py-3 transition hover:bg-gray-50">
            <p className="text-xs font-bold text-gray-700">口コミ</p>
            <svg className={`h-4 w-4 text-gray-400 transition-transform ${openSections.reviews ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {openSections.reviews && (
            <div className="space-y-4 border-t border-gray-100 p-4">
              <label className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="text-xs font-bold text-gray-600">公開サイトに表示する</span>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, reviewsEnabled: !reviewsEnabled }))}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${reviewsEnabled ? 'bg-[#06C755]' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${reviewsEnabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </label>
              <div className={`rounded-lg px-3 py-2 text-xs font-bold ${reviewsEnabled ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                {!reviewsEnabled
                  ? 'このセクションは非表示に設定されています'
                  : reviews.length > 0
                    ? `公開口コミ ${reviews.length}件：公開サイトに表示されます`
                    : '公開口コミ 0件：「まだ口コミはありません」と表示されます'}
              </div>
              <p className="text-[11px] leading-relaxed text-gray-400">
                口コミの承認・編集は管理画面の「口コミ」ページで行います。ここでは公開サイト側の見た目のみ設定できます。
              </p>
              <label className="block space-y-1">
                <span className="text-[11px] text-gray-500">ナビボタンのラベル</span>
                <input value={form.reviewsLabel ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, reviewsLabel: e.target.value }))}
                  placeholder="口コミ"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
              </label>
              <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                <p className="text-[11px] font-bold text-gray-400">セクションのタイトル・説明文</p>
                <label className="block space-y-1">
                  <span className="text-[11px] text-gray-500">タイトル(空欄: 非表示)</span>
                  <input value={form.reviewsTitle ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, reviewsTitle: e.target.value }))}
                    placeholder="例：参加者の声"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-gray-500">説明文</span>
                  <textarea value={form.reviewsLead ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, reviewsLead: e.target.value }))}
                    rows={2}
                    placeholder="参加したメンバーからの感想を紹介しています。"
                    className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
                </label>
              </div>
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
                    placeholder="メール・電話番号・LINE URL（空欄=アプリ内メッセージ）"
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
                  {heroOutsideBefore.length > 0 && (
                    <div className="space-y-2 border-b border-gray-100 px-3 pb-1 pt-3">
                      {heroOutsideBefore.map((key) => renderHeroOutsideItem(key))}
                    </div>
                  )}
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
                        <div className="flex flex-col gap-2">
                          {heroInsideKeys.map((key) => {
                            if (shouldRenderInlineTitleLogo && key === 'name') return <div key="name">{renderInlineTitleLogo(true)}</div>;
                            if (shouldRenderInlineTitleLogo && key === 'logo') return null;
                            if (key === 'name') return (
                              <p key="name" className={`font-bold drop-shadow ${form.orgNameDisplayType === 'image' ? 'sr-only' : ''}`} style={form.orgNameDisplayType === 'image' ? undefined : titleTextStyle}>
                                {siteTitle}
                              </p>
                            );
                            if (key === 'logo') return form.orgLogoWordmarkUrl && form.orgNameDisplayType !== 'text' ? (
                              <img key="logo" src={form.orgLogoWordmarkUrl} alt={form.orgLogoWordmarkAlt || siteTitle}
                                className="max-w-full object-contain drop-shadow"
                                style={{ height: form.orgLogoWordmarkSize ?? 60, maxWidth: '100%' }} />
                            ) : null;
                            if (key === 'nav') return (
                              <div key="nav">
                                <div className={`text-[10px] font-bold ${previewButtonLayoutClass}`} style={previewButtonGridStyle}>
                                  {visibleNavItems.map((item) => (
                                    <span key={item.key} className={`flex items-center justify-center truncate px-1 text-center leading-tight ${getBtnShapeClass(buttonStyle)}`} style={{ height: btnIsPill ? btnSize : undefined, minHeight: btnSize, borderRadius: btnIsPill ? 9999 : btnRadius, borderColor: btnBorderColor, color: btnTextColor, boxShadow: btnBoxShadow, ...buttonBgStyle, ...row3ItemStyle }}>{item.label}</span>
                                  ))}
                                </div>
                                <div className="mt-1 flex cursor-ns-resize select-none touch-none justify-center py-0.5"
                                  style={{ touchAction: 'none' }}
                                  onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dragRef.current = { startY: e.clientY, startSize: btnSize }; }}
                                  onPointerMove={(e) => { if (!dragRef.current) return; const d = e.clientY - dragRef.current.startY; setForm(p => ({ ...p, buttonSize: Math.round(Math.min(80, Math.max(24, dragRef.current!.startSize + d))) })); }}
                                  onPointerUp={() => { dragRef.current = null; }}
                                ><div className="h-0.5 w-6 rounded bg-white/50" /></div>
                              </div>
                            );
                            return null;
                          })}
                        </div>
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
                    {form.subtitle?.trim() && !heroOutsideSet.has('subtitle') && (
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
                  {heroOutsideAfter.length > 0 && (
                    <div className="space-y-2 border-b border-gray-100 px-3 pb-1 pt-3">
                      {heroOutsideAfter.map((key) => renderHeroOutsideItem(key))}
                    </div>
                  )}
                </>
              ) : (
                /* 通常モード: セクション順序に従って描画 */
                <div className="border-b border-gray-100">
                  {normalizeSectionOrder(form.sectionOrder ?? [...DEFAULT_SECTION_ORDER]).map((key) => {
                    if (shouldRenderInlineTitleLogo && key === 'name') return (
                      <div key="name" className="px-4 pt-3 pb-1">
                        {renderInlineTitleLogo(false)}
                      </div>
                    );
                    if (shouldRenderInlineTitleLogo && key === 'logo') return null;
                    if (key === 'name') return form.orgNameDisplayType !== 'image' ? (
                      <div key="name" className="px-4 pt-3 pb-1">
                        <span className="block font-bold leading-5" style={{ ...titleTextStyle, lineHeight: 1.25 }}>
                          {siteTitle}
                        </span>
                      </div>
                    ) : null;
                    if (key === 'logo') return form.orgLogoWordmarkUrl && form.orgNameDisplayType !== 'text' ? (
                      <div key="logo" className="px-4 pt-3 pb-1">
                        <img src={form.orgLogoWordmarkUrl} alt={form.orgLogoWordmarkAlt || siteTitle}
                          className="max-w-full object-contain"
                          style={{ height: form.orgLogoWordmarkSize ?? 60, maxWidth: '100%' }} />
                      </div>
                    ) : null;
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
                            <span key={item.key} className={`flex items-center justify-center truncate px-2 text-center leading-tight ${getBtnShapeClass(buttonStyle)}`} style={{ height: btnIsPill ? btnSize : undefined, minHeight: btnSize, borderRadius: btnIsPill ? 9999 : btnRadius, borderColor: btnBorderColor, color: btnTextColor, boxShadow: btnBoxShadow, ...buttonBgStyle, ...row3ItemStyle }}>{item.label}</span>
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
                {(() => {
                  const aboutSection = (
                    <div key="about" className="p-4" style={{ backgroundColor: navBg, ...cardBorderStyle }}>
                      {renderPreviewBlocks()}
                    </div>
                  );
                  const reserveSection = hasReserveSection ? (
                    <Fragment key="reserve">
                    <section className="p-4" style={{ backgroundColor: navBg, ...cardBorderStyle }}>
                      {reserveSectionTitle && (
                        <p className="text-sm font-bold" style={{ color: reserveTitleColor }}>{reserveSectionTitle}</p>
                      )}
                      {reserveSectionLead && (
                        <p className="mt-1 text-xs leading-5" style={{ color: reserveLeadColor }}>{reserveSectionLead}</p>
                      )}
                      {reserveActionStyle === 'line' && reserveEvents.length === 0 ? null : (
                        <ReservationViewShowcase
                          accentColor={accentColor}
                          buttonLabel={reserveActionStyle === 'line' ? 'LINEで友達追加して予約する' : navLabels.reserve}
                          viewStyle={form.reserveViewStyle}
                          events={reserveEvents}
                          href={reserveActionStyle === 'line' ? (form.reserveLineUrl?.trim() || form.navContactUrl?.trim() || '#') : undefined}
                          lineMode={reserveActionStyle === 'line'}
                          eventTitleColor={reserveEventTitleColor}
                          eventDateColor={reserveEventDateColor}
                          eventMetaColor={reserveEventMetaColor}
                          eventCardBg={reserveEventCardBg}
                          className="mt-3"
                          showButton={false}
                        />
                      )}
                    </section>
                    {reserveActionStyle === 'line' && reserveEvents.length === 0 ? (
                      <ReservationButton
                        buttonLabel="LINEで予約する"
                        href={form.reserveLineUrl?.trim() || form.navContactUrl?.trim() || '#'}
                        buttonBgColor={reserveButtonBgColor}
                        buttonTextColor={reserveButtonTextColor}
                        buttonBorderColor={reserveButtonBorderColor}
                      />
                    ) : form.reserveViewStyle !== 'card' ? (
                      <ReservationButton
                        buttonLabel={reserveActionStyle === 'line' ? 'LINEで友達追加して予約する' : navLabels.reserve}
                        href={reserveActionStyle === 'line' ? (form.reserveLineUrl?.trim() || form.navContactUrl?.trim() || '#') : undefined}
                        buttonBgColor={reserveButtonBgColor}
                        buttonTextColor={reserveButtonTextColor}
                        buttonBorderColor={reserveButtonBorderColor}
                      />
                    ) : null}
                    </Fragment>
                  ) : null;
                  const blogSection = hasBlogSection ? (
                    <section key="blog" className="p-4" style={{ backgroundColor: navBg, ...cardBorderStyle }}>
                      {blogSectionTitle && (
                        <p className="text-sm font-bold" style={{ color: blogTitleColor }}>{blogSectionTitle}</p>
                      )}
                      {blogSectionLead && (
                        <p className="mt-1 text-xs leading-5" style={{ color: blogLeadColor }}>{blogSectionLead}</p>
                      )}
                      <div className="mt-3 max-h-[380px] space-y-2 overflow-y-auto pr-1">
                        {blogPosts.map((post) => {
                          const image = imgUrl(post.coverImageUrl ?? firstBlogImage(post.body), API_URL);
                          return (
                            <div key={post.id} className="flex gap-2 p-2" style={{ backgroundColor: blogPostCardBg, ...cardBorderStyle }}>
                              {image && <img src={image} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" />}
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold" style={{ color: blogPostTitleColor }}>{post.title}</p>
                                {post.excerpt && <p className="mt-0.5 line-clamp-2 text-[10px] leading-4" style={{ color: blogLeadColor }}>{post.excerpt}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : null;
                  const reviewsSection = hasReviewsSection ? (
                    <section key="reviews" className="p-4" style={{ backgroundColor: navBg, ...cardBorderStyle }}>
                      {reviewsSectionTitle && (
                        <p className="text-sm font-bold" style={{ color: reviewsTitleColor }}>{reviewsSectionTitle}</p>
                      )}
                      {reviewsSectionLead && (
                        <p className="mt-1 text-xs leading-5" style={{ color: reviewsLeadColor }}>{reviewsSectionLead}</p>
                      )}
                      {reviews.length === 0 ? (
                        <p className="mt-3 text-xs text-gray-400">まだ口コミはありません。参加した方の感想をお楽しみに。</p>
                      ) : (
                        <div className="mt-3 max-h-[380px] space-y-3 overflow-y-auto pr-1">
                          {reviews.map((review) => (
                            <div key={review.id} className="flex gap-2 p-2" style={{ backgroundColor: blogPostCardBg, ...cardBorderStyle }}>
                              {review.authorIconUrl ? (
                                <img src={review.authorIconUrl} alt="" className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover" />
                              ) : (
                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] text-gray-400">
                                  {review.authorName.slice(0, 1)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[11px] font-medium text-gray-700">{review.authorName}</p>
                                <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-600">{review.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  ) : null;
                  if (hasCustomBlockOrder) {
                    return blockOrder.map((key) => {
                      if (key === 'reserve') return reserveSection;
                      if (key === 'blog') return blogSection;
                      if (key === 'reviews') return reviewsSection;
                      const idx = Number(key.replace('block-', ''));
                      const block = blocks[idx];
                      if (!block) return null;
                      return (
                        <div key={key} className="p-4" style={{ backgroundColor: reserveEventCardBg, ...cardBorderStyle }}>
                          {renderPreviewBlockInner(block)}
                        </div>
                      );
                    });
                  }
                  const contentSectionsByKey: Record<string, ReactNode> = { about: aboutSection, reserve: reserveSection, blog: blogSection, reviews: reviewsSection };
                  return contentOrder.map((key) => contentSectionsByKey[key] ?? null);
                })()}
                <div>
                  <div className="flex w-full items-center justify-center rounded-xl border py-4 text-base font-bold shadow-sm"
                    style={{ backgroundColor: form.footerContactColor?.trim() || form.buttonBgColor?.trim() || accentColor, color: form.footerContactTextColor?.trim() || '#111827', borderColor: globalBorderColor }}>
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
