'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatDate } from '@/lib/api';
import type { Event, Tenant } from '@/lib/api';
import { EventStatusBadge } from '@/components/ui/StatusBadge';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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

const ACTIVITY_ICONS: Record<string, string> = {
  reserve: '📅',
  waitlist: '⏳',
  cancel: '❌',
  member: '👤',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(value / max, 1);
  const color = pct >= 1 ? 'bg-red-500' : pct >= 0.7 ? 'bg-amber-400' : 'bg-[#06C755]';
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border shadow-sm ${highlight ? 'bg-[#06C755]/5 border-[#06C755]/20' : 'bg-white border-gray-200'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold leading-none ${highlight ? 'text-[#06C755]' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const LOCKED_FEATURES = [
  { icon: '🔔', label: 'リマインド通知', desc: '前日・当日に自動送信' },
  { icon: '📅', label: '無制限イベント', desc: '月2件の制限なし' },
  { icon: '👥', label: '参加者無制限', desc: '50人超のコミュニティ' },
  { icon: '📊', label: '詳細分析', desc: '参加率・収益レポート' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
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
    ]).then(([evts, s, t, g, a]) => {
      setEvents(evts);
      setStats(s);
      setTenant(t);
      setGrowth(g);
      setActivities(a);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = events
    .filter((e) => new Date(e.heldAt) > now && e.status !== 'closed')
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
    <div className="p-4 md:p-6 max-w-4xl space-y-6">

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <Link href="/admin/events/new"
          className="bg-[#06C755] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#05a847] transition-colors">
          ＋ イベントを作成
        </Link>
      </div>

      {/* フリープラン使用量バー */}
      {isFree && stats && (
        <div className={`rounded-2xl border p-4 ${atLimit ? 'bg-red-50 border-red-200' : nearLimit ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">フリープラン</span>
              {atLimit && <span className="text-xs font-semibold text-red-600">上限に達しました</span>}
              {nearLimit && <span className="text-xs font-semibold text-amber-600">上限に近づいています</span>}
            </div>
            <button onClick={() => setShowUpgradeModal(true)} className="text-xs font-semibold text-[#06C755] hover:underline">
              アップグレード →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
                <span className="text-gray-600">メンバー数</span>
                <span className={`font-bold ${memberPct >= 1 ? 'text-red-600' : memberPct >= 0.7 ? 'text-amber-500' : 'text-gray-700'}`}>
                  {stats.memberCount} / {FREE_MEMBER_LIMIT}人
                </span>
              </div>
              <ProgressBar value={stats.memberCount} max={FREE_MEMBER_LIMIT} />
            </div>
          </div>
        </div>
      )}

      {/* ── ① 数字 ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="今月の予約数" value={`${stats.thisMonthReservationCount}件`} sub={`累計 ${stats.totalReservationCount}件`} />
          <StatCard
            label="累計参加者数"
            value={`${stats.memberCount}人`}
            sub={memberDiff > 0 ? `先月比 +${memberDiff}人 📈` : undefined}
            highlight={memberDiff > 0}
          />
          <StatCard label="処理した参加費" value={`¥${stats.totalRevenue.toLocaleString()}`} sub="予約確定分の合計" />
          <StatCard label="直近のイベント" value={`${upcoming.length}件`} sub="開催予定" />
        </div>
      )}

      {/* ── ② グラフ ── */}
      {growth.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">📈 過去6ヶ月の推移</p>
          <ResponsiveContainer width="100%" height={200}>
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
              <Area type="monotone" dataKey="members" name="新規メンバー" stroke="#06C755" strokeWidth={2} fill="url(#colorMembers)" dot={{ fill: '#06C755', r: 3 }} />
              <Area type="monotone" dataKey="reservations" name="予約数" stroke="#3B82F6" strokeWidth={2} fill="url(#colorReservations)" dot={{ fill: '#3B82F6', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── ③ アクティビティフィード ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">🔔 アクティビティ</p>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">まだアクティビティはありません</p>
        ) : (
          <div className="space-y-0 divide-y divide-gray-50">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="text-base leading-none mt-0.5 shrink-0">{ACTIVITY_ICONS[a.type] ?? '📌'}</span>
                <p className="text-sm text-gray-700 flex-1 leading-snug">{a.text}</p>
                <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">{timeAgo(a.at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 直近のイベント */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">直近のイベント</h2>
        {loading ? (
          <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : upcoming.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-dashed border-gray-300 text-center">
            <p className="text-gray-500 mb-4">まだイベントがありません。</p>
            <Link href="/admin/events/new" className="text-[#06C755] hover:underline text-sm">イベントを作成する →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((event) => (
              <div key={event.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
                {event.iconUrl && (
                  <img src={event.iconUrl.startsWith('/') ? `${API_URL}${event.iconUrl}` : event.iconUrl}
                    className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <EventStatusBadge status={event.status} />
                    <span className="font-medium text-gray-900 text-sm truncate">{event.title}</span>
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(event.heldAt)} · {event.location}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-gray-600 font-medium">
                    {event.reservedCount ?? 0}{event.capacity ? ` / ${event.capacity}` : ''}人
                  </span>
                  <Link href={`/admin/events/${event.id}`} className="text-[#06C755] text-sm hover:underline">詳細 →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* フリープラン：ロック機能 */}
      {isFree && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">🔒 スタンダードプランで使える機能</p>
            <button onClick={() => setShowUpgradeModal(true)} className="text-xs text-[#06C755] font-semibold hover:underline">解放する →</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LOCKED_FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-base leading-none mt-0.5">{f.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700">{f.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{f.desc}</p>
                </div>
                <span className="text-gray-300 text-xs shrink-0">🔒</span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowUpgradeModal(true)}
            className="mt-4 w-full bg-gradient-to-r from-[#06C755] to-[#047a35] text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
            スタンダードプランにアップグレード
          </button>
        </div>
      )}

      {/* アップグレードモーダル */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
          onClick={() => setShowUpgradeModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-4xl mb-2">🚀</div>
              <h2 className="text-lg font-bold text-gray-900">スタンダードプランへ</h2>
              <p className="text-sm text-gray-500 mt-1">すべての機能を制限なく使えます</p>
            </div>
            <ul className="space-y-2">
              {['✅ イベント作成：無制限', '✅ 参加者：無制限', '✅ リマインド通知（LINE・アプリ内）', '✅ Stripe決済連携', '✅ CSVエクスポート'].map((item) => (
                <li key={item} className="text-sm text-gray-700">{item}</li>
              ))}
            </ul>
            <Link href="/admin/settings/plan" onClick={() => setShowUpgradeModal(false)}
              className="block w-full bg-gradient-to-r from-[#06C755] to-[#047a35] text-white py-3.5 rounded-xl text-sm font-bold text-center hover:opacity-90 transition-opacity">
              プランを確認する →
            </Link>
            <button onClick={() => setShowUpgradeModal(false)} className="w-full text-xs text-gray-400 hover:text-gray-600">後で</button>
          </div>
        </div>
      )}
    </div>
  );
}
