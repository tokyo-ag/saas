'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Tenant, TenantInput } from '@/lib/api';

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api';

type Step = 1 | 2 | 3 | 4;

export default function LineSettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<Pick<TenantInput, 'lineChannelId' | 'lineChannelSecret' | 'lineChannelAccessToken' | 'liffId'>>({
    lineChannelId: '',
    lineChannelSecret: '',
    lineChannelAccessToken: '',
    liffId: '',
  });
  const [organizerLineUserId, setOrganizerLineUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.tenant.get().then((t) => {
      setTenant(t);
      setForm({
        lineChannelId: t.lineChannelId ?? '',
        lineChannelSecret: t.lineChannelSecret ?? '',
        lineChannelAccessToken: t.lineChannelAccessToken ?? '',
        liffId: t.liffId ?? '',
      });
      setOrganizerLineUserId(t.organizerLineUserId ?? '');
      if (t.lineChannelAccessToken) setStep(3);
      if (t.liffId) setStep(4);
    });
  }, []);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function save(data: Partial<TenantInput>) {
    setSaving(true);
    setError('');
    try {
      const updated = await api.tenant.update(data);
      setTenant(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  const webhookUrl = `${BASE}/webhook/${tenant?.id ?? ''}`;
  const liffEndpoint = typeof window !== 'undefined'
    ? `${window.location.origin}/liff/${tenant?.id ?? ''}`
    : '';

  if (!tenant) return <div className="p-6 text-gray-400">読み込み中...</div>;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

      <div className="flex gap-0 mb-8 border-b border-gray-200 overflow-x-auto">
        <Link href="/admin/settings" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent whitespace-nowrap">団体情報</Link>
        <span className="px-4 py-2 text-sm font-medium border-b-2 border-[#06C755] text-[#06C755] whitespace-nowrap">LINE連携</span>
        <Link href="/admin/settings/stripe" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent whitespace-nowrap">Stripe決済</Link>
        <Link href="/admin/settings/plan" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent whitespace-nowrap">プラン</Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
      {saved && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">保存しました</div>}

      <div className="space-y-4">
        {/* STEP 1 */}
        <StepCard step={1} currentStep={step} title="LINE公式アカウントを作る">
          <p className="text-sm text-gray-600 mb-4">
            まだLINE公式アカウントがない場合は、LINEのビジネスIDページから作成してください。
          </p>
          <button
            onClick={() => setStep(2)}
            className="bg-[#06C755] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#05a847]"
          >
            作成済み・次へ
          </button>
        </StepCard>

        {/* STEP 2 */}
        <StepCard step={2} currentStep={step} title="Messaging APIチャネルの情報を入力">
          <p className="text-sm text-gray-600 mb-4">
            LINE Developersのチャネル設定から Channel ID・Channel Secret・Access Token をコピーして貼り付けてください。
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Channel ID</label>
              <input value={form.lineChannelId} onChange={(e) => set('lineChannelId', e.target.value)}
                placeholder="1234567890"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Channel Secret</label>
              <input value={form.lineChannelSecret} onChange={(e) => set('lineChannelSecret', e.target.value)}
                type="password" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Channel Access Token</label>
              <input value={form.lineChannelAccessToken} onChange={(e) => set('lineChannelAccessToken', e.target.value)}
                type="password" placeholder="長い文字列"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
            </div>
          </div>
          <button
            disabled={saving || !form.lineChannelId || !form.lineChannelSecret || !form.lineChannelAccessToken}
            onClick={async () => {
              const ok = await save({ lineChannelId: form.lineChannelId, lineChannelSecret: form.lineChannelSecret, lineChannelAccessToken: form.lineChannelAccessToken });
              if (ok) setStep(3);
            }}
            className="mt-4 bg-[#06C755] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#05a847] disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存して次へ'}
          </button>
        </StepCard>

        {/* STEP 3 */}
        <StepCard step={3} currentStep={step} title="LIFFアプリを追加する">
          <p className="text-sm text-gray-600 mb-3">
            LINE DevelopersでLIFFアプリを追加し、エンドポイントURLに以下を設定してください。
          </p>
          <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 mb-4 flex items-center justify-between">
            <span className="truncate">{liffEndpoint}</span>
            <button onClick={() => navigator.clipboard.writeText(liffEndpoint)}
              className="ml-2 text-xs text-[#06C755] hover:underline shrink-0">コピー</button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">LIFF ID</label>
            <input value={form.liffId} onChange={(e) => set('liffId', e.target.value)}
              placeholder="1234567890-xxxxxxxx"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
          </div>
          <button
            disabled={saving || !form.liffId}
            onClick={async () => {
              const ok = await save({ liffId: form.liffId });
              if (ok) setStep(4);
            }}
            className="mt-4 bg-[#06C755] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#05a847] disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存して次へ'}
          </button>
        </StepCard>

        {/* STEP 4 */}
        <StepCard step={4} currentStep={step} title="WebhookURLを設定する">
          <p className="text-sm text-gray-600 mb-3">
            LINE DevelopersのMessaging APIチャネルで、以下のURLをWebhook URLに設定し「検証」をクリックしてください。
          </p>
          <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 mb-4 flex items-center justify-between">
            <span className="truncate">{webhookUrl}</span>
            <button onClick={() => navigator.clipboard.writeText(webhookUrl)}
              className="ml-2 text-xs text-[#06C755] hover:underline shrink-0">コピー</button>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
            設定完了です！LINE公式アカウントを友だち追加するとWebhookが届きます。
          </div>
        </StepCard>

        {/* 主催者LINE ID */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">主催者のLINE ユーザーID</h3>
          <p className="text-xs text-gray-500 mb-3">キャンセル通知など、管理者向けメッセージの送信先です。LINE Developersの「Messaging API」→「Webhook」でテスト送信すると確認できます。</p>
          <input
            value={organizerLineUserId}
            onChange={(e) => setOrganizerLineUserId(e.target.value)}
            placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755] mb-3"
          />
          <button
            disabled={saving}
            onClick={() => save({ organizerLineUserId: organizerLineUserId || undefined })}
            className="bg-[#06C755] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#05a847] disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step, currentStep, title, children }: {
  step: Step; currentStep: Step; title: string; children: React.ReactNode;
}) {
  const done = currentStep > step;
  const active = currentStep === step;
  return (
    <div className={`bg-white rounded-xl border p-5 transition-all ${active ? 'border-[#06C755]/50 shadow-sm' : 'border-gray-200 opacity-60'}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? 'bg-green-500 text-white' : active ? 'bg-[#06C755] text-white' : 'bg-gray-200 text-gray-500'}`}>
          {done ? '✓' : step}
        </span>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      {active && children}
    </div>
  );
}
