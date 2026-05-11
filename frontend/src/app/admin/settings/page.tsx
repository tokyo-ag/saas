'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Tenant, TenantInput } from '@/lib/api';

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState<Pick<TenantInput, 'name' | 'description'>>({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.tenant.get().then((t) => {
      setTenant(t);
      setForm({ name: t.name, description: t.description ?? '' });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await api.tenant.update({ name: form.name, description: form.description });
      setTenant(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!tenant) return <div className="p-6 text-gray-400">読み込み中...</div>;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <span className="px-4 py-2 text-sm font-medium border-b-2 border-indigo-600 text-indigo-600">団体情報</span>
        <Link href="/admin/settings/line" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
          LINE連携
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        {saved && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">保存しました</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">団体名 <span className="text-red-500">*</span></label>
          <input
            required maxLength={100}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">団体説明</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="LIFF画面のトップに表示される説明文です"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="pt-1">
          <p className="text-xs text-gray-500 mb-1">プラン</p>
          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${tenant.plan === 'standard' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-600'}`}>
            {tenant.plan === 'standard' ? 'スタンダード' : 'フリー'}
          </span>
        </div>

        <button
          type="submit" disabled={saving}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </form>
    </div>
  );
}
