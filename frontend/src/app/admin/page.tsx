'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatDate, API_URL } from '@/lib/api';
import type { Event, Tenant } from '@/lib/api';
import { EventStatusBadge } from '@/components/ui/StatusBadge';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const FREE_EVENT_LIMIT = 2;
const FREE_MEMBER_LIMIT = 50;

type Stats = {
  memberCount: number;
  thisMonthEventCount: number;
  totalReservationCount: number;
  thisMonthReservationCount: number;
  totalRevenue: number;
};
type GrowthPoint = { label: string; members: number; reservations: number };
type Activity = { type: string; text: string; at: string };

const activityLabels: Record<string, string> = {
  reserve: '予約',
  waitlist: '待ち',
  cancel: '取消',
  member: '参加者',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(value / max, 1);
  const color = pct >= 1 ? 'bg-red-500' : pct >= 0.7 ? 'bg-amber-400' : 'bg-[#06C755]';
  return (
    <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${highlight ? 'border-[#06C755]/20 bg-[#06C755]/5' : 'border-gray-200 bg-white'}`}>
      <p className="mb-1 text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold leading-none ${highlight ? 'text-[#06C755]' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs leading-relaxed text-gray-400">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-gray-700">{label}</p>
      {payload.map((item: any) => (
        <p key={item.name} style={{ color: item.color }}>{item.name}: {item.value}</p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    Promise.all([
      api.events.list(),
      api.tenant.stats(),
      api.tenant.get(),
      api.tenant.growth(),
      api.tenant.activity(),
    ])
      .then(([eventList, statData, tenantData, growthData, activityData]) => {
        setEvents(eventList);
        setStats(statData);
        setTenant(tenantData);
        setGrowth(growthData);
        setActivities(activityData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = events
    .filter((event) => new Date(event.heldAt) > now && event.status !== 'closed')
    .slice(0, 5);

  const isFree = tenant?.plan === 'free';
  const eventPct = stats ? stats.thisMonthEventCount / FREE_EVENT_LIMIT : 0;
  const memberPct = stats ? stats.memberCount / FREE_MEMBER_LIMIT : 0;
  const atLimit = isFree && (eventPct >= 1 || memberPct >= 1);
  const nearLimit = isFree && !atLimit && (eventPct >= 0.7 || memberPct >= 0.7);
  const prevMembers = growth.length >= 2 ? growth[growth.length - 2].members : 0;
  const curMembers = growth.length >= 1 ? growth[growth.length - 1].members : 0;
  const memberDiff = curMembers - prevMembers;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-1 text-sm text-gray-500">イベント、予約、参加者の状況を確認できます。</p>
          {tenant?.code && (
            <p className="mt-1 text-xs text-gray-400">団体ID: <span className="font-mono font-semibold text-gray-600 select-all">{tenant.code}</span></p>
          )}
        </div>
        <Link
          href="/admin/events/new"
          className="w-full rounded-lg bg-[#06C755] px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-[#05a847] sm:w-auto"
        >
          イベントを作成
        </Link>
      </div>

      {isFree && stats && (
        <section className={`rounded-xl border p-4 ${atLimit ? 'border-red-200 bg-red-50' : nearLimit ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">フリープラン</span>
              {atLimit && <span className="text-xs font-semibold text-red-600">上限に達しています</span>}
              {nearLimit && <span className="text-xs font-semibold text-amber-600">上限に近づいています</span>}
            </div>
            <button onClick={() => setShowUpgradeModal(true)} className="w-fit text-xs font-semibold text-[#06C755] hover:underline">
              アップグレード
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">今月のイベント</span>
                <span className={`font-bold ${eventPct >= 1 ? 'text-red-600' : eventPct >= 0.7 ? 'text-amber-500' : 'text-gray-700'}`}>
                  {stats.thisMonthEventCount} / {FREE_EVENT_LIMIT}件
                </span>
              </div>
              <ProgressBar value={stats.thisMonthEventCount} max={FREE_EVENT_LIMIT} />
            </div>
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">参加者数</span>
                <span className={`font-bold ${memberPct >= 1 ? 'text-red-600' : memberPct >= 0.7 ? 'text-amber-500' : 'text-gray-700'}`}>
                  {stats.memberCount} / {FREE_MEMBER_LIMIT}人
                </span>
              </div>
              <ProgressBar value={stats.memberCount} max={FREE_MEMBER_LIMIT} />
            </div>
          </div>
        </section>
      )}

      {stats && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="今月の予約" value={`${stats.thisMonthReservationCount}件`} sub={`累計 ${stats.totalReservationCount}件`} />
          <StatCard label="累計参加者" value={`${stats.memberCount}人`} sub={memberDiff > 0 ? `前月比 +${memberDiff}人` : undefined} highlight={memberDiff > 0} />
          <StatCard label="参加費売上" value={`¥${stats.totalRevenue.toLocaleString()}`} sub="予約確定分の合計" />
          <StatCard label="直近イベント" value={`${upcoming.length}件`} sub="開催予定" />
        </section>
      )}

      {growth.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">過去6か月の推移</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06C755" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#06C755" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorReservations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Area type="monotone" dataKey="members" name="新規参加者" stroke="#06C755" strokeWidth={2} fill="url(#colorMembers)" dot={{ fill: '#06C755', r: 3 }} />
              <Area type="monotone" dataKey="reservations" name="予約数" stroke="#3B82F6" strokeWidth={2} fill="url(#colorReservations)" dot={{ fill: '#3B82F6', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">最近の動き</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-10 animate-pulse rounded-xl bg-gray-100" />)}
          </div>
        ) : activities.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">まだアクティビティはありません</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {activities.map((activity, index) => (
              <div key={`${activity.at}-${index}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="mt-0.5 shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-500">
                  {activityLabels[activity.type] ?? '更新'}
                </span>
                <p className="min-w-0 flex-1 text-sm leading-relaxed text-gray-700">{activity.text}</p>
                <span className="mt-0.5 shrink-0 text-[11px] text-gray-400">{timeAgo(activity.at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-800">直近のイベント</h2>
        {loading ? (
          <div className="space-y-3">{[1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}</div>
        ) : upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="mb-4 text-sm text-gray-500">まだ開催予定のイベントがありません。</p>
            <Link href="/admin/events/new" className="text-sm font-medium text-[#06C755] hover:underline">イベントを作成する</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((event) => (
              <article key={event.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {event.iconUrl && (
                    <img
                      src={event.iconUrl.startsWith('/') ? `${API_URL}${event.iconUrl}` : event.iconUrl}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                      alt=""
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <EventStatusBadge status={event.status} />
                      <span className="break-words text-sm font-semibold text-gray-900">{event.title}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-500">{formatDate(event.heldAt)} ・ {event.location}</p>
                    <p className="mt-2 text-xs text-gray-600">
                      {event.reservedCount ?? 0}{event.capacity ? ` / ${event.capacity}` : ''}人
                    </p>
                  </div>
                  <Link href={`/admin/events/${event.id}`} className="shrink-0 text-sm font-medium text-[#06C755] hover:underline">
                    詳細
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isFree && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-gray-700">スタンダードプランで使える機能</h2>
            <button onClick={() => setShowUpgradeModal(true)} className="w-fit text-xs font-semibold text-[#06C755] hover:underline">確認する</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ['リマインド通知', '前日・当日に自動送信'],
              ['イベント作成数アップ', '月2件以上の運用に対応'],
              ['参加者上限アップ', '50人を超える団体向け'],
              ['CSVエクスポート', '名簿や予約一覧を出力'],
            ].map(([label, desc]) => (
              <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-700">{label}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="mt-4 w-full rounded-xl bg-[#06C755] py-3 text-sm font-bold text-white transition-colors hover:bg-[#05a847]"
          >
            プランを確認する
          </button>
        </section>
      )}

      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setShowUpgradeModal(false)}>
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900">スタンダードプランへ</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">イベント運営に必要な機能を制限なく使えます。</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>イベント作成数の上限アップ</li>
              <li>参加者上限アップ</li>
              <li>リマインド通知</li>
              <li>Stripe決済連携</li>
              <li>CSVエクスポート</li>
            </ul>
            <Link
              href="/admin/settings/plan"
              onClick={() => setShowUpgradeModal(false)}
              className="block w-full rounded-xl bg-[#06C755] py-3.5 text-center text-sm font-bold text-white transition-colors hover:bg-[#05a847]"
            >
              プランを見る
            </Link>
            <button onClick={() => setShowUpgradeModal(false)} className="w-full text-xs text-gray-400 hover:text-gray-600">あとで</button>
          </div>
        </div>
      )}
    </div>
  );
}
