'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Tenant, TenantInput } from '@/lib/api';
import { DIRECT_API_URL } from '@/lib/client-api-base';
import { SaveToast } from '@/components/ui/SaveToast';

const tabs = [
  { label: '団体情報', href: '/admin/settings' },
  { label: 'LINE連携', href: '/admin/settings/line' },
  { label: 'Stripe決済', href: '/admin/settings/stripe', active: true },
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
          <Link key={tab.href} href={tab.href} className="whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
            {tab.label}
          </Link>
        ),
      )}
    </nav>
  );
}

export default function StripeSettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState<Pick<TenantInput, 'stripePublishableKey' | 'stripeSecretKey' | 'stripeWebhookSecret'>>({
    stripePublishableKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.tenant.get().then((tenantData) => {
      setTenant(tenantData);
      setForm({
        stripePublishableKey: tenantData.stripePublishableKey ?? '',
        stripeSecretKey: tenantData.stripeSecretKey ?? '',
        stripeWebhookSecret: tenantData.stripeWebhookSecret ?? '',
      });
    });
  }, []);

  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await api.tenant.update({
        stripePublishableKey: form.stripePublishableKey || undefined,
        stripeSecretKey: form.stripeSecretKey || undefined,
        stripeWebhookSecret: form.stripeWebhookSecret || undefined,
      });
      setTenant(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!tenant) {
    return <div className="px-4 py-12 text-center text-sm text-gray-400">読み込み中...</div>;
  }

  if (tenant.plan !== 'pro') {
    return (
      <div className="px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-5 text-2xl font-bold text-gray-900">設定</h1>
          <SettingsTabs />
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="mb-1 text-base font-semibold text-amber-800">Stripe事前決済はPROプランの機能です</p>
            <p className="mb-4 text-sm text-amber-700">Stripe連携によるイベント事前決済にはPROプランへのアップグレードが必要です。</p>
            <Link href="/admin/settings/plan" className="inline-block rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-700">
              PROプランを見る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const webhookUrl = `${DIRECT_API_URL}/api/stripe-webhook/${tenant.id}`;

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-5 text-2xl font-bold text-gray-900">設定</h1>
        <SettingsTabs />

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <SaveToast show={saved} />

        <div className="space-y-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <p className="mb-1 font-semibold">Stripe連携について</p>
            <p className="leading-relaxed">事前決済を使うイベントでは、Stripeの公開可能キー、シークレットキー、Webhook Secretを設定してください。</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">公開可能キー</label>
              <input
                value={form.stripePublishableKey}
                onChange={(e) => set('stripePublishableKey', e.target.value)}
                placeholder="pk_live_... または pk_test_..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">シークレットキー</label>
              <input
                type="password"
                value={form.stripeSecretKey}
                onChange={(e) => set('stripeSecretKey', e.target.value)}
                placeholder="sk_live_... または sk_test_..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
              <p className="mt-1 text-xs text-gray-500">サーバー側でのみ利用されます。画面上には表示されません。</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Webhook Secret</label>
              <input
                type="password"
                value={form.stripeWebhookSecret}
                onChange={(e) => set('stripeWebhookSecret', e.target.value)}
                placeholder="whsec_..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-[#06C755] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#05a847] disabled:opacity-50 sm:w-auto"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </form>

          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">WebhookエンドポイントURL</h2>
            <p className="mb-3 text-xs leading-relaxed text-gray-500">
              Stripe Dashboard の Webhooks に以下のURLを登録し、<code className="rounded bg-gray-100 px-1">checkout.session.completed</code> を有効にしてください。
            </p>
            <div className="rounded-lg bg-gray-100 px-3 py-2">
              <div className="break-all font-mono text-xs text-gray-800 sm:text-sm">{webhookUrl}</div>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
                className="mt-2 text-xs font-medium text-[#06C755] hover:underline"
              >
                コピー
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
