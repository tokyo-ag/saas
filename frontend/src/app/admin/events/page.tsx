'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, formatDate, API_URL } from '@/lib/api';
import { SITE_URL } from '@/lib/config';
import { useCalendarMonth } from '@/lib/useCalendarMonth';
import { EventStatusBadge } from '@/components/ui/StatusBadge';
import type { Event } from '@/lib/api';


type Tab = 'upcoming' | 'past' | 'draft';
type ViewMode = 'card' | 'calendar' | 'thread';

const tabs: { key: Tab; label: string }[] = [
  { key: 'upcoming', label: '予定' },
  { key: 'past', label: '過去' },
  { key: 'draft', label: '下書き' },
];

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function CalendarView({ events, onDuplicate }: { events: Event[]; onDuplicate: (id: string) => void }) {
  const { year, month, prevMonth, nextMonth, cells, isToday } = useCalendarMonth();
  const [popoverId, setPopoverId] = useState<string | null>(null);

  useEffect(() => {
    if (!popoverId) return;
    const close = () => setPopoverId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [popoverId]);

  const eventsByDate: Record<string, Event[]> = {};
  for (const ev of events) {
    const d = new Date(ev.heldAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate().toString();
      (eventsByDate[key] ??= []).push(ev);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-bold text-gray-900">{year}年 {month + 1}月</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`py-2 text-center text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const evs = day ? (eventsByDate[day.toString()] ?? []) : [];
          const col = i % 7;
          return (
            <div
              key={i}
              className={`min-h-[80px] p-1 border-b border-r border-gray-100 last:border-r-0 ${
                col === 0 ? 'border-l-0' : ''
              } ${!day ? 'bg-gray-50/50' : ''}`}
            >
              {day && (
                <>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1 ${
                    isToday(day)
                      ? 'bg-[#06C755] text-white'
                      : col === 0
                      ? 'text-red-400'
                      : col === 6
                      ? 'text-blue-400'
                      : 'text-gray-600'
                  }`}>
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {evs.slice(0, 3).map((ev) => (
                      <div key={ev.id} className="relative">
                        <div className="flex items-center overflow-hidden rounded bg-[#06C755]/10 text-[#06C755] hover:bg-[#06C755]/20">
                          <Link
                            href={`/admin/events/${ev.id}`}
                            className="min-w-0 flex-1 truncate px-1 py-0.5 text-left text-[10px] font-medium"
                            title={ev.title}
                          >
                            {ev.title}
                          </Link>
                          <button
                            type="button"
                            aria-label="イベント操作メニュー"
                            onClick={(e) => { e.stopPropagation(); setPopoverId(popoverId === ev.id ? null : ev.id); }}
                            className="flex h-5 w-5 shrink-0 items-center justify-center text-[#06C755] hover:bg-[#06C755]/15"
                          >
                            <span className="text-[13px] leading-none">⋯</span>
                          </button>
                        </div>
                        {popoverId === ev.id && (
                          <div
                            className={`absolute z-50 mt-0.5 w-28 rounded-lg border border-gray-200 bg-white shadow-lg py-1 ${col >= 5 ? 'right-0' : 'left-0'}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/admin/events/${ev.id}`} className="block px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">詳細</Link>
                            <Link href={`/admin/events/${ev.id}/edit`} className="block px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">編集</Link>
                            <button
                              onClick={() => { onDuplicate(ev.id); setPopoverId(null); }}
                              className="block w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50"
                            >
                              複製
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {evs.length > 3 && (
                      <span className="block text-[10px] text-gray-400 px-1">+{evs.length - 3}件</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [tenantId, setTenantId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.events.list().then(setEvents).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    api.tenant.get().then((t) => {
      setViewMode(t.liffEventView === 'calendar' || t.liffEventView === 'thread' ? t.liffEventView : 'card');
      setTenantId(t.code ?? t.id);
    }).catch(() => {});
  }, [load]);

  const scheduleUrl = tenantId ? `${SITE_URL}/liff/${tenantId}` : '';

  function copyScheduleUrl() {
    if (!scheduleUrl) return;
    navigator.clipboard.writeText(scheduleUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }


  const now = new Date();
  const filtered = events
    .filter((event) => {
      if (tab === 'upcoming') return new Date(event.heldAt) > now && event.status !== 'draft';
      if (tab === 'past') return new Date(event.heldAt) <= now || event.status === 'closed';
      return event.status === 'draft';
    })
    .sort((a, b) => {
      const diff = new Date(a.heldAt).getTime() - new Date(b.heldAt).getTime();
      return tab === 'past' ? -diff : diff;
    });

  async function handleDuplicate(id: string) {
    try {
      const ev = await api.events.get(id);
      const created = await api.events.create({
        title: ev.title,
        description: ev.description,
        heldAt: ev.heldAt,
        endAt: ev.endAt ?? null,
        location: ev.location,
        locationUrl: ev.locationUrl,
        capacity: ev.capacity ?? null,
        capacityMale: ev.capacityMale ?? null,
        capacityFemale: ev.capacityFemale ?? null,
        status: 'open',
        price: ev.price,
        priceMale: ev.priceMale ?? null,
        priceFemale: ev.priceFemale ?? null,
        paymentRequired: ev.paymentRequired,
        paymentTiming: ev.paymentTiming,
        notifyOnReserve: ev.notifyOnReserve,
        notifyOnReserveApp: true,
        remindEnabled: false,
        remindApp: false,
        imageUrl: ev.imageUrl,
        iconUrl: ev.iconUrl,
        category: ev.category ?? null,
        tags: ev.tags ?? [],
      });
      router.push(`/admin/events/${created.id}/edit`);
    } catch (err: any) {
      alert(err.message ?? '複製に失敗しました');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このイベントを削除しますか？')) return;
    try {
      await api.events.delete(id);
      load();
    } catch {
      alert('削除に失敗しました');
    }
  }

  return (
    <>
    <div className="px-4 py-4 md:px-6 md:py-6 max-w-5xl">

      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">イベント管理</h1>
        </div>
        <Link href="/admin/events/new" className="shrink-0 rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white hover:bg-[#05a847]">
          新規作成
        </Link>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === item.key ? 'border-[#06C755] text-[#06C755]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : viewMode === 'calendar' ? (
        <CalendarView events={filtered} onDuplicate={handleDuplicate} />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">イベントがありません</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => (
            <article key={event.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {event.iconUrl && (
                      <Image src={`${API_URL}${event.iconUrl}`} width={32} height={32} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" unoptimized />
                    )}
                    <EventStatusBadge status={event.status} />
                    <Link href={`/admin/events/${event.id}`} className="font-bold text-gray-900 hover:text-[#06C755] break-words">
                      {event.title}
                    </Link>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{formatDate(event.heldAt)} ・ {event.location}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    予約: {event.reservedCount ?? 0}{event.capacity ? ` / ${event.capacity}人` : '人'}
                    {(event.waitlistedCount ?? 0) > 0 && (
                      <span className="ml-2 text-yellow-600">キャンセル待ち {event.waitlistedCount}人</span>
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0">
                  <Link href={`/admin/events/${event.id}`} className="rounded-lg bg-[#06C755]/10 px-3 py-2 text-center text-xs font-bold text-[#06C755]">詳細</Link>
                  <Link href={`/admin/events/${event.id}/edit`} className="rounded-lg border border-gray-200 px-3 py-2 text-center text-xs font-bold text-gray-600">編集</Link>
                  <button onClick={() => handleDuplicate(event.id)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600">複製</button>
                  <button onClick={() => handleDelete(event.id)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-500">削除</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>

    {scheduleUrl && (
      <div className="px-4 pb-6 md:px-6 max-w-5xl">
        <div className="rounded-xl border border-[#06C755]/30 bg-[#06C755]/5 p-4 md:p-5">
          <p className="mb-1 text-sm font-bold text-[#06C755]">☆ COMIUの運営ポイント</p>
          <p className="mb-3 text-xs font-medium text-gray-700">イベントスケジュールのURL</p>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex-1 truncate rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs font-mono text-gray-600">
              {scheduleUrl}
            </span>
            <button
              type="button"
              onClick={copyScheduleUrl}
              className="shrink-0 rounded-lg bg-[#06C755] px-4 py-2 text-xs font-bold text-white hover:bg-[#05a847]"
            >
              {copied ? 'コピー済み ✓' : 'コピー'}
            </button>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            このURLリンクを共有または公式LINEのチャットに貼ると、団体の活動スケジュールを直接共有できます！<br />
            また外部リンクからのアクセスが多い団体を30日間毎でカウントを行い、COMIU注目の団体！としてCOMIUからPRさせて頂いてます！
          </p>
        </div>
      </div>
    )}
    </>
  );
}
