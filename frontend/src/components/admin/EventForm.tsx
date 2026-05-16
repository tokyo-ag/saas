'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, API_URL, Event, Tenant } from '@/lib/api';
import { Section, Field, RadioGroup, Check, UploadButton } from './EventFormPrimitives';

type EventFormData = {
  title: string;
  description: string;
  heldAt: string;
  endAt: string;
  location: string;
  locationUrl: string;
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
  remindEnabled: boolean;
  remindApp: boolean;
  remindPreset: 'prev18' | 'day9' | 'custom';
  remindAt: string;
  imageUrl: string;
  iconUrl: string;
  category: string;
  tags: string[];
};

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]';

function toLocalDatetimeValue(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function uploadFile(file: File): Promise<string> {
  const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    body: file,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'アップロードに失敗しました');
  return data.url as string;
}

function numOrNull(value: string) {
  const n = Number(value);
  return value === '' || Number.isNaN(n) ? null : n;
}

export default function EventForm({ initial }: { initial?: Event }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isFreePlan, setIsFreePlan] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const [form, setForm] = useState<EventFormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    heldAt: toLocalDatetimeValue(initial?.heldAt),
    endAt: toLocalDatetimeValue(initial?.endAt),
    location: initial?.location ?? '',
    locationUrl: initial?.locationUrl ?? '',
    capacityMode: initial?.capacityMale != null || initial?.capacityFemale != null ? 'gender' : initial?.capacity != null ? 'total' : 'none',
    capacity: initial?.capacity?.toString() ?? '',
    capacityMale: initial?.capacityMale?.toString() ?? '',
    capacityFemale: initial?.capacityFemale?.toString() ?? '',
    status: (initial?.status ?? 'open') as any,
    priceMode: initial?.priceMale != null || initial?.priceFemale != null ? 'gender' : 'same',
    price: initial?.price?.toString() ?? '0',
    priceMale: initial?.priceMale?.toString() ?? '0',
    priceFemale: initial?.priceFemale?.toString() ?? '0',
    paymentTiming: (initial?.paymentTiming as any) ?? 'onsite',
    notifyOnReserve: initial?.notifyOnReserve ?? true,
    notifyOnReserveApp: (initial as any)?.notifyOnReserveApp ?? false,
    remindEnabled: initial?.remindEnabled ?? false,
    remindApp: (initial as any)?.remindApp ?? false,
    remindPreset: 'prev18',
    remindAt: toLocalDatetimeValue(initial?.remindAt),
    imageUrl: initial?.imageUrl ?? '',
    iconUrl: initial?.iconUrl ?? '',
    category: (initial as any)?.category ?? '',
    tags: (initial as any)?.tags ?? [],
  });

  useEffect(() => {
    api.tenant.get().then((tenantData) => {
      setTenant(tenantData);
      setIsFreePlan(tenantData.plan === 'free');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!initial && tenant?.linePictureUrl && !form.iconUrl) {
      setForm((prev) => ({ ...prev, iconUrl: tenant.linePictureUrl! }));
    }
  }, [tenant, initial, form.iconUrl]);

  const set = (key: keyof EventFormData, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const TITLE_PLACEHOLDERS: Record<string, string> = {
    badminton: '例：バドミントン初心者交流会 20代限定 豊島区開催',
    futsal: '例：フットサル交流会 社会人歓迎 新宿開催',
    basketball: '例：バスケットボール3on3 20代男女 渋谷開催',
    '': '例：テニス交流会 20代限定 渋谷開催',
  };

  const AVAILABLE_TAGS = ['初心者歓迎', '20代限定', '30代限定', '男女歓迎', '社会人', '学生歓迎', '18～22歳大学生・短大専門・社会人'];

  const DESCRIPTION_TEMPLATES: Record<string, string> = {
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
  };

  function insertTemplate() {
    const tmpl = DESCRIPTION_TEMPLATES[form.category];
    if (tmpl) set('description', tmpl);
  }

  function toggleTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
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

    let remindAt: string | null = null;
    if (form.remindEnabled || form.remindApp) {
      const value = form.remindPreset !== 'custom' ? calcRemindAt(form.remindPreset, form.heldAt) : form.remindAt;
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
      remindEnabled: form.remindEnabled,
      remindApp: form.remindApp,
      remindAt,
      imageUrl: form.imageUrl || undefined,
      iconUrl: form.iconUrl || undefined,
      category: form.category || null,
      tags: form.tags,
    };

    try {
      if (initial) {
        await api.events.update(initial.id, body);
      } else {
        await api.events.create(body);
      }
      router.refresh();
      router.push('/admin/events');
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
      router.push('/admin/events');
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const showStripe = form.paymentTiming !== 'onsite' && (
    form.priceMode === 'same' ? Number(form.price) > 0 : Number(form.priceMale) > 0 || Number(form.priceFemale) > 0
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-7 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
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
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputClass}>
            <option value="">なし</option>
            <option value="badminton">バドミントン</option>
            <option value="futsal">フットサル</option>
            <option value="basketball">バスケットボール</option>
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
        <Field label="タグ">
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
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
          {form.imageUrl && <img src={form.imageUrl.startsWith('http') ? form.imageUrl : `${API_URL}${form.imageUrl}`} alt="" className="mb-2 h-32 w-full rounded-lg border border-gray-200 object-cover" />}
          <UploadButton uploading={uploading} onUpload={async (file) => set('imageUrl', await uploadFile(file))} setUploading={setUploading} setError={setError} />
          {form.imageUrl && <button type="button" onClick={() => set('imageUrl', '')} className="mt-2 text-xs text-red-500 hover:underline">削除</button>}
        </Field>
      </Section>

      <Section title="日時と場所">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="開始日時" required>
            <input required type="datetime-local" value={form.heldAt} onChange={(e) => set('heldAt', e.target.value)} className={inputClass} />
          </Field>
          <Field label="終了日時">
            <input type="datetime-local" value={form.endAt} onChange={(e) => set('endAt', e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="場所名" required>
          <input required maxLength={200} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="例: 渋谷区スポーツセンター" className={inputClass} />
        </Field>
        <Field label="地図URL">
          <input type="url" value={form.locationUrl} onChange={(e) => set('locationUrl', e.target.value)} placeholder="https://maps.google.com/..." className={inputClass} />
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
          <input type="number" min={5} step={5} value={form.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="30" className={`${inputClass} max-w-40`} />
        )}
        {form.capacityMode === 'gender' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="男性">
              <input type="number" min={0} step={5} value={form.capacityMale} onChange={(e) => set('capacityMale', e.target.value)} className={inputClass} />
            </Field>
            <Field label="女性">
              <input type="number" min={0} step={5} value={form.capacityFemale} onChange={(e) => set('capacityFemale', e.target.value)} className={inputClass} />
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
              <input type="number" min={0} step={100} value={form.priceMale} onChange={(e) => set('priceMale', e.target.value)} className={inputClass} />
            </Field>
            <Field label="女性">
              <input type="number" min={0} step={100} value={form.priceFemale} onChange={(e) => set('priceFemale', e.target.value)} className={inputClass} />
            </Field>
          </div>
        )}
        <div>
          <p className="mb-2 text-xs text-gray-500">支払いタイミング</p>
          <RadioGroup
            value={form.paymentTiming}
            onChange={(value) => set('paymentTiming', value)}
            options={[
              ['onsite', '当日払い'],
              ['prepay', '事前決済'],
              ['both', 'どちらでも可'],
            ]}
          />
          {showStripe && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              事前決済にはStripe設定が必要です。
              <Link href="/admin/settings/stripe" className="ml-1 underline">Stripe設定へ</Link>
            </p>
          )}
        </div>
      </Section>

      <Section title="通知">
        <Check label="予約完了時にLINEで送る" checked={form.notifyOnReserve} onChange={(checked) => set('notifyOnReserve', checked)} />
        <Check label="予約完了時にアプリ内メッセージで送る" checked={form.notifyOnReserveApp} onChange={(checked) => set('notifyOnReserveApp', checked)} />
        <div className="pt-2">
          <p className={`mb-2 text-sm font-medium ${isFreePlan ? 'text-gray-400' : 'text-gray-700'}`}>
            リマインド通知
            {isFreePlan && <span className="ml-2 text-xs text-[#06C755]">スタンダード以上</span>}
          </p>
          <Check label="LINEで送る" checked={form.remindEnabled} disabled={isFreePlan} onChange={(checked) => set('remindEnabled', checked)} />
          <Check label="アプリ内メッセージで送る" checked={form.remindApp} disabled={isFreePlan} onChange={(checked) => set('remindApp', checked)} />
        </div>
      </Section>

      {(form.remindEnabled || form.remindApp) && (
        <div className="space-y-2 border-l-2 border-[#06C755]/30 pl-4">
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
            <input type="datetime-local" value={form.remindAt} onChange={(e) => set('remindAt', e.target.value)} className={`${inputClass} max-w-xs`} />
          )}
        </div>
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
    </form>
  );
}

