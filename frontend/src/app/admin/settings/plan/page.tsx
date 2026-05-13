'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Tenant } from '@/lib/api';

type Plan = 'free' | 'standard' | 'pro';

const PLAN_INFO: Record<Plan, { name: string; price: string; color: string; badgeColor: string }> = {
  free:     { name: 'フリー',       price: '¥0',     color: 'border-gray-200 bg-gray-50',          badgeColor: 'bg-gray-100 text-gray-600' },
  standard: { name: 'スタンダード', price: '¥2,980', color: 'border-[#06C755] bg-green-50/40',     badgeColor: 'bg-[#06C755]/10 text-[#06C755]' },
  pro:      { name: 'プロ',         price: '¥6,980', color: 'border-gray-800 bg-gray-50',          badgeColor: 'bg-gray-900 text-white' },
};

const FEATURES: { label: string; free: string; standard: string; pro: string }[] = [
  { label: 'イベント作成',         free: '2件 / 月',  standard: '無制限',    pro: '無制限' },
  { label: 'メンバー上限',         free: '50人',       standard: '300人',     pro: '無制限' },
  { label: 'リマインド通知',       free: '✗',          standard: '✅',        pro: '✅' },
  { label: 'Stripe決済連携',       free: '✗',          standard: '✅',        pro: '✅' },
  { label: 'CSVエクスポート',      free: '✗',          standard: '✅',        pro: '✅' },
  { label: '複数管理者',           free: '✗',          standard: '✗',         pro: '3名まで' },
  { label: '優先サポート',         free: '✗',          standard: '✗',         pro: '✅' },
];

function FeatureValue({ value, isCurrent }: { value: string; isCurrent: boolean }) {
  const isOk = value === '✅' || (!value.includes('✗') && value !== '');
  const isNg = value === '✗';
  return (
    <span className={`text-sm font-medium ${isNg ? 'text-gray-300' : isCurrent ? 'text-[#06C755]' : 'text-gray-700'}`}>
      {value}
    </span>
  );
}

export default function PlanSettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.tenant.get().then(setTenant).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-400">読み込み中...</div>;
  if (!tenant) return null;

  const currentPlan = tenant.plan as Plan;
  const info = PLAN_INFO[currentPlan];

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

      {/* タブ */}
      <div className="flex gap-0 mb-8 border-b border-gray-200 overflow-x-auto">
        {[
          { label: '団体情報', href: '/admin/settings' },
          { label: 'LINE連携', href: '/admin/settings/line' },
          { label: 'Stripe決済', href: '/admin/settings/stripe' },
          { label: 'プラン', href: '/admin/settings/plan', active: true },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab.active
                ? 'border-[#06C755] text-[#06C755]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* 現在のプラン */}
      <div className={`rounded-2xl border-2 p-5 mb-6 ${info.color}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">現在のプラン</p>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${info.badgeColor}`}>
                {info.name}
              </span>
              <span className="text-2xl font-bold text-gray-900">{info.price}</span>
              {currentPlan !== 'free' && <span className="text-sm text-gray-400">/ 月</span>}
            </div>
          </div>
          {currentPlan !== 'free' && (
            <div className="text-right">
              <p className="text-xs text-gray-400">次回請求日</p>
              <p className="text-sm font-medium text-gray-600">—</p>
            </div>
          )}
        </div>
        {tenant.planStartedAt && (
          <p className="text-xs text-gray-400 mt-2">
            利用開始：{new Date(tenant.planStartedAt).toLocaleDateString('ja-JP')}
          </p>
        )}
      </div>

      {/* プラン比較テーブル */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200">
          <div className="p-3 text-xs font-medium text-gray-500">機能</div>
          {(['free', 'standard', 'pro'] as Plan[]).map((p) => (
            <div key={p} className={`p-3 text-center ${p === currentPlan ? 'bg-[#06C755]/5' : ''}`}>
              <p className={`text-xs font-bold ${p === currentPlan ? 'text-[#06C755]' : 'text-gray-700'}`}>
                {PLAN_INFO[p].name}
                {p === currentPlan && <span className="ml-1 text-[9px]">← 現在</span>}
              </p>
              <p className="text-[11px] text-gray-400">{PLAN_INFO[p].price}{p !== 'free' ? '/月' : ''}</p>
            </div>
          ))}
        </div>
        {FEATURES.map((f, i) => (
          <div key={f.label} className={`grid grid-cols-4 border-b border-gray-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
            <div className="p-3 text-xs text-gray-600">{f.label}</div>
            {(['free', 'standard', 'pro'] as Plan[]).map((p) => (
              <div key={p} className={`p-3 text-center ${p === currentPlan ? 'bg-[#06C755]/5' : ''}`}>
                <FeatureValue value={f[p]} isCurrent={p === currentPlan} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* アップグレード CTA */}
      {currentPlan === 'free' && (
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-[#06C755] to-[#047a35] rounded-2xl p-5 text-white">
            <p className="font-bold text-base mb-1">スタンダードにアップグレード</p>
            <p className="text-white/80 text-sm mb-4">リマインド・Stripe決済・無制限イベントが使えます</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">¥2,980<span className="text-base font-normal opacity-80"> / 月</span></span>
              <button className="bg-white text-[#06C755] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                アップグレード →
              </button>
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-5 text-white">
            <p className="font-bold text-base mb-1">プロにアップグレード</p>
            <p className="text-white/60 text-sm mb-4">メンバー無制限・複数管理者・優先サポート</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">¥6,980<span className="text-base font-normal opacity-60"> / 月</span></span>
              <button className="bg-white text-gray-900 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
                アップグレード →
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center">
            ※ 決済はStripeで安全に処理されます。いつでもキャンセル可能。
          </p>
        </div>
      )}

      {currentPlan === 'standard' && (
        <div className="bg-gray-900 rounded-2xl p-5 text-white">
          <p className="font-bold text-base mb-1">プロにアップグレード</p>
          <p className="text-white/60 text-sm mb-4">メンバー無制限・複数管理者・優先サポートが追加されます</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">¥6,980<span className="text-base font-normal opacity-60"> / 月</span></span>
            <button className="bg-white text-gray-900 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
              アップグレード →
            </button>
          </div>
        </div>
      )}

      {currentPlan === 'pro' && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-semibold text-gray-800">プロプランをご利用中です</p>
          <p className="text-sm text-gray-500 mt-1">すべての機能をご利用いただけます</p>
        </div>
      )}
    </div>
  );
}
