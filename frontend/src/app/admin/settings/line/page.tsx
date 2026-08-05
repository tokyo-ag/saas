'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Tenant, TenantInput } from '@/lib/api';
import { DIRECT_API_URL } from '@/lib/client-api-base';
import { SITE_URL } from '@/lib/config';
import { SaveToast } from '@/components/ui/SaveToast';

const BASE = `${DIRECT_API_URL}/api`;

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
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<Pick<TenantInput, 'lineChannelId' | 'lineChannelSecret' | 'lineChannelAccessToken'>>({
    lineChannelId: '',
    lineChannelSecret: '',
    lineChannelAccessToken: '',
  });
  const [organizerLineUserId, setOrganizerLineUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [editUnlocked, setEditUnlocked] = useState(false);
  const [reauthToken, setReauthToken] = useState('');
  const [reauthEmail, setReauthEmail] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthing, setReauthing] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([api.tenant.get(), api.auth.getMe().catch(() => null)]).then(([tenantData, me]) => {
      setTenant(tenantData);
      setHasPassword(me?.hasPassword ?? null);
      setAccountEmail(me?.email ?? '');
      setReauthEmail(me?.email ?? '');
      setForm({
        lineChannelId: tenantData.lineChannelId ?? '',
        lineChannelSecret: tenantData.lineChannelSecret ?? '',
        lineChannelAccessToken: '',
      });
      setOrganizerLineUserId(tenantData.organizerLineUserId ?? '');
      if (tenantData.lineConfigured) {
        setStep(4);
      } else if (tenantData.lineBasicConfigured || tenantData.lineChannelId) {
        setStep(3);
      }
    });
  }, []);

  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  async function save(data: Partial<TenantInput>) {
    setSaving(true);
    setError('');
    try {
      const updated = await api.tenant.update(data, editUnlocked ? reauthToken : undefined);
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
  const liffEndpointUrl = SITE_URL;
  const lineBasicConfigured = !!(tenant?.lineBasicConfigured || (tenant?.lineChannelId && tenant?.lineChannelSecretConfigured));
  const lineCredentialsLocked = !!tenant?.lineConfigured && !editUnlocked;
  const requiresChannelSecret = !lineBasicConfigured || editUnlocked;

  async function unlockLineSettings(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setReauthing(true);
    try {
      const result = await api.auth.reconfirm(reauthEmail, reauthPassword);
      setReauthToken(result.reauthToken);
      setEditUnlocked(true);
      setReauthPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReauthing(false);
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
            <p className="mb-1 text-base font-semibold text-amber-800">公式LINE API設定はPROプランの機能です</p>
            <p className="mb-4 text-sm text-amber-700">LINEチャネルの連携・LIFF設定にはPROプランへのアップグレードが必要です。</p>
            <Link href="/admin/settings/plan" className="inline-block rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-700">
              PROプランを見る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-5 text-2xl font-bold text-gray-900">設定</h1>
        <SettingsTabs />

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <SaveToast show={saved} />

        <div className="space-y-4">
          {tenant.lineConfigured && !editUnlocked && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 md:p-5">
              <h2 className="mb-1 text-sm font-semibold text-gray-900">LINE設定は保護されています</h2>
              {hasPassword === false ? (
                <p className="text-xs leading-relaxed text-gray-600">
                  LINE設定を編集するには、メールアドレスとパスワードの登録が必要です。
                  <Link href="/admin/settings/account" className="ml-1 font-medium text-[#06C755] hover:underline">
                    アカウント設定で登録する
                  </Link>
                </p>
              ) : (
                <>
                  <p className="mb-4 text-xs leading-relaxed text-gray-600">
                    公式LINEの設定を変更するには、いまログイン中の管理者パスワードを入力してください。
                  </p>
                  <form onSubmit={unlockLineSettings} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <Field label="ログイン中のメール" type="email" value={reauthEmail} onChange={setReauthEmail} placeholder="admin@example.com" disabled={!!accountEmail} />
                    <Field label="パスワード" type="password" value={reauthPassword} onChange={setReauthPassword} placeholder="このメールのパスワード" />
                    <button
                      type="submit"
                      disabled={reauthing || !reauthEmail || !reauthPassword}
                      className="h-10 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {reauthing ? '確認中...' : '編集する'}
                    </button>
                  </form>
                </>
              )}
            </section>
          )}

          <StepCard step={1} currentStep={step} title="LINE公式アカウントを用意する" onOpen={() => setStep(1)}>
            <p className="mb-4 text-sm leading-relaxed text-gray-600">
              まだLINE公式アカウントがない場合は作成してください。作成済みなら次の手順へ進めます。
            </p>
            <button onClick={() => setStep(2)} className="w-full rounded-lg bg-[#06C755] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#05a847] sm:w-auto">
              作成済み・次へ
            </button>
          </StepCard>

          <StepCard step={2} currentStep={step} title="Channel ID / Secretを保存する" forceExpanded={editUnlocked} onOpen={() => setStep(2)}>
            <p className="mb-4 text-sm leading-relaxed text-gray-600">
              先にLINE DevelopersのMessaging APIチャネルから、Channel IDとChannel Secretだけを保存します。Access TokenはWebhookとLIFF endpointの設定後に発行して保存します。
            </p>
            <div className="space-y-3">
              <Field label="Channel ID" value={form.lineChannelId ?? ''} onChange={(value) => set('lineChannelId', value)} placeholder="1234567890" disabled={lineCredentialsLocked} />
              <Field label="Channel Secret" type="password" value={form.lineChannelSecret ?? ''} onChange={(value) => set('lineChannelSecret', value)} placeholder={lineBasicConfigured ? '変更する場合のみ入力' : 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'} disabled={lineCredentialsLocked} />
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setStep(1)} className="w-full rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto">
                戻る
              </button>
              <button
                disabled={saving || lineCredentialsLocked || !form.lineChannelId || (requiresChannelSecret && !form.lineChannelSecret)}
                onClick={async () => {
                  const payload: Partial<TenantInput> = {
                    lineChannelId: form.lineChannelId,
                  };
                  if (form.lineChannelSecret) payload.lineChannelSecret = form.lineChannelSecret;
                  const ok = await save(payload);
                  if (ok) {
                    setEditUnlocked(false);
                    setReauthToken('');
                    setForm((prev) => ({ ...prev, lineChannelSecret: '' }));
                    setStep(3);
                  }
                }}
                className="w-full rounded-lg bg-[#06C755] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#05a847] disabled:opacity-50 sm:w-auto"
              >
                {saving ? '保存中...' : '保存して次へ'}
              </button>
            </div>
          </StepCard>

          <StepCard step={3} currentStep={step} title="Webhook URLとLIFF Endpoint URLを設定する" onOpen={() => setStep(3)}>
            <p className="mb-3 text-sm leading-relaxed text-gray-600">
              下の2つは設定する場所が違います。Webhook URLはMessaging APIチャネル、LIFF Endpoint URLはLIFFアプリの設定画面に入れます。
            </p>
            <div className="space-y-3">
              <SetupGuide
                title="Webhook URL"
                place="LINE Developers > Provider > Messaging APIチャネル > Messaging APIタブ > Webhook settings"
                detail="Webhook URLに貼り付けて、Use webhookをONにしてからVerifyを押します。"
              >
                <CopyBox value={webhookUrl} />
              </SetupGuide>
              <SetupGuide
                title="LIFF Endpoint URL"
                place="LINE Developers > Provider > LINE Loginチャネル > LIFFタブ > LIFFアプリ > Endpoint URL"
                detail="LIFFアプリを追加または編集して、Endpoint URLに貼り付けます。予約画面をLINE内で開くための入口です。"
              >
                <CopyBox value={liffEndpointUrl} />
              </SetupGuide>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setStep(2)} className="w-full rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto">
                戻る
              </button>
              <button onClick={() => setStep(4)} className="w-full rounded-lg bg-[#06C755] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#05a847] sm:w-auto">
                設定できたので次へ
              </button>
            </div>
          </StepCard>

          <StepCard step={4} currentStep={step} title="Channel Access Tokenを保存する" forceExpanded={editUnlocked} onOpen={() => setStep(4)}>
            <p className="mb-4 text-sm leading-relaxed text-gray-600">
              LINE DevelopersのMessaging APIチャネルで発行した長期のChannel Access Tokenを保存します。保存後に公式アカウント情報を同期します。
            </p>
            <SetupGuide
              title="Channel Access Tokenの場所"
              place="LINE Developers > Provider > Messaging APIチャネル > Messaging APIタブ > Channel access token"
              detail="まだ発行していない場合はIssueを押して、表示された長い文字列を下に貼り付けます。"
            />
            <Field label="Channel Access Token" type="password" value={form.lineChannelAccessToken ?? ''} onChange={(value) => set('lineChannelAccessToken', value)} placeholder={tenant.lineConfigured ? '変更する場合のみ入力' : '長い文字列'} disabled={lineCredentialsLocked} />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setStep(3)} className="w-full rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto">
                戻る
              </button>
              <button
                disabled={saving || lineCredentialsLocked || !form.lineChannelAccessToken}
                onClick={async () => {
                  const ok = await save({ lineChannelAccessToken: form.lineChannelAccessToken });
                  if (ok) {
                    try {
                      const updated = await api.tenant.syncLineProfile();
                      setTenant(updated);
                      setEditUnlocked(false);
                      setReauthToken('');
                      setForm((prev) => ({ ...prev, lineChannelAccessToken: '' }));
                      setStep(4);
                    } catch (err: any) {
                      setError(err.message);
                    }
                  }
                }}
                className="w-full rounded-lg bg-[#06C755] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#05a847] disabled:opacity-50 sm:w-auto"
              >
                {saving ? '保存中...' : '保存して同期'}
              </button>
            </div>
            {tenant.lineConfigured && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                LINE連携は完了しています。友だち追加後のWebhook受信とLIFF予約導線を確認してください。
              </div>
            )}
          </StepCard>

          <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
            <h2 className="mb-1 text-sm font-semibold text-gray-900">キャンセル通知の受け取り先（任意）</h2>
            <p className="mb-3 text-sm font-medium text-gray-900">
              ここは空欄でOKです。
            </p>
            <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-xs leading-relaxed text-gray-600">
              参加者がキャンセルした時に、主催者の個人LINEへ通知したい場合だけ入力します。予約受付や参加者へのLINE通知には関係ありません。
              <br />
              入れる値は、主催者本人の <span className="font-mono text-gray-800">U...</span> で始まるLINEユーザーIDです。分からない場合は空欄のまま進めてください。
            </div>
            <input
              value={organizerLineUserId}
              onChange={(e) => setOrganizerLineUserId(e.target.value)}
              placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              disabled={lineCredentialsLocked}
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
            <button
              disabled={saving || lineCredentialsLocked}
              onClick={async () => {
                const trimmed = organizerLineUserId.trim();
                if (trimmed && !/^U[0-9a-f]{32}$/i.test(trimmed)) {
                  setError('LINEユーザーIDの形式が正しくありません。U から始まる33文字のIDを入力するか、空欄にしてください。');
                  return;
                }
                const ok = await save({ organizerLineUserId: trimmed });
                if (ok) {
                  setEditUnlocked(false);
                  setReauthToken('');
                }
              }}
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

function Field({ label, value, onChange, placeholder, type = 'text', disabled = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
      />
    </div>
  );
}

function SetupGuide({ title, place, detail, children }: {
  title: string;
  place: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
      <div className="mb-1 text-sm font-semibold text-gray-900">{title}</div>
      <div className="mb-1 text-xs font-medium text-gray-500">設定場所</div>
      <div className="mb-2 text-sm leading-relaxed text-gray-800">{place}</div>
      <p className="mb-3 text-xs leading-relaxed text-gray-600">{detail}</p>
      {children}
    </div>
  );
}

function CopyBox({ value, label }: { value: string; label?: string }) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 1800);
    } catch {
      setCopyStatus('failed');
      window.setTimeout(() => setCopyStatus('idle'), 2400);
    }
  }

  return (
    <div className="rounded-lg bg-gray-100 px-3 py-2">
      {label && <div className="mb-1 text-xs font-medium text-gray-500">{label}</div>}
      <div className="break-all font-mono text-xs text-gray-800 sm:text-sm">{value}</div>
      <button type="button" onClick={copy} className="mt-2 text-xs font-medium text-[#06C755] hover:underline">
        {copyStatus === 'copied' ? 'コピーしました' : copyStatus === 'failed' ? 'コピーできませんでした' : 'コピー'}
      </button>
      <span className="sr-only" aria-live="polite">
        {copyStatus === 'copied' ? `${label ?? 'URL'}をコピーしました` : copyStatus === 'failed' ? `${label ?? 'URL'}をコピーできませんでした` : ''}
      </span>
    </div>
  );
}

function StepCard({ step, currentStep, title, children, forceExpanded = false, onOpen }: {
  step: Step;
  currentStep: Step;
  title: string;
  children: React.ReactNode;
  forceExpanded?: boolean;
  onOpen?: () => void;
}) {
  const done = currentStep > step;
  const active = currentStep === step || forceExpanded;
  const canReopen = !active && done && !!onOpen;

  return (
    <section className={`rounded-xl border bg-white p-4 transition-all md:p-5 ${active ? 'border-[#06C755]/50 shadow-sm' : 'border-gray-200 opacity-70'}`}>
      <button
        type="button"
        onClick={canReopen ? onOpen : undefined}
        disabled={!canReopen}
        className={`mb-3 flex w-full items-center gap-3 text-left ${canReopen ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-green-500 text-white' : active ? 'bg-[#06C755] text-white' : 'bg-gray-200 text-gray-500'}`}>
          {done ? '済' : step}
        </span>
        <h2 className="min-w-0 flex-1 text-sm font-semibold text-gray-900">{title}</h2>
        {canReopen && <span className="shrink-0 text-xs font-medium text-[#06C755]">戻る</span>}
      </button>
      {active && children}
    </section>
  );
}
