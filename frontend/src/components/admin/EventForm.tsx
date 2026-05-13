'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, api, Event, Tenant } from '@/lib/api';

type EventFormData = {
  title: string;
  description: string;
  heldAt: string;
  location: string;
  locationUrl: string;
  // 定員
  capacityMode: 'none' | 'total' | 'gender';
  capacity: string;
  capacityMale: string;
  capacityFemale: string;
  status: 'draft' | 'open' | 'closed';
  // 料金
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
};

function toLocalDatetimeValue(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_URL}/api/admin/upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('アップロードに失敗しました');
  const { url } = await res.json();
  return url as string;
}

function numOrNull(s: string) {
  const n = Number(s);
  return s === '' || isNaN(n) ? null : n;
}

export default function EventForm({ initial }: { initial?: Event }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isFreePlan, setIsFreePlan] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    api.tenant.get().then((t) => {
      setTenant(t);
      setIsFreePlan(t.plan === 'free');
    }).catch(() => {});
  }, []);

  const [form, setForm] = useState<EventFormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    heldAt: toLocalDatetimeValue(initial?.heldAt),
    location: initial?.location ?? '',
    locationUrl: initial?.locationUrl ?? '',
    capacityMode: initial?.capacityMale != null || initial?.capacityFemale != null ? 'gender'
      : initial?.capacity != null ? 'total' : 'none',
    capacity: initial?.capacity?.toString() ?? '',
    capacityMale: initial?.capacityMale?.toString() ?? '',
    capacityFemale: initial?.capacityFemale?.toString() ?? '',
    status: (initial?.status ?? 'draft') as any,
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
  });

  // テナント読み込み後、新規作成時はアイコンをデフォルト設定
  useEffect(() => {
    if (!initial && tenant?.linePictureUrl && !form.iconUrl) {
      setForm((f) => ({ ...f, iconUrl: tenant.linePictureUrl! }));
    }
  }, [tenant, initial]);

  const set = (key: keyof EventFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function calcRemindAt(preset: string, heldAt: string): string {
    if (!heldAt) return '';
    const d = new Date(heldAt);
    if (preset === 'prev18') { d.setDate(d.getDate() - 1); d.setHours(18, 0, 0, 0); }
    else if (preset === 'day9') { d.setHours(9, 0, 0, 0); }
    else return form.remindAt;
    return toLocalDatetimeValue(d.toISOString());
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    setUpgradeRequired(false);
    setSubmitting(true);

    let remindAt: string | null = null;
    if (form.remindEnabled || form.remindApp) {
      remindAt = form.remindPreset !== 'custom'
        ? new Date(calcRemindAt(form.remindPreset, form.heldAt)).toISOString()
        : new Date(form.remindAt).toISOString();
    }

    // 定員
    let capacity: number | null = null;
    let capacityMale: number | null = null;
    let capacityFemale: number | null = null;
    if (form.capacityMode === 'total') capacity = numOrNull(form.capacity);
    if (form.capacityMode === 'gender') {
      capacityMale = numOrNull(form.capacityMale);
      capacityFemale = numOrNull(form.capacityFemale);
      const m = capacityMale ?? 0;
      const f = capacityFemale ?? 0;
      capacity = m + f > 0 ? m + f : null;
    }

    // 料金
    const price = Number(form.price);
    const priceMale = form.priceMode === 'gender' ? numOrNull(form.priceMale) : null;
    const priceFemale = form.priceMode === 'gender' ? numOrNull(form.priceFemale) : null;

    const body = {
      title: form.title,
      description: form.description || undefined,
      heldAt: new Date(form.heldAt).toISOString(),
      location: form.location,
      locationUrl: form.locationUrl || undefined,
      capacity,
      capacityMale,
      capacityFemale,
      status: form.status,
      price,
      priceMale,
      priceFemale,
      paymentRequired: form.paymentTiming === 'prepay',
      paymentTiming: form.paymentTiming,
      notifyOnReserve: form.notifyOnReserve,
      notifyOnReserveApp: form.notifyOnReserveApp,
      remindEnabled: form.remindEnabled,
      remindApp: form.remindApp,
      remindAt,
      imageUrl: form.imageUrl || undefined,
      iconUrl: form.iconUrl || undefined,
    };

    try {
      if (initial) {
        await apiFetch(`/admin/events/${initial.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/admin/events', { method: 'POST', body: JSON.stringify(body) });
      }
      router.push('/admin/events');
    } catch (err: any) {
      if (err.message?.includes('スタンダードプラン')) setUpgradeRequired(true);
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
      await apiFetch(`/admin/events/${initial.id}`, { method: 'DELETE' });
      router.push('/admin/events');
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const showStripe = form.paymentTiming !== 'onsite' && (
    form.priceMode === 'same' ? Number(form.price) > 0
      : (Number(form.priceMale) > 0 || Number(form.priceFemale) > 0)
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-7 max-w-2xl">
      {upgradeRequired && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          フリープランの上限に達しました。
          <Link href="/admin/settings" className="underline ml-1 font-medium">スタンダードプランへアップグレード →</Link>
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* タイトル・説明 */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">タイトル <span className="text-red-500">*</span></label>
          <input required maxLength={100} value={form.title} onChange={(e) => set('title', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
          <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
        </div>
      </div>

      {/* 画像（バナー） */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">バナー画像（横長）</p>
        {form.imageUrl && (
          <img src={`${API_URL}${form.imageUrl}`} alt="" className="w-full h-32 object-cover rounded-lg mb-2 border border-gray-200" />
        )}
        <label className={`flex items-center justify-center gap-2 w-full border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs cursor-pointer hover:border-[#06C755] ${uploading ? 'opacity-50' : ''}`}>
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              setUploading(true);
              try { set('imageUrl', await uploadFile(file)); } catch { setError('バナー画像のアップロードに失敗しました'); } finally { setUploading(false); }
            }} />
          {uploading ? 'アップロード中...' : '画像を選択'}
        </label>
        {form.imageUrl && <button type="button" onClick={() => set('imageUrl', '')} className="text-xs text-red-500 hover:underline mt-1">削除</button>}
      </div>

      {/* 日時・ステータス */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">開催日時 <span className="text-red-500">*</span></label>
          <input required type="datetime-local" value={form.heldAt} onChange={(e) => set('heldAt', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]">
            <option value="draft">下書き</option>
            <option value="open">受付中</option>
            <option value="closed">受付終了</option>
          </select>
        </div>
      </div>

      {/* 開催場所 */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">場所名 <span className="text-red-500">*</span></label>
          <input required maxLength={200} value={form.location} onChange={(e) => set('location', e.target.value)}
            placeholder="例: 渋谷区文化センター 大ホール"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">地図URL（Google Maps等）</label>
          <input type="url" value={form.locationUrl} onChange={(e) => set('locationUrl', e.target.value)}
            placeholder="https://maps.google.com/..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
          {form.locationUrl && (
            <a href={form.locationUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#06C755] hover:underline mt-1 inline-block">
              地図を確認 →
            </a>
          )}
        </div>
      </div>

      {/* 定員 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">定員</label>
        <div className="flex gap-4 mb-3">
          {(['none', 'total', 'gender'] as const).map((m) => (
            <label key={m} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
              <input type="radio" checked={form.capacityMode === m} onChange={() => set('capacityMode', m)} className="accent-[#06C755]" />
              {m === 'none' ? '無制限' : m === 'total' ? '合計で設定' : '男女別'}
            </label>
          ))}
        </div>
        {form.capacityMode === 'total' && (
          <input type="number" min={5} step={5} value={form.capacity} onChange={(e) => set('capacity', e.target.value)}
            placeholder="例: 30" className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
        )}
        {form.capacityMode === 'gender' && (
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">男性</label>
              <input type="number" min={0} step={5} value={form.capacityMale} onChange={(e) => set('capacityMale', e.target.value)}
                placeholder="15" className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            </div>
            <span className="text-gray-400 mt-4">/</span>
            <div>
              <label className="block text-xs text-gray-500 mb-1">女性</label>
              <input type="number" min={0} step={5} value={form.capacityFemale} onChange={(e) => set('capacityFemale', e.target.value)}
                placeholder="15" className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            </div>
            {(form.capacityMale || form.capacityFemale) && (
              <p className="text-xs text-gray-400 mt-4">合計 {(Number(form.capacityMale) || 0) + (Number(form.capacityFemale) || 0)}人</p>
            )}
          </div>
        )}
      </div>

      {/* 料金 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">参加料</label>
        <div className="flex gap-4 mb-3">
          {(['same', 'gender'] as const).map((m) => (
            <label key={m} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
              <input type="radio" checked={form.priceMode === m} onChange={() => set('priceMode', m)} className="accent-[#06C755]" />
              {m === 'same' ? '一律' : '男女別'}
            </label>
          ))}
        </div>
        {form.priceMode === 'same' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">¥</span>
            <input type="number" min={0} step={100} value={form.price} onChange={(e) => set('price', e.target.value)}
              className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
          </div>
        )}
        {form.priceMode === 'gender' && (
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">男性 ¥</label>
              <input type="number" min={0} step={100} value={form.priceMale} onChange={(e) => set('priceMale', e.target.value)}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">女性 ¥</label>
              <input type="number" min={0} step={100} value={form.priceFemale} onChange={(e) => set('priceFemale', e.target.value)}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            </div>
          </div>
        )}

        {/* 支払いタイミング */}
        <div className="mt-3">
          <label className="block text-xs text-gray-500 mb-2">支払いタイミング</label>
          <div className="flex flex-wrap gap-3">
            {([
              ['onsite', '当日払い'],
              ['prepay', '事前払い（Stripe）'],
              ['both', 'どちらでも可'],
            ] as const).map(([v, label]) => (
              <label key={v} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="radio" checked={form.paymentTiming === v} onChange={() => set('paymentTiming', v)} className="accent-[#06C755]" />
                {label}
              </label>
            ))}
          </div>
          {showStripe && (
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg">
              Stripeが設定済みの場合のみ事前払いが機能します。<Link href="/admin/settings/stripe" className="underline">Stripe設定 →</Link>
            </p>
          )}
        </div>
      </div>

      {/* 通知 */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">予約完了時の通知</p>
          <div className="space-y-1.5 ml-1">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.notifyOnReserve} onChange={(e) => set('notifyOnReserve', e.target.checked)} className="rounded" />
              LINEで送る
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.notifyOnReserveApp} onChange={(e) => set('notifyOnReserveApp', e.target.checked)} className="rounded" />
              アプリ内メッセージで送る
            </label>
          </div>
        </div>
        <div>
          <p className={`text-sm font-medium mb-2 ${isFreePlan ? 'text-gray-400' : 'text-gray-700'}`}>
            リマインド通知
            {isFreePlan && <span className="text-xs text-[#06C755] ml-2">（スタンダードプランで利用可）</span>}
          </p>
          <div className="space-y-1.5 ml-1">
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${isFreePlan ? 'text-gray-400' : 'text-gray-700'}`}>
              <input type="checkbox" checked={form.remindEnabled} onChange={(e) => set('remindEnabled', e.target.checked)} disabled={isFreePlan} className="rounded" />
              LINEで送る
            </label>
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${isFreePlan ? 'text-gray-400' : 'text-gray-700'}`}>
              <input type="checkbox" checked={form.remindApp} onChange={(e) => set('remindApp', e.target.checked)} disabled={isFreePlan} className="rounded" />
              アプリ内メッセージで送る
            </label>
          </div>
        </div>
      </div>

      {(form.remindEnabled || form.remindApp) && (
        <div className="ml-5 space-y-2 border-l-2 border-[#06C755]/30 pl-4">
          {(['prev18', 'day9', 'custom'] as const).map((preset) => (
            <label key={preset} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="radio" name="remindPreset" value={preset} checked={form.remindPreset === preset} onChange={() => set('remindPreset', preset)} />
              {preset === 'prev18' && '前日 18:00'}
              {preset === 'day9' && '当日 09:00'}
              {preset === 'custom' && 'カスタム日時'}
            </label>
          ))}
          {form.remindPreset === 'custom' && (
            <input type="datetime-local" value={form.remindAt} onChange={(e) => set('remindAt', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
          )}
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button type="submit" disabled={submitting}
          className="bg-[#06C755] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#05a847] disabled:opacity-50 transition-colors">
          {submitting ? '保存中...' : '保存'}
        </button>
        <button type="button" onClick={() => router.back()} className="text-gray-600 text-sm hover:text-gray-900">
          キャンセル
        </button>
        {initial && (
          <button type="button" onClick={handleDelete} disabled={submitting}
            className="ml-auto text-red-600 text-sm hover:text-red-800 disabled:opacity-50">
            削除
          </button>
        )}
      </div>
    </form>
  );
}
