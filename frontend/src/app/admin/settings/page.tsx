'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Tenant, TenantInput } from '@/lib/api';


export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState<Pick<TenantInput, 'name' | 'description'>>({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.tenant.get().then((t) => {
      setTenant(t);
      setForm({ name: t.name, description: t.description ?? '' });
    });
  }, []);

  async function handleSubmit(e: React.SyntheticEvent) {
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

  async function handleSyncLine() {
    setSyncing(true);
    setError('');
    try {
      const updated = await api.tenant.syncLineProfile();
      setTenant(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  if (!tenant) return <div className="p-6 text-gray-400">読み込み中...</div>;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

      <div className="flex gap-0 mb-8 border-b border-gray-200 overflow-x-auto">
        <span className="px-4 py-2 text-sm font-medium border-b-2 border-[#06C755] text-[#06C755] whitespace-nowrap">団体情報</span>
        <Link href="/admin/settings/line" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent whitespace-nowrap">
          LINE連携
        </Link>
        <Link href="/admin/settings/stripe" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent whitespace-nowrap">
          Stripe決済
        </Link>
        <Link href="/admin/settings/plan" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent whitespace-nowrap">
          プラン
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
      {saved && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">保存しました</div>}

      {/* LINEプロフィール同期カード */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {tenant.linePictureUrl ? (
              <img src={tenant.linePictureUrl} className="w-14 h-14 rounded-full object-cover border border-gray-200" alt="" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl shrink-0">🏢</div>
            )}
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {tenant.lineDisplayName ?? '未取得'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">LINE公式アカウントのプロフィール</p>
            </div>
          </div>
          <button
            onClick={handleSyncLine}
            disabled={syncing || !tenant.lineChannelAccessToken}
            className="text-sm px-4 py-2 rounded-lg border border-[#06C755] text-[#06C755] hover:bg-[#06C755]/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {syncing ? '同期中...' : 'LINEから同期'}
          </button>
        </div>
        {!tenant.lineChannelAccessToken && (
          <p className="text-xs text-gray-400 mt-3">
            ※ <Link href="/admin/settings/line" className="underline">LINE連携</Link> を先に設定してください
          </p>
        )}
      </div>

      {/* 団体情報フォーム */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">団体名 <span className="text-red-500">*</span></label>
          <input
            required maxLength={100}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">団体説明</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="LIFF画面のトップに表示される説明文です"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          />
        </div>

        <div className="pt-1">
          <p className="text-xs text-gray-500 mb-1">プラン</p>
          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${tenant.plan === 'standard' ? 'bg-[#06C755]/10 text-[#06C755]' : 'bg-gray-100 text-gray-600'}`}>
            {tenant.plan === 'standard' ? 'スタンダード' : 'フリー'}
          </span>
        </div>

        <button
          type="submit" disabled={saving}
          className="bg-[#06C755] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#05a847] disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </form>
    </div>
  );
}
