'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, Tenant } from '@/lib/api';

type Plan = 'free' | 'standard' | 'pro';

const PLAN_INFO: Record<Plan, { name: string; price: string; color: string; badgeColor: string }> = {
  free: { name: 'フリー', price: '¥0', color: 'border-gray-200 bg-gray-50', badgeColor: 'bg-gray-100 text-gray-600' },
  standard: { name: 'スタンダード', price: '¥2,980', color: 'border-[#06C755] bg-green-50/40', badgeColor: 'bg-[#06C755]/10 text-[#06C755]' },
  pro: { name: 'プロ', price: '¥6,980', color: 'border-gray-800 bg-gray-50', badgeColor: 'bg-gray-900 text-white' },
};

const tabs = [
  { label: '団体情報', href: '/admin/settings' },
  { label: 'LINE連携', href: '/admin/settings/line' },
  { label: 'Stripe決済', href: '/admin/settings/stripe' },
  { label: 'プラン', href: '/admin/settings/plan', active: true },
];

const FEATURES: { label: string; free: string; standard: string; pro: string }[] = [
  { label: 'イベント作成', free: '月2件', standard: '無制限', pro: '無制限' },
  { label: '参加者上限', free: '50人', standard: '300人', pro: '無制限' },
  { label: 'リマインド通知', free: '-', standard: '利用可', pro: '利用可' },
  { label: 'Stripe決済連携', free: '-', standard: '利用可', pro: '利用可' },
  { label: 'CSVエクスポート', free: '-', standard: '利用可', pro: '利用可' },
  { label: '複数管理者', free: '-', standard: '-', pro: '3名まで' },
  { label: '優先サポート', free: '-', standard: '-', pro: '利用可' },
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

function FeatureValue({ value, isCurrent }: { value: string; isCurrent: boolean }) {
  const disabled = value === '-';
  return (
    <span className={`text-sm font-medium ${disabled ? 'text-gray-300' : isCurrent ? 'text-[#06C755]' : 'text-gray-700'}`}>
      {value}
    </span>
  );
}

export default function PlanSettingsPage() {
  return (
    <Suspense fallback={<div className="px-4 py-12 text-center text-sm text-gray-400">読み込み中...</div>}>
      <PlanSettingsPageInner />
    </Suspense>
  );
}

function PlanSettingsPageInner() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<Plan | null>(null);
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === 'true';

  useEffect(() => {
    api.tenant.get().then(setTenant).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleUpgrade(plan: Plan) {
    setUpgrading(plan);
    try {
      const { url } = await api.tenant.billingCheckout(plan as 'standard' | 'pro');
      window.location.href = url;
    } catch {
      alert('エラーが発生しました。しばらくしてからお試しください。');
      setUpgrading(null);
    }
  }

  if (loading) return <div className="px-4 py-12 text-center text-sm text-gray-400">読み込み中...</div>;

  if (!tenant) return null;

  const currentPlan = tenant.plan as Plan;
  const info = PLAN_INFO[currentPlan];

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-5 text-2xl font-bold text-gray-900">設定</h1>
        <SettingsTabs />

        <section className={`mb-6 rounded-xl border-2 p-4 md:p-5 ${info.color}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-1 text-xs text-gray-500">現在のプラン</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${info.badgeColor}`}>{info.name}</span>
                <span className="text-2xl font-bold text-gray-900">{info.price}</span>
                {currentPlan !== 'free' && <span className="text-sm text-gray-400">/ 月</span>}
              </div>
            </div>
            {tenant.planStartedAt && (
              <p className="text-xs text-gray-400">利用開始: {new Date(tenant.planStartedAt).toLocaleDateString('ja-JP')}</p>
            )}
          </div>
        </section>

        <section className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="grid grid-cols-4 border-b border-gray-200 bg-gray-50">
            <div className="p-3 text-xs font-medium text-gray-500">機能</div>
            {(['free', 'standard', 'pro'] as Plan[]).map((plan) => (
              <div key={plan} className={`p-3 text-center ${plan === currentPlan ? 'bg-[#06C755]/5' : ''}`}>
                <p className={`text-xs font-bold ${plan === currentPlan ? 'text-[#06C755]' : 'text-gray-700'}`}>
                  {PLAN_INFO[plan].name}
                </p>
                <p className="text-[11px] text-gray-400">{PLAN_INFO[plan].price}{plan !== 'free' ? '/月' : ''}</p>
              </div>
            ))}
          </div>
          {FEATURES.map((feature, index) => (
            <div key={feature.label} className={`grid grid-cols-4 border-b border-gray-100 last:border-0 ${index % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
              <div className="p-3 text-xs text-gray-600">{feature.label}</div>
              {(['free', 'standard', 'pro'] as Plan[]).map((plan) => (
                <div key={plan} className={`p-3 text-center ${plan === currentPlan ? 'bg-[#06C755]/5' : ''}`}>
                  <FeatureValue value={feature[plan]} isCurrent={plan === currentPlan} />
                </div>
              ))}
            </div>
          ))}
        </section>

        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm font-medium text-green-700">
            プランのアップグレードが完了しました。
          </div>
        )}

        {currentPlan === 'free' && (
          <div className="space-y-3">
            <PlanCta plan="standard" title="スタンダードにアップグレード" description="リマインド、Stripe決済、イベント作成数アップが使えます。" price="¥2,980 / 月" upgrading={upgrading} onUpgrade={handleUpgrade} />
            <PlanCta dark plan="pro" title="プロにアップグレード" description="参加者無制限、複数管理者、優先サポートを使えます。" price="¥6,980 / 月" upgrading={upgrading} onUpgrade={handleUpgrade} />
            <p className="text-center text-xs text-gray-400">決済はStripeで安全に処理されます。いつでもキャンセルできます。</p>
          </div>
        )}

        {currentPlan === 'standard' && (
          <PlanCta dark plan="pro" title="プロにアップグレード" description="参加者無制限、複数管理者、優先サポートを追加できます。" price="¥6,980 / 月" upgrading={upgrading} onUpgrade={handleUpgrade} />
        )}

        {currentPlan === 'pro' && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
            <p className="font-semibold text-gray-800">プロプランをご利用中です</p>
            <p className="mt-1 text-sm text-gray-500">すべての機能をご利用いただけます。</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanCta({
  plan, title, description, price, dark = false, upgrading, onUpgrade,
}: {
  plan: Plan;
  title: string;
  description: string;
  price: string;
  dark?: boolean;
  upgrading: Plan | null;
  onUpgrade: (plan: Plan) => void;
}) {
  const isLoading = upgrading === plan;
  return (
    <section className={`rounded-xl p-5 ${dark ? 'bg-gray-900 text-white' : 'bg-[#06C755] text-white'}`}>
      <p className="mb-1 text-base font-bold">{title}</p>
      <p className={`mb-4 text-sm leading-relaxed ${dark ? 'text-white/60' : 'text-white/85'}`}>{description}</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-2xl font-bold">{price}</span>
        <button
          onClick={() => onUpgrade(plan)}
          disabled={upgrading !== null}
          className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-colors disabled:opacity-60 ${dark ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-white text-[#06C755] hover:bg-gray-50'}`}
        >
          {isLoading ? '処理中...' : 'アップグレード'}
        </button>
      </div>
    </section>
  );
}
