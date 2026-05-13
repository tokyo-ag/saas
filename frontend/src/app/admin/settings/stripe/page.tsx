'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Tenant, TenantInput } from '@/lib/api';

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
    api.tenant.get().then((t) => {
      setTenant(t);
      setForm({
        stripePublishableKey: t.stripePublishableKey ?? '',
        stripeSecretKey: t.stripeSecretKey ?? '',
        stripeWebhookSecret: t.stripeWebhookSecret ?? '',
      });
    });
  }, []);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

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

  if (!tenant) return <div className="p-6 text-gray-400">読み込み中...</div>;

  const webhookUrl = `${(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')}/api/stripe-webhook/${tenant.id}`;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

      <div className="flex gap-0 mb-8 border-b border-gray-200 overflow-x-auto">
        <Link href="/admin/settings" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent whitespace-nowrap">団体情報</Link>
        <Link href="/admin/settings/line" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent whitespace-nowrap">LINE連携</Link>
        <span className="px-4 py-2 text-sm font-medium border-b-2 border-[#06C755] text-[#06C755] whitespace-nowrap">Stripe決済</span>
        <Link href="/admin/settings/plan" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent whitespace-nowrap">プラン</Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
      {saved && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">保存しました</div>}

      <div className="space-y-5">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">Stripe連携について</p>
          <p>Stripeのダッシュボードでシークレットキーと公開可能キーを取得してください。前払いイベントの参加料をオンライン決済で受け取れます。</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              公開可能キー（Publishable Key）
            </label>
            <input
              value={form.stripePublishableKey}
              onChange={(e) => set('stripePublishableKey', e.target.value)}
              placeholder="pk_live_... または pk_test_..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755] font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              シークレットキー（Secret Key）
            </label>
            <input
              type="password"
              value={form.stripeSecretKey}
              onChange={(e) => set('stripeSecretKey', e.target.value)}
              placeholder="sk_live_... または sk_test_..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755] font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">サーバー側でのみ使用されます。画面上には表示されません。</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Webhookシークレット（Webhook Secret）
            </label>
            <input
              type="password"
              value={form.stripeWebhookSecret}
              onChange={(e) => set('stripeWebhookSecret', e.target.value)}
              placeholder="whsec_..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755] font-mono"
            />
          </div>

          <button
            type="submit" disabled={saving}
            className="bg-[#06C755] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#05a847] disabled:opacity-50 transition-colors"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 text-sm mb-2">WebhookエンドポイントURL</h3>
          <p className="text-xs text-gray-500 mb-3">
            StripeダッシュボードのWebhooksに以下のURLを登録し、<code className="bg-gray-100 px-1 rounded">checkout.session.completed</code> イベントを有効にしてください。
          </p>
          <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 flex items-center justify-between">
            <span className="truncate">{webhookUrl}</span>
            <button
              onClick={() => navigator.clipboard.writeText(webhookUrl)}
              className="ml-2 text-xs text-[#06C755] hover:underline shrink-0"
            >
              コピー
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
