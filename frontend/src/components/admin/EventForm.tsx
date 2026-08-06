'use client';

import { useEffect, useState } from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, API_URL, Event, Tenant } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { getEventTagGroups, LOCATION_TAGS, TOKYO_WARDS, TOKYO_CITIES, OTHER_PREFECTURE_TAGS, WARD_SUBAREAS, SEARCH_TAGS, MEETUP_SEARCH_TAGS } from '@/lib/lpTags';
import { Section, Field, RadioGroup, Check, UploadButton } from './EventFormPrimitives';

type EventFormData = {
  title: string;
  description: string;
  heldAt: string;
  endAt: string;
  location: string;
  locationUrl: string;
  locationHint: string;
  capacityMode: 'none' | 'total' | 'gender';
  capacity: string;
  capacityMale: string;
  capacityFemale: string;
  status: 'draft' | 'open' | 'closed';
  priceMode: 'same' | 'gender';
  price: string;
  priceMale: string;
  priceFemale: string;
  paymentTiming: 'onsite' | 'prepay' | 'both';
  notifyOnReserve: boolean;
  notifyOnReserveApp: boolean;
  reservationMessageTemplate: string;
  remindEnabled: boolean;
  remindApp: boolean;
  remindPreset: 'prev18' | 'day9' | 'custom';
  remindAt: string;
  reminderMessageTemplate: string;
  levelEnabled: boolean;
  rosterShareEnabled: boolean;
  reserveActionStyle: '' | 'comiu' | 'line';
  imageUrl: string;
  iconUrl: string;
  category: string;
  tags: string[];
};

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]';
const DEFAULT_RESERVATION_MESSAGE = '【{title}】ご予約ありがとうございます！\n日時：{date}\n参加費：{price}\n場所：{location}';
const DEFAULT_REMINDER_MESSAGE = '【{title}】まもなく開催です！\n日時：{date}\n参加費：{price}\n場所：{location}';
const ALL_SUBAREAS: readonly string[] = Object.values(WARD_SUBAREAS).flat();
const EVENT_TAG_VALUES: readonly string[] = [
  ...LOCATION_TAGS,
  ...SEARCH_TAGS,
  ...MEETUP_SEARCH_TAGS,
  ...ALL_SUBAREAS,
];
export const PORTAL_CATEGORY_TAGS = ['交流会', 'バドミントン', 'バスケ', 'フットサル', 'バレー'];

function normalizePortalCategoryTags(tags: string[]) {
  const firstCategory = tags.find((tag) => PORTAL_CATEGORY_TAGS.includes(tag));
  return tags.filter((tag) => !PORTAL_CATEGORY_TAGS.includes(tag) || tag === firstCategory);
}

function normalizeEventTags(tags: string[]) {
  return normalizePortalCategoryTags(tags.filter((tag) => EVENT_TAG_VALUES.includes(tag)));
}

function toLocalDatetimeValue(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function compressImage(file: File, maxBytes = 4 * 1024 * 1024): Promise<Blob> {
  if (file.size <= maxBytes) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const quality = 0.8;
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > 1920) { height = Math.round(height * 1920 / width); width = 1920; }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', quality);
    };
    img.src = url;
  });
}

async function uploadFile(file: File): Promise<string> {
  const compressed = await compressImage(file);
  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `${Date.now()}.${ext}`;
  const res = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
    method: 'POST',
    body: compressed,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'アップロードに失敗しました');
  return data.url as string;
}

function numOrNull(value: string) {
  const n = Number(value);
  return value === '' || Number.isNaN(n) ? null : n;
}

function addHours(value: string, hours: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setHours(date.getHours() + hours);
  return toLocalDatetimeValue(date.toISOString());
}

function timeFromLocalDatetime(value: string) {
  return value ? value.slice(11, 16) : '';
}

function sameDayDatetime(dateTime: string, time: string) {
  if (!dateTime || !time) return '';
  return `${dateTime.slice(0, 10)}T${time}`;
}

function formatLineDate(value: string, endValue: string) {
  if (!value) return '（日時未設定）';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '（日時未設定）';
  const day = date.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Tokyo',
  });
  const startTime = date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  });
  const endDate = endValue ? new Date(endValue) : null;
  const endTime = endDate && !Number.isNaN(endDate.getTime())
    ? endDate.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Tokyo',
      })
    : null;
  return `${day}${startTime}${endTime ? `~${endTime}` : ''}`;
}

function formatLinePrice(form: Pick<EventFormData, 'priceMode' | 'price' | 'priceMale' | 'priceFemale'>) {
  if (form.priceMode === 'gender') {
    const male = Number(form.priceMale || 0).toLocaleString('ja-JP');
    const female = Number(form.priceFemale || 0).toLocaleString('ja-JP');
    return `男性🚹${male}円、女性🚺${female}円`;
  }
  const price = Number(form.price || 0);
  return price === 0 ? '無料' : `${price.toLocaleString('ja-JP')}円`;
}

function renderLineMessage(
  template: string,
  form: Pick<EventFormData, 'title' | 'description' | 'heldAt' | 'endAt' | 'location' | 'locationUrl' | 'priceMode' | 'price' | 'priceMale' | 'priceFemale'>,
) {
  const location = form.location || '（場所未設定）';
  const values: Record<string, string> = {
    title: form.title || '（イベント名未設定）',
    date: formatLineDate(form.heldAt, form.endAt),
    price: formatLinePrice(form),
    location: form.locationUrl.trim() ? `${location}\n${form.locationUrl.trim()}` : location,
    description: form.description
      ? `${form.description.slice(0, 300)}${form.description.length > 300 ? '…' : ''}`
      : '',
  };
  return template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
}

function LineMessageEditor({
  title,
  timing,
  enabled,
  value,
  effectiveTemplate,
  preview,
  onChange,
}: {
  title: string;
  timing: string;
  enabled: boolean;
  value: string;
  effectiveTemplate: string;
  preview: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-400">{timing}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${enabled ? 'bg-[#06C755]/10 text-[#05a847]' : 'bg-gray-100 text-gray-400'}`}>
          {enabled ? '送信ON' : '送信OFF'}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label className="text-xs font-medium text-gray-600">送信文面を編集</label>
            {!value.trim() && (
              <button
                type="button"
                onClick={() => onChange(effectiveTemplate)}
                className="text-[11px] font-medium text-[#05a847] hover:underline"
              >
                現在の文面を編集する
              </button>
            )}
          </div>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={effectiveTemplate}
            rows={9}
            maxLength={5000}
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-xs leading-5 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          />
          <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-gray-400">
            <span>{value.trim() ? 'このイベント専用の文面' : '団体の標準文面を使用中'}</span>
            <span>{value.length}/5000</span>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-600">実際に送られる文章</p>
          <div className="rounded-xl bg-[#e8f7e8] p-3">
            <div className="ml-auto max-w-[94%] rounded-2xl rounded-tr-sm bg-white px-3 py-2 shadow-sm">
              <p className="whitespace-pre-wrap break-words text-xs leading-5 text-gray-800">{preview}</p>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">
            {'{title}・{date}・{price}・{location}・{description}'} は上のイベント情報で置き換えています。
          </p>
        </div>
      </div>
    </section>
  );
}

// ネイティブのtime入力はブラウザによって15分刻みの候補リストが効かないことがあるため、
// selectで明示的に15分単位の選択肢のみを提示する。
const TIME_OPTIONS_15MIN: string[] = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

function timeOptionsWith(value: string): string[] {
  if (!value || TIME_OPTIONS_15MIN.includes(value)) return TIME_OPTIONS_15MIN;
  return [...TIME_OPTIONS_15MIN, value].sort();
}

export default function EventForm({
  initial,
  simplified,
  hideLevel,
  hideLineNotify,
  onSaved,
  onDeleted,
}: {
  initial?: Event;
  simplified?: boolean;
  hideLevel?: boolean;
  hideLineNotify?: boolean;
  onSaved?: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isFreePlan, setIsFreePlan] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantReserveActionStyle, setTenantReserveActionStyle] = useState<'comiu' | 'line'>('comiu');
  const [tokyoExpanded, setTokyoExpanded] = useState(false);
  const [tamaExpanded, setTamaExpanded] = useState(false);
  const isLineConfigured = !!tenant?.lineConfigured;
  const initialHeldAt = toLocalDatetimeValue(initial?.heldAt);
  const initialEndAt = initial?.endAt
    ? sameDayDatetime(initialHeldAt, timeFromLocalDatetime(toLocalDatetimeValue(initial.endAt)))
    : '';

  const [form, setForm] = useState<EventFormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    heldAt: initialHeldAt,
    endAt: initialEndAt,
    location: initial?.location ?? '',
    locationUrl: initial?.locationUrl ?? '',
    locationHint: initial?.locationHint ?? '',
    capacityMode: initial?.capacityMale != null || initial?.capacityFemale != null ? 'gender' : initial?.capacity != null ? 'total' : 'none',
    capacity: initial?.capacity?.toString() ?? '',
    capacityMale: initial?.capacityMale?.toString() ?? '',
    capacityFemale: initial?.capacityFemale?.toString() ?? '',
    status: (initial?.status ?? 'open') as 'draft' | 'open' | 'closed',
    priceMode: initial?.priceMale != null || initial?.priceFemale != null ? 'gender' : 'same',
    price: initial?.price?.toString() ?? '0',
    priceMale: initial?.priceMale?.toString() ?? '0',
    priceFemale: initial?.priceFemale?.toString() ?? '0',
    paymentTiming: (initial?.paymentTiming ?? 'onsite') as 'onsite' | 'prepay' | 'both',
    notifyOnReserve: initial?.notifyOnReserve ?? true,
    notifyOnReserveApp: initial?.notifyOnReserveApp ?? true,
    reservationMessageTemplate: initial?.reservationMessageTemplate ?? '',
    remindEnabled: initial?.remindEnabled ?? false,
    remindApp: initial?.remindApp ?? false,
    remindPreset: 'prev18',
    remindAt: toLocalDatetimeValue(initial?.remindAt),
    reminderMessageTemplate: initial?.reminderMessageTemplate ?? '',
    levelEnabled: initial?.levelEnabled ?? false,
    rosterShareEnabled: initial?.rosterShareEnabled ?? false,
    reserveActionStyle: (initial?.reserveActionStyle === 'line' ? 'line' : initial?.reserveActionStyle === 'comiu' ? 'comiu' : '') as '' | 'comiu' | 'line',
    imageUrl: initial?.imageUrl ?? '',
    iconUrl: initial?.iconUrl ?? '',
    category: initial?.category ?? '',
    tags: normalizeEventTags(initial?.tags ?? []),
  });

  useEffect(() => {
    // 超簡単モバイル管理のセッションには/admin/tenantへのアクセス権がなく、
    // simplifiedモードではLINE通知・Stripe関連UIも表示しないため、そもそも不要。
    if (simplified) return;
    api.tenant.get().then((tenantData) => {
      setTenant(tenantData);
      setIsFreePlan(tenantData.plan === 'free');
      setIsPro(tenantData.plan === 'pro');
    }).catch(() => {});
    api.publicPages.list().then((pages) => {
      const first = pages[0];
      if (!first) return;
      try {
        const footer = first.footerText ? JSON.parse(first.footerText) : {};
        setTenantReserveActionStyle(footer.reserveActionStyle === 'line' ? 'line' : 'comiu');
      } catch { /* ignore */ }
    }).catch(() => {});
  }, [simplified]);

  useEffect(() => {
    if (!initial && tenant?.linePictureUrl) {
      setForm((prev) => (prev.iconUrl ? prev : { ...prev, iconUrl: tenant.linePictureUrl! }));
    }
  }, [tenant, initial]);

  const set = (key: keyof EventFormData, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  function handleHeldDateChange(date: string) {
    const time = timeFromLocalDatetime(form.heldAt) || '19:00';
    handleHeldAtChange(date ? `${date}T${time}` : '');
  }

  function handleHeldTimeChange(time: string) {
    const date = form.heldAt ? form.heldAt.slice(0, 10) : toLocalDatetimeValue(new Date().toISOString()).slice(0, 10);
    handleHeldAtChange(time ? `${date}T${time}` : '');
  }

  function handleHeldAtChange(newHeldAt: string) {
    if (form.endAt && newHeldAt) {
      const newDate = newHeldAt.slice(0, 10);
      const endTime = form.endAt.slice(10);
      const shiftedEndAt = newDate + endTime;
      const endAt =
        new Date(shiftedEndAt).getTime() > new Date(newHeldAt).getTime()
          ? shiftedEndAt
          : addHours(newHeldAt, 2);
      setForm((prev) => ({ ...prev, heldAt: newHeldAt, endAt }));
    } else {
      set('heldAt', newHeldAt);
    }
  }

  function handleEndTimeChange(time: string) {
    const endAt = sameDayDatetime(form.heldAt, time);
    if (endAt && new Date(endAt).getTime() <= new Date(form.heldAt).getTime()) {
      set('endAt', addHours(form.heldAt, 2));
      return;
    }
    set('endAt', endAt);
  }

  const TITLE_PLACEHOLDERS: Record<string, string> = {
    meetup: '例：20代社会人交流会 初参加歓迎 池袋開催',
    badminton: '例：バドミントン初心者交流会 20代限定 豊島区開催',
    futsal: '例：フットサル交流会 社会人歓迎 新宿開催',
    basketball: '例：バスケットボール3on3 20代男女 渋谷開催',
    volleyball: '例：バレー交流会 初心者歓迎 新宿開催',
    '': '例：テニス交流会 20代限定 渋谷開催',
  };

  const AVAILABLE_TAGS = [
    '交流会',
    'バドミントン',
    'バスケ',
    'フットサル',
    'バレー',
    '初参加歓迎',
    'ひとり参加歓迎',
    '友達作り',
    '少人数',
    '初心者歓迎',
    '20代限定',
    '30代限定',
    '男女歓迎',
    '社会人',
    '学生歓迎',
    '18～22歳大学生・短大専門・社会人',
    'カフェ会',
    'ランチ会',
    '飲み会',
    '週末開催',
    '平日夜',
    '駅近',
  ];

  const DESCRIPTION_TEMPLATES: Record<string, string> = {
    meetup: `東京で20代向けの交流会を開催します。
初参加・ひとり参加の方も歓迎です。友達作りや新しいつながりを楽しみましょう。

【こんな方におすすめ】
・同年代の友達を増やしたい方
・仕事や学校以外のつながりを作りたい方
・気軽に話せる交流会に参加したい方

当日は受付後、自己紹介や交流しやすい時間を用意します。お気軽にお越しください。`,
    badminton: `東京・豊島区でバドミントン交流会を開催します。
初心者・未経験者も大歓迎！20代を中心に男女問わず参加できます。

【こんな方におすすめ】
・バドミントンを始めたい方
・一緒に練習する仲間を探している方
・新しい出会いを楽しみたい方

ラケットの貸し出しあり。動きやすい服装でお越しください。`,
    futsal: `東京・新宿でフットサル交流会を開催します。
社会人・初心者大歓迎！男女混合で楽しくプレーしましょう。

【こんな方におすすめ】
・フットサルを始めたい方
・運動不足を解消したい方
・新しい仲間と繋がりたい方

シューズのレンタルあり。動きやすい服装でお越しください。`,
    basketball: `東京・渋谷でバスケットボール交流会を開催します。
20代男女歓迎！初心者から経験者まで一緒に楽しみましょう。

【こんな方におすすめ】
・バスケを久しぶりにやりたい方
・仲間と一緒に汗を流したい方
・新しい出会いを楽しみたい方

動きやすい服装と室内シューズをご持参ください。`,
    volleyball: `東京でバレー交流会を開催します。
初心者・経験者どちらも歓迎です。20代を中心に、楽しく体を動かしましょう。

【こんな方におすすめ】
・バレーを久しぶりにやりたい方
・同年代とチームスポーツを楽しみたい方
・新しい仲間と交流したい方

動きやすい服装と室内シューズをご持参ください。`,
  };

  function insertTemplate() {
    const tmpl = DESCRIPTION_TEMPLATES[form.category];
    if (tmpl) set('description', tmpl);
  }

  // The 検索タグ options shown depend on category (meetup vs. everything else) - drop any
  // already-selected search tag that isn't valid for the newly picked category, so switching
  // e.g. バドミントン -> 交流会 doesn't silently keep "ラケット貸出有り" selected.
  function handleCategoryChange(category: string) {
    const validSearchTags: readonly string[] = category === 'meetup' ? MEETUP_SEARCH_TAGS : SEARCH_TAGS;
    const allSearchTags: readonly string[] = [...SEARCH_TAGS, ...MEETUP_SEARCH_TAGS];
    setForm((prev) => ({
      ...prev,
      category,
      tags: prev.tags.filter((tag) => !allSearchTags.includes(tag) || validSearchTags.includes(tag)),
    }));
  }

  function toggleTag(tag: string, groupTags: readonly string[], single: boolean) {
    setForm((prev) => {
      const active = prev.tags.includes(tag);
      const withoutGroup = prev.tags.filter((t) => !groupTags.includes(t));
      return {
        ...prev,
        tags: active
          ? prev.tags.filter((t) => t !== tag)
          : single
            ? [...withoutGroup, tag]
            : [...prev.tags, tag],
      };
    });
  }

  // Ward selection is single-choice among LOCATION_TAGS, same as toggleTag(..., single: true) -
  // but also clears any previously selected sub-area, since a sub-area from a different (or the
  // same, on deselect) ward no longer makes sense once the ward itself changes.
  function selectWard(ward: string) {
    setForm((prev) => {
      const active = prev.tags.includes(ward);
      const withoutLocation = prev.tags.filter((t) => !LOCATION_TAGS.includes(t as never) && !ALL_SUBAREAS.includes(t));
      return { ...prev, tags: active ? withoutLocation : [...withoutLocation, ward] };
    });
  }

  // Sub-area selection: single-choice among the current ward's sub-areas, kept alongside the
  // ward tag (not replacing it).
  function selectSubarea(subarea: string) {
    setForm((prev) => {
      const active = prev.tags.includes(subarea);
      const withoutSubareas = prev.tags.filter((t) => !ALL_SUBAREAS.includes(t));
      return { ...prev, tags: active ? withoutSubareas : [...withoutSubareas, subarea] };
    });
  }

  function calcRemindAt(preset: string, heldAt: string): string {
    if (!heldAt) return '';
    const d = new Date(heldAt);
    if (preset === 'prev18') {
      d.setDate(d.getDate() - 1);
      d.setHours(18, 0, 0, 0);
    } else if (preset === 'day9') {
      d.setHours(9, 0, 0, 0);
    } else {
      return form.remindAt;
    }
    return toLocalDatetimeValue(d.toISOString());
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    setUpgradeRequired(false);
    setSubmitting(true);

    const heldAtMs = new Date(form.heldAt).getTime();
    const endAtMs = form.endAt ? new Date(form.endAt).getTime() : null;
    if (Number.isNaN(heldAtMs)) {
      setError('開始日時を正しく入力してください。');
      setSubmitting(false);
      return;
    }
    if (endAtMs !== null && (Number.isNaN(endAtMs) || endAtMs <= heldAtMs)) {
      setError('終了日時は開始日時より後にしてください。');
      setSubmitting(false);
      return;
    }

    let remindAt: string | null = null;
    if (form.remindEnabled || form.remindApp) {
      const value = form.remindPreset !== 'custom' ? calcRemindAt(form.remindPreset, form.heldAt) : form.remindAt;
      if (value && new Date(value).getTime() >= heldAtMs) {
        setError('リマインド日時は開始日時より前にしてください。');
        setSubmitting(false);
        return;
      }
      remindAt = value ? new Date(value).toISOString() : null;
    }

    let capacity: number | null = null;
    let capacityMale: number | null = null;
    let capacityFemale: number | null = null;
    if (form.capacityMode === 'total') capacity = numOrNull(form.capacity);
    if (form.capacityMode === 'gender') {
      capacityMale = numOrNull(form.capacityMale);
      capacityFemale = numOrNull(form.capacityFemale);
      const total = (capacityMale ?? 0) + (capacityFemale ?? 0);
      capacity = total > 0 ? total : null;
    }

    const body = {
      title: form.title,
      description: form.description || undefined,
      heldAt: new Date(form.heldAt).toISOString(),
      endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
      location: form.location,
      locationUrl: form.locationUrl || undefined,
      locationHint: form.locationHint || null,
      capacity,
      capacityMale,
      capacityFemale,
      status: form.status,
      price: Number(form.price),
      priceMale: form.priceMode === 'gender' ? numOrNull(form.priceMale) : null,
      priceFemale: form.priceMode === 'gender' ? numOrNull(form.priceFemale) : null,
      paymentRequired: form.paymentTiming === 'prepay',
      paymentTiming: form.paymentTiming,
      notifyOnReserve: form.notifyOnReserve,
      notifyOnReserveApp: form.notifyOnReserveApp,
      reservationMessageTemplate: form.reservationMessageTemplate || null,
      remindEnabled: form.remindEnabled,
      remindApp: form.remindApp,
      remindAt,
      reminderMessageTemplate: form.reminderMessageTemplate || null,
      levelEnabled: form.levelEnabled,
      rosterShareEnabled: form.rosterShareEnabled,
      reserveActionStyle: form.reserveActionStyle || null,
      imageUrl: form.imageUrl || undefined,
      iconUrl: form.iconUrl || undefined,
      category: form.category || null,
      tags: normalizeEventTags(form.tags),
    };

    try {
      if (initial) {
        await api.events.update(initial.id, body);
      } else {
        await api.events.create(body);
      }
      router.refresh();
      if (onSaved) onSaved();
      else router.push('/admin/events');
    } catch (err: any) {
      if (err.message?.includes('スタンダード') || err.message?.includes('プラン')) setUpgradeRequired(true);
      else setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initial) return;
    if (!confirm('このイベントを削除しますか？')) return;
    setSubmitting(true);
    try {
      await api.events.delete(initial.id);
      if (onDeleted) onDeleted();
      else router.push('/admin/events');
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const showStripe = form.paymentTiming !== 'onsite' && (
    form.priceMode === 'same' ? Number(form.price) > 0 : Number(form.priceMale) > 0 || Number(form.priceFemale) > 0
  );
  const defaultReservationTemplate = `${DEFAULT_RESERVATION_MESSAGE}${form.description ? '\n\n{description}' : ''}`;
  const reservationTemplate = form.reservationMessageTemplate.trim()
    ? form.reservationMessageTemplate
    : tenant?.reservationMessageTemplate?.trim() || defaultReservationTemplate;
  const reminderTemplate = form.reminderMessageTemplate.trim()
    ? form.reminderMessageTemplate
    : tenant?.reminderMessageTemplate?.trim() || DEFAULT_REMINDER_MESSAGE;
  const reservationPreview = renderLineMessage(reservationTemplate, form);
  const reminderPreview = renderLineMessage(reminderTemplate, form);

  return (
    <form onSubmit={handleSubmit} className="grid max-w-6xl items-start gap-6 xl:grid-cols-[minmax(0,672px)_minmax(360px,1fr)]">
      <div className="space-y-7 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      {upgradeRequired && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          フリープランの上限に達しました。
          <Link href="/admin/settings/plan" className="ml-1 font-medium underline">プランを確認する</Link>
        </div>
      )}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* 公開設定 */}
      <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
        form.status === 'open' ? 'border-[#06C755]/40 bg-[#06C755]/5' : 'border-gray-200 bg-gray-50'
      }`}>
        <div>
          <p className="text-sm font-semibold text-gray-800">公開設定</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {form.status === 'open' ? '受付中 — ユーザーに公開されています' : form.status === 'draft' ? '下書き — まだ公開されていません' : '受付終了 — 受付を締め切っています'}
          </p>
        </div>
        <select
          value={form.status}
          onChange={(e) => set('status', e.target.value)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#06C755] ${
            form.status === 'open' ? 'border-[#06C755] bg-white text-[#06C755]' : 'border-gray-300 bg-white text-gray-700'
          }`}
        >
          <option value="draft">下書き</option>
          <option value="open">受付中</option>
          <option value="closed">受付終了</option>
        </select>
      </div>

      <Section title="基本情報">
        <Field label="カテゴリ">
          <select value={form.category} onChange={(e) => handleCategoryChange(e.target.value)} className={inputClass}>
            <option value="">なし</option>
            <option value="meetup">交流会</option>
            <option value="badminton">バドミントン</option>
            <option value="futsal">フットサル</option>
            <option value="basketball">バスケットボール</option>
            <option value="volleyball">バレー</option>
          </select>
        </Field>
        <Field label="タイトル" required>
          <input
            required
            maxLength={100}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder={TITLE_PLACEHOLDERS[form.category] ?? TITLE_PLACEHOLDERS['']}
            className={inputClass}
          />
        </Field>
        <Field label="LP用タグ">
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            {getEventTagGroups(form.category).map((group) => {
              if (group.label === '場所タグ') {
                const selectedWard = TOKYO_WARDS.find((t) => form.tags.includes(t));
                const selectedCity = TOKYO_CITIES.find((t) => form.tags.includes(t));
                const selectedArea = selectedWard ?? selectedCity;
                const showWards = tokyoExpanded || !!selectedWard;
                const showCities = tamaExpanded || !!selectedCity;
                const subareaOptions = selectedArea ? WARD_SUBAREAS[selectedArea] ?? [] : [];
                return (
                  <div key={group.label}>
                    <p className="mb-1.5 text-xs font-bold text-gray-500">{group.label}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setTokyoExpanded((v) => !v)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          showWards
                            ? 'bg-[#06C755] text-white border-[#06C755]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-[#06C755]'
                        }`}
                      >
                        東京23区
                      </button>
                      <button
                        type="button"
                        onClick={() => setTamaExpanded((v) => !v)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          showCities
                            ? 'bg-[#06C755] text-white border-[#06C755]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-[#06C755]'
                        }`}
                      >
                        東京都下
                      </button>
                      {OTHER_PREFECTURE_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => selectWard(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            form.tags.includes(tag)
                              ? 'bg-[#06C755] text-white border-[#06C755]'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-[#06C755]'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    {showWards && (
                      <div className="mt-2 pl-3 border-l-2 border-[#06C755]/30">
                        <p className="mb-1.5 text-xs text-gray-400">東京23区（任意で1つ選択）</p>
                        <div className="flex flex-wrap gap-2">
                          {TOKYO_WARDS.map((ward) => (
                            <button
                              key={ward}
                              type="button"
                              onClick={() => selectWard(ward)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                form.tags.includes(ward)
                                  ? 'bg-[#06C755] text-white border-[#06C755]'
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-[#06C755]'
                              }`}
                            >
                              {ward}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {showCities && (
                      <div className="mt-2 pl-3 border-l-2 border-[#06C755]/30">
                        <p className="mb-1.5 text-xs text-gray-400">東京都下（任意で1つ選択）</p>
                        <div className="flex flex-wrap gap-2">
                          {TOKYO_CITIES.map((city) => (
                            <button
                              key={city}
                              type="button"
                              onClick={() => selectWard(city)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                form.tags.includes(city)
                                  ? 'bg-[#06C755] text-white border-[#06C755]'
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-[#06C755]'
                              }`}
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {subareaOptions.length > 0 && (
                      <div className="mt-2 pl-6 border-l-2 border-[#06C755]/30">
                        <p className="mb-1.5 text-xs text-gray-400">{selectedArea}の細かいエリア（任意）</p>
                        <div className="flex flex-wrap gap-2">
                          {subareaOptions.map((subarea) => (
                            <button
                              key={subarea}
                              type="button"
                              onClick={() => selectSubarea(subarea)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                form.tags.includes(subarea)
                                  ? 'bg-[#06C755] text-white border-[#06C755]'
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-[#06C755]'
                              }`}
                            >
                              {subarea}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <div key={group.label}>
                  <p className="mb-1.5 text-xs font-bold text-gray-500">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag, group.tags, group.single)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          form.tags.includes(tag)
                            ? 'bg-[#06C755] text-white border-[#06C755]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-[#06C755]'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-500">場所タグは1つだけ選択できます。「東京23区」を選ぶと区の一覧が、区によっては更に細かいエリアが選べます。検索タグは地域LPや検索ページ整理に使います。</p>
          {simplified && (
            <p className="mt-1 text-xs text-gray-400">※タグを使って頂ければ団体をより多くの人にCOMIU側でPRの協力ができます（○○地域で活動中のサークル一覧、初心者大歓迎のサークル一覧など）。</p>
          )}
        </Field>
        <Field label="説明">
          {DESCRIPTION_TEMPLATES[form.category] && (
            <button
              type="button"
              onClick={insertTemplate}
              className="mb-2 text-xs text-[#06C755] font-medium border border-[#06C755]/40 rounded-lg px-3 py-1.5 hover:bg-[#06C755]/5 transition-colors"
            >
              テンプレートを挿入
            </button>
          )}
          <textarea rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} className={inputClass} />
        </Field>
      </Section>

      <Section title="画像">
        <Field label="バナー画像">
          {form.imageUrl && <NextImage src={imgUrl(form.imageUrl, API_URL)!} alt="" width={1200} height={1500} className="mb-2 w-full rounded-lg border border-gray-200 object-cover aspect-[4/5]" unoptimized />}
          <UploadButton uploading={uploading} onUpload={async (file) => set('imageUrl', await uploadFile(file))} setUploading={setUploading} setError={setError} />
          {form.imageUrl && <button type="button" onClick={() => set('imageUrl', '')} className="mt-2 text-xs text-red-500 hover:underline">削除</button>}
        </Field>
      </Section>

      <Section title="日時と場所">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="開始日時" required>
            <div className="grid grid-cols-[1fr_140px] gap-2">
              <input required type="date" value={form.heldAt.slice(0, 10)} onChange={(e) => handleHeldDateChange(e.target.value)} className={inputClass} />
              <select required value={timeFromLocalDatetime(form.heldAt)} onChange={(e) => handleHeldTimeChange(e.target.value)} className={inputClass}>
                {!timeFromLocalDatetime(form.heldAt) && <option value="" />}
                {timeOptionsWith(timeFromLocalDatetime(form.heldAt)).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </Field>
          <Field label="終了日時">
            <div className={simplified ? '' : 'grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center'}>
              <select
                disabled={!form.heldAt}
                value={timeFromLocalDatetime(form.endAt)}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className={inputClass}
              >
                <option value="" />
                {timeOptionsWith(timeFromLocalDatetime(form.endAt))
                  .filter((t) => !timeFromLocalDatetime(form.heldAt) || t > timeFromLocalDatetime(form.heldAt))
                  .map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {!simplified && (
                <p className="text-xs leading-5 text-gray-500">
                  {form.heldAt ? `${form.heldAt.slice(0, 10)} と同じ日で保存されます。` : '開始日時を選ぶと入力できます。'}
                </p>
              )}
            </div>
          </Field>
        </div>
        <Field label="場所名" required>
          <input required maxLength={200} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="例: 渋谷区スポーツセンター" className={inputClass} />
        </Field>
        <Field label="地図URL">
          <input type="url" value={form.locationUrl} onChange={(e) => set('locationUrl', e.target.value)} placeholder="https://maps.google.com/..." className={inputClass} />
        </Field>
        <Field label="場所の目安表示（駅からの距離など）">
          <input maxLength={200} value={form.locationHint} onChange={(e) => set('locationHint', e.target.value)} placeholder="例: 渋谷駅から徒歩5分" className={inputClass} />
          <p className="text-xs leading-5 text-gray-500">
            予約前の方や検索エンジンには、場所名の代わりにこの目安が表示されます。未入力の場合は場所名がそのまま表示されます。予約済みの方には常に正式な場所名が表示されます。
          </p>
        </Field>
      </Section>

      <Section title="定員">
        <RadioGroup
          value={form.capacityMode}
          onChange={(value) => set('capacityMode', value)}
          options={[
            ['none', '制限なし'],
            ['total', '合計で設定'],
            ['gender', '男女別'],
          ]}
        />
        {form.capacityMode === 'total' && (
          <div className="flex max-w-44 items-center gap-2">
            <input type="number" min={5} max={300} step={5} value={form.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="30" className={inputClass} />
            <span className="text-sm text-gray-500">人</span>
          </div>
        )}
        {form.capacityMode === 'gender' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="男性">
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={300} step={5} value={form.capacityMale} onChange={(e) => set('capacityMale', e.target.value)} className={inputClass} />
                <span className="text-sm text-gray-500">人</span>
              </div>
            </Field>
            <Field label="女性">
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={300} step={5} value={form.capacityFemale} onChange={(e) => set('capacityFemale', e.target.value)} className={inputClass} />
                <span className="text-sm text-gray-500">人</span>
              </div>
            </Field>
          </div>
        )}
      </Section>

      <Section title="参加費">
        <RadioGroup
          value={form.priceMode}
          onChange={(value) => set('priceMode', value)}
          options={[
            ['same', '一律'],
            ['gender', '男女別'],
          ]}
        />
        {form.priceMode === 'same' ? (
          <div className="flex max-w-44 items-center gap-2">
            <span className="text-sm text-gray-500">¥</span>
            <input type="number" min={0} step={100} value={form.price} onChange={(e) => set('price', e.target.value)} className={inputClass} />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="男性">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">¥</span>
                <input type="number" min={0} step={100} value={form.priceMale} onChange={(e) => set('priceMale', e.target.value)} className={inputClass} />
              </div>
            </Field>
            <Field label="女性">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">¥</span>
                <input type="number" min={0} step={100} value={form.priceFemale} onChange={(e) => set('priceFemale', e.target.value)} className={inputClass} />
              </div>
            </Field>
          </div>
        )}
        {!simplified && (
          <div>
            <p className="mb-2 text-xs text-gray-500">支払いタイミング</p>
            <div className="flex flex-wrap gap-3">
              {([['onsite', '当日払い'], ['prepay', '事前決済'], ['both', 'どちらでも可']] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-700">
                  <input type="radio" checked={form.paymentTiming === val} onChange={() => set('paymentTiming', val)} className="accent-[#06C755]" />
                  {label}
                </label>
              ))}
            </div>
            {(form.paymentTiming === 'prepay' || form.paymentTiming === 'both') && !showStripe && (
              <p className="mt-2 text-xs text-gray-400">事前決済を使用するにはStripe連携が必要です。参加者がオンラインで事前支払いを行います。</p>
            )}
            {showStripe && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                事前決済にはStripe設定が必要です。
                <Link href="/admin/settings/stripe" className="ml-1 underline">Stripe設定へ</Link>
              </p>
            )}
          </div>
        )}
      </Section>

      <Section title="参加者情報">
        <div className="mb-3">
          <p className="mb-2 text-xs text-gray-500">予約スタイル</p>
          <RadioGroup
            value={form.reserveActionStyle}
            onChange={(value) => set('reserveActionStyle', value)}
            options={[
              ['', `団体の設定に従う（現在：${tenantReserveActionStyle === 'line' ? 'LINEで予約する' : 'COMIUで予約する'}）`],
              ['comiu', 'COMIUで予約する'],
              ['line', 'LINEで予約する'],
            ]}
          />
        </div>
        {!hideLevel && (
          <Check
            label="予約時にレベル（初心者・中級・上級）を確認する"
            checked={form.levelEnabled}
            onChange={(checked) => set('levelEnabled', checked)}
          />
        )}
        <Check
          label="参加者名簿を公開する（ログイン不要の共有リンクを発行）"
          checked={form.rosterShareEnabled}
          onChange={(checked) => set('rosterShareEnabled', checked)}
        />
      </Section>

      {!hideLineNotify && (
      <Section title="通知">
        {/* 予約完了時の通知 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">予約完了時</p>
          <div className={`flex flex-wrap gap-3 ${!isLineConfigured ? 'pointer-events-none opacity-35' : ''}`}>
            <Check
              label="LINE"
              checked={form.notifyOnReserve}
              disabled={!isLineConfigured || !isPro}
              onChange={(checked) => set('notifyOnReserve', checked)}
            />
          </div>
          {!isLineConfigured && (
            <p className="mt-1 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-400">
              LINE通知を使うにはLINE API設定が必要です。
              <Link href="/admin/settings/line" className="ml-1 underline">LINE設定へ</Link>
            </p>
          )}
          {form.notifyOnReserve && (
            <p className="text-xs text-gray-400">送信文面は右側の「事前リマインド」で編集・確認できます。</p>
          )}
        </div>

        {/* リマインド通知 */}
        <div className="space-y-2 pt-3">
          <p className={`text-sm font-medium ${isFreePlan ? 'text-gray-400' : 'text-gray-700'}`}>
            事前リマインド
            {isFreePlan && <span className="ml-2 text-xs text-[#06C755]">スタンダード以上</span>}
          </p>
          <div className={`flex flex-wrap gap-3 ${!isLineConfigured || isFreePlan ? 'pointer-events-none opacity-35' : ''}`}>
            <Check
              label="LINE"
              checked={form.remindEnabled}
              disabled={isFreePlan || !isLineConfigured}
              onChange={(checked) => set('remindEnabled', checked)}
            />
          </div>
          {!isLineConfigured && !isFreePlan && (
            <p className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-400">
              LINE通知を使うにはLINE API設定が必要です。
              <Link href="/admin/settings/line" className="ml-1 underline">LINE設定へ</Link>
            </p>
          )}
          {(form.remindEnabled || form.remindApp) && (
            <div className="space-y-2 border-l-2 border-[#06C755]/30 pl-4 pt-1">
              <RadioGroup
                value={form.remindPreset}
                onChange={(value) => set('remindPreset', value)}
                options={[
                  ['prev18', '前日 18:00'],
                  ['day9', '当日 09:00'],
                  ['custom', 'カスタム日時'],
                ]}
              />
              {form.remindPreset === 'custom' && (
                <input type="datetime-local" step={1800} value={form.remindAt} onChange={(e) => set('remindAt', e.target.value)} className={`${inputClass} max-w-xs`} />
              )}
              <p className="text-xs text-gray-400">送信文面は右側の「前日リマインド」で編集・確認できます。</p>
            </div>
          )}
        </div>
      </Section>
      )}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
        <button type="submit" disabled={submitting} className="rounded-lg bg-[#06C755] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#05a847] disabled:opacity-50">
          {submitting ? '保存中...' : '保存'}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
          キャンセル
        </button>
        {initial && (
          <button type="button" onClick={handleDelete} disabled={submitting} className="rounded-lg px-6 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 sm:ml-auto">
            削除
          </button>
        )}
      </div>
      </div>

      {!hideLineNotify && form.remindEnabled && (
        <aside className="space-y-5 xl:sticky xl:top-6">
          <LineMessageEditor
            title="事前リマインド"
            timing="予約完了時に送信"
            enabled={form.notifyOnReserve}
            value={form.reservationMessageTemplate}
            effectiveTemplate={reservationTemplate}
            preview={reservationPreview}
            onChange={(value) => set('reservationMessageTemplate', value)}
          />
          <LineMessageEditor
            title="前日リマインド"
            timing={form.remindPreset === 'prev18' ? '前日 18:00に送信' : form.remindPreset === 'day9' ? '当日 09:00に送信' : `${form.remindAt || 'カスタム日時未設定'}に送信`}
            enabled={form.remindEnabled}
            value={form.reminderMessageTemplate}
            effectiveTemplate={reminderTemplate}
            preview={reminderPreview}
            onChange={(value) => set('reminderMessageTemplate', value)}
          />
        </aside>
      )}
    </form>
  );
}
