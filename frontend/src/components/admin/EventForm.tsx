'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, Event } from '@/lib/api';

type EventFormData = {
  title: string;
  description: string;
  heldAt: string;
  location: string;
  capacity: string;
  status: 'draft' | 'open' | 'closed';
  price: string;
  paymentRequired: boolean;
  notifyOnReserve: boolean;
  remindEnabled: boolean;
  remindPreset: 'prev18' | 'day9' | 'custom';
  remindAt: string;
};

function toLocalDatetimeValue(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventForm({ initial }: { initial?: Event }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<EventFormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    heldAt: toLocalDatetimeValue(initial?.heldAt),
    location: initial?.location ?? '',
    capacity: initial?.capacity?.toString() ?? '',
    status: (initial?.status ?? 'draft') as any,
    price: initial?.price?.toString() ?? '0',
    paymentRequired: initial?.paymentRequired ?? false,
    notifyOnReserve: initial?.notifyOnReserve ?? true,
    remindEnabled: initial?.remindEnabled ?? false,
    remindPreset: 'prev18',
    remindAt: toLocalDatetimeValue(initial?.remindAt),
  });

  const set = (key: keyof EventFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    let remindAt: string | null = null;
    if (form.remindEnabled) {
      if (form.remindPreset !== 'custom') {
        remindAt = new Date(calcRemindAt(form.remindPreset, form.heldAt)).toISOString();
      } else {
        remindAt = new Date(form.remindAt).toISOString();
      }
    }

    const body = {
      title: form.title,
      description: form.description || undefined,
      heldAt: new Date(form.heldAt).toISOString(),
      location: form.location,
      capacity: form.capacity ? Number(form.capacity) : null,
      status: form.status,
      price: Number(form.price),
      paymentRequired: form.paymentRequired,
      notifyOnReserve: form.notifyOnReserve,
      remindEnabled: form.remindEnabled,
      remindAt,
    };

    try {
      if (initial) {
        await apiFetch(`/admin/events/${initial.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/admin/events', { method: 'POST', body: JSON.stringify(body) });
      }
      router.push('/admin/events');
    } catch (err: any) {
      setError(err.message);
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

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6 max-w-2xl">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">タイトル <span className="text-red-500">*</span></label>
        <input
          required maxLength={100}
          value={form.title} onChange={(e) => set('title', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
        <textarea
          rows={4}
          value={form.description} onChange={(e) => set('description', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">開催日時 <span className="text-red-500">*</span></label>
          <input
            required type="datetime-local"
            value={form.heldAt} onChange={(e) => set('heldAt', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">定員（空欄で無制限）</label>
          <input
            type="number" min={1}
            value={form.capacity} onChange={(e) => set('capacity', e.target.value)}
            placeholder="例: 30"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">開催場所 <span className="text-red-500">*</span></label>
        <input
          required maxLength={200}
          value={form.location} onChange={(e) => set('location', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
          <select
            value={form.status} onChange={(e) => set('status', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="draft">下書き</option>
            <option value="open">受付中</option>
            <option value="closed">受付終了</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">参加料（円）</label>
          <input
            type="number" min={0}
            value={form.price} onChange={(e) => set('price', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {Number(form.price) > 0 && (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.paymentRequired} onChange={(e) => set('paymentRequired', e.target.checked)} className="rounded" />
          前払い必須にする
        </label>
      )}

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.notifyOnReserve} onChange={(e) => set('notifyOnReserve', e.target.checked)} className="rounded" />
          予約完了メッセージをLINEで送る
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.remindEnabled} onChange={(e) => set('remindEnabled', e.target.checked)} className="rounded" />
          リマインドメッセージをLINEで送る
        </label>
      </div>

      {form.remindEnabled && (
        <div className="ml-5 space-y-2 border-l-2 border-indigo-200 pl-4">
          {(['prev18', 'day9', 'custom'] as const).map((preset) => (
            <label key={preset} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="radio" name="remindPreset" value={preset} checked={form.remindPreset === preset} onChange={() => set('remindPreset', preset)} />
              {preset === 'prev18' && '前日 18:00'}
              {preset === 'day9' && '当日 09:00'}
              {preset === 'custom' && 'カスタム日時'}
            </label>
          ))}
          {form.remindPreset === 'custom' && (
            <input
              type="datetime-local"
              value={form.remindAt} onChange={(e) => set('remindAt', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit" disabled={submitting}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? '保存中...' : '保存'}
        </button>
        <button
          type="button" onClick={() => router.back()}
          className="text-gray-600 text-sm hover:text-gray-900"
        >
          キャンセル
        </button>
        {initial && (
          <button
            type="button" onClick={handleDelete} disabled={submitting}
            className="ml-auto text-red-600 text-sm hover:text-red-800 disabled:opacity-50"
          >
            削除
          </button>
        )}
      </div>
    </form>
  );
}
