'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Tenant, TenantInput } from '@/lib/api';
import { SaveToast } from '@/components/ui/SaveToast';

const BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api`;

type Step = 1 | 2 | 3 | 4;

const tabs = [
  { label: '団体情報', href: '/admin/settings' },
  { label: 'LINE連携', href: '/admin/settings/line', active: true },
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
          <Link key={tab.href} href={tab.href} className="whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
            {tab.label}
          </Link>
        ),
      )}
    </nav>
  );
}

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
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.tenant.get().then((tenantData) => {
      setTenant(tenantData);
      setForm({
        lineChannelId: tenantData.lineChannelId ?? '',
        lineChannelSecret: tenantData.lineChannelSecret ?? '',
        lineChannelAccessToken: tenantData.lineChannelAccessToken ?? '',
        liffId: tenantData.liffId ?? '',
      });
      setOrganizerLineUserId(tenantData.organizerLineUserId ?? '');
      if (tenantData.lineChannelAccessToken) setStep(3);
      if (tenantData.liffId) setStep(4);
    });
  }, []);

  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

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
  const liffEndpoint = typeof window !== 'undefined' ? `${window.location.origin}/liff/${tenant?.id ?? ''}` : '';

  if (!tenant) {
    return <div className="px-4 py-12 text-center text-sm text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-5 text-2xl font-bold text-gray-900">設定</h1>
        <SettingsTabs />

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <SaveToast show={saved} />

        <div className="space-y-4">
          <StepCard step={1} currentStep={step} title="LINE公式アカウントを用意する">
            <p className="mb-4 text-sm leading-relaxed text-gray-600">
              まだLINE公式アカウントがない場合は作成してください。作成済みなら次の手順へ進めます。
            </p>
            <button onClick={() => setStep(2)} className="w-full rounded-lg bg-[#06C755] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#05a847] sm:w-auto">
              作成済み・次へ
            </button>
          </StepCard>

          <StepCard step={2} currentStep={step} title="Messaging APIの情報を入力する">
            <p className="mb-4 text-sm leading-relaxed text-gray-600">
              LINE Developers のチャネル設定から、Channel ID、Channel Secret、Access Token をコピーして貼り付けてください。
            </p>
            <div className="space-y-3">
              <Field label="Channel ID" value={form.lineChannelId ?? ''} onChange={(value) => set('lineChannelId', value)} placeholder="1234567890" />
              <Field label="Channel Secret" type="password" value={form.lineChannelSecret ?? ''} onChange={(value) => set('lineChannelSecret', value)} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
              <Field label="Channel Access Token" type="password" value={form.lineChannelAccessToken ?? ''} onChange={(value) => set('lineChannelAccessToken', value)} placeholder="長い文字列" />
            </div>
            <button
              disabled={saving || !form.lineChannelId || !form.lineChannelSecret || !form.lineChannelAccessToken}
              onClick={async () => {
                const ok = await save({
                  lineChannelId: form.lineChannelId,
                  lineChannelSecret: form.lineChannelSecret,
                  lineChannelAccessToken: form.lineChannelAccessToken,
                });
                if (ok) {
                  await api.tenant.syncLineProfile().catch(() => null);
                  setStep(3);
                }
              }}
              className="mt-4 w-full rounded-lg bg-[#06C755] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#05a847] disabled:opacity-50 sm:w-auto"
            >
              {saving ? '保存中...' : '保存して次へ'}
            </button>
          </StepCard>

          <StepCard step={3} currentStep={step} title="LIFFアプリを追加する">
            <p className="mb-3 text-sm leading-relaxed text-gray-600">
              LINE Developers でLIFFアプリを追加し、エンドポイントURLに以下を設定してください。
            </p>
            <CopyBox value={liffEndpoint} />
            <div className="mt-4">
              <Field label="LIFF ID" value={form.liffId ?? ''} onChange={(value) => set('liffId', value)} placeholder="1234567890-xxxxxxxx" />
            </div>
            <button
              disabled={saving || !form.liffId}
              onClick={async () => {
                const ok = await save({ liffId: form.liffId });
                if (ok) setStep(4);
              }}
              className="mt-4 w-full rounded-lg bg-[#06C755] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#05a847] disabled:opacity-50 sm:w-auto"
            >
              {saving ? '保存中...' : '保存して次へ'}
            </button>
          </StepCard>

          {tenant.lineChannelAccessToken && (
            <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-0.5">
                  {tenant.linePictureUrl ? (
                    <img src={tenant.linePictureUrl} className="w-8 h-8 rounded-lg object-cover shrink-0" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-[#06C755] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(tenant.lineDisplayName ?? tenant.name).slice(0, 1)}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-gray-900">{tenant.lineDisplayName ?? tenant.name}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">サイドバーに表示されるアイコンと名前</p>
              </div>
              <button
                onClick={async () => {
                  setSyncing(true);
                  try {
                    const updated = await api.tenant.syncLineProfile();
                    setTenant(updated);
                  } catch {
                    setError('LINEアイコンの取得に失敗しました');
                  } finally {
                    setSyncing(false);
                  }
                }}
                disabled={syncing}
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {syncing ? '取得中...' : 'アイコンを同期'}
              </button>
            </section>
          )}

          <StepCard step={4} currentStep={step} title="Webhook URLを設定する">
            <p className="mb-3 text-sm leading-relaxed text-gray-600">
              LINE Developers の Messaging API 設定で、Webhook URLに以下を設定して検証してください。
            </p>
            <CopyBox value={webhookUrl} />
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              設定完了です。LINE公式アカウントを友だち追加するとWebhookが届きます。
            </div>
          </StepCard>

          <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
            <h2 className="mb-1 text-sm font-semibold text-gray-900">主催者のLINEユーザーID</h2>
            <p className="mb-3 text-xs leading-relaxed text-gray-500">
              キャンセル通知など、管理者向けメッセージの送信先です。LINE Developers のWebhookログから確認できます。
            </p>
            <input
              value={organizerLineUserId}
              onChange={(e) => setOrganizerLineUserId(e.target.value)}
              placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
            <button
              disabled={saving}
              onClick={() => save({ organizerLineUserId: organizerLineUserId || undefined })}
              className="w-full rounded-lg bg-[#06C755] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#05a847] disabled:opacity-50 sm:w-auto"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
      />
    </div>
  );
}

function CopyBox({ value }: { value: string }) {
  return (
    <div className="rounded-lg bg-gray-100 px-3 py-2">
      <div className="break-all font-mono text-xs text-gray-800 sm:text-sm">{value}</div>
      <button type="button" onClick={() => navigator.clipboard.writeText(value)} className="mt-2 text-xs font-medium text-[#06C755] hover:underline">
        コピー
      </button>
    </div>
  );
}

function StepCard({ step, currentStep, title, children }: {
  step: Step;
  currentStep: Step;
  title: string;
  children: React.ReactNode;
}) {
  const done = currentStep > step;
  const active = currentStep === step;

  return (
    <section className={`rounded-xl border bg-white p-4 transition-all md:p-5 ${active ? 'border-[#06C755]/50 shadow-sm' : 'border-gray-200 opacity-70'}`}>
      <div className="mb-3 flex items-center gap-3">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-green-500 text-white' : active ? 'bg-[#06C755] text-white' : 'bg-gray-200 text-gray-500'}`}>
          {done ? '済' : step}
        </span>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      {active && children}
    </section>
  );
}
