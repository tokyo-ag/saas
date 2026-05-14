'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Tenant, TenantInput } from '@/lib/api';

const tabs = [
  { label: '団体情報', href: '/admin/settings', active: true },
  { label: 'LINE連携', href: '/admin/settings/line' },
  { label: 'Stripe決済', href: '/admin/settings/stripe' },
  { label: 'プラン', href: '/admin/settings/plan' },
];

function SettingsTabs() {
  return (
    <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-gray-200 px-4 md:mx-0 md:px-0">
      {tabs.map((tab) =>
        tab.active ? (
          <span key={tab.href} className="whitespace-nowrap border-b-2 border-[#06C755] px-4 py-2 text-sm font-medium text-[#06C755]">
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.href}
            href={tab.href}
            className="whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            {tab.label}
          </Link>
        ),
      )}
    </nav>
  );
}

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState<Pick<TenantInput, 'name' | 'description'>>({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.tenant.get().then((tenantData) => {
      setTenant(tenantData);
      setForm({ name: tenantData.name, description: tenantData.description ?? '' });
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

  if (!tenant) {
    return <div className="px-4 py-12 text-center text-sm text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-5 text-2xl font-bold text-gray-900">設定</h1>
        <SettingsTabs />

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {saved && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">保存しました</div>}

        <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {tenant.linePictureUrl ? (
                <img src={tenant.linePictureUrl} className="h-14 w-14 shrink-0 rounded-full border border-gray-200 object-cover" alt="" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-400">
                  LINE
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{tenant.lineDisplayName ?? '未取得'}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                  LINE公式アカウントの団体名とアイコンをイベント表示に利用します。
                </p>
              </div>
            </div>
            <button
              onClick={handleSyncLine}
              disabled={syncing || !tenant.lineChannelAccessToken}
              className="w-full shrink-0 rounded-lg border border-[#06C755] px-4 py-2 text-sm font-medium text-[#06C755] transition-colors hover:bg-[#06C755]/5 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {syncing ? '同期中...' : 'LINEから同期'}
            </button>
          </div>
          {!tenant.lineChannelAccessToken && (
            <p className="mt-3 text-xs text-gray-500">
              先に <Link href="/admin/settings/line" className="font-medium text-[#06C755] underline">LINE連携</Link> を設定してください。
            </p>
          )}
        </section>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">団体名 <span className="text-red-500">*</span></label>
            <input
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">団体説明</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="LIFF画面や公開ページに表示する説明文"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-500">プラン</p>
            <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${tenant.plan === 'standard' ? 'bg-[#06C755]/10 text-[#06C755]' : 'bg-gray-100 text-gray-600'}`}>
              {tenant.plan === 'standard' ? 'スタンダード' : tenant.plan === 'pro' ? 'プロ' : 'フリー'}
            </span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-[#06C755] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#05a847] disabled:opacity-50 sm:w-auto"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </form>
      </div>
    </div>
  );
}
