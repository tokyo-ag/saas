'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, formatDate, API_URL } from '@/lib/api';
import { useCalendarMonth } from '@/lib/useCalendarMonth';
import { EventStatusBadge } from '@/components/ui/StatusBadge';
import type { Event } from '@/lib/api';


type Tab = 'upcoming' | 'past' | 'draft';
type ViewMode = 'card' | 'calendar';

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
                        <button
                          onClick={(e) => { e.stopPropagation(); setPopoverId(popoverId === ev.id ? null : ev.id); }}
                          className="block w-full truncate rounded px-1 py-0.5 text-[10px] font-medium bg-[#06C755]/10 text-[#06C755] hover:bg-[#06C755]/20 text-left"
                          title={ev.title}
                        >
                          {ev.title}
                        </button>
                        {popoverId === ev.id && (
                          <div
                            className={`absolute z-50 mt-0.5 w-24 rounded-lg border border-gray-200 bg-white shadow-lg py-1 ${col >= 5 ? 'right-0' : 'left-0'}`}
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
  const [savedViewMode, setSavedViewMode] = useState<ViewMode>('card');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [showPreview, setShowPreview] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');

  function load() {
    setLoading(true);
    api.events.list().then(setEvents).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.tenant.get().then((t) => {
      const v = t.liffEventView === 'calendar' ? 'calendar' : 'card';
      setViewMode(v);
      setSavedViewMode(v);
      setTenantId(t.id);
    }).catch(() => {});
  }, []);

  async function handleSaveViewMode() {
    setSaving(true);
    try {
      await api.tenant.update({ liffEventView: viewMode });
      setSavedViewMode(viewMode);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  const isDirty = viewMode !== savedViewMode;

  const now = new Date();
  const filtered = events.filter((event) => {
    if (tab === 'upcoming') return new Date(event.heldAt) > now && event.status !== 'draft';
    if (tab === 'past') return new Date(event.heldAt) <= now || event.status === 'closed';
    return event.status === 'draft';
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
        notifyOnReserveApp: ev.notifyOnReserveApp ?? false,
        remindEnabled: false,
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
    {showPreview && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowPreview(false)}>
        <div className="relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
          <div className="mb-3 flex items-center gap-3">
            <span className="text-white text-sm font-medium">ユーザー画面プレビュー</span>
            <button onClick={() => setShowPreview(false)} className="text-white/70 hover:text-white text-xs border border-white/30 rounded-full px-3 py-1">
              閉じる
            </button>
          </div>
          {/* スマホフレーム */}
          <div className="relative w-[375px] h-[720px] rounded-[44px] bg-gray-900 shadow-2xl border-[10px] border-gray-900"
            style={{ boxShadow: '0 0 0 2px #555, 0 30px 80px rgba(0,0,0,0.8)' }}>
            {/* ノッチ */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-2xl z-10" />
            <div className="w-full h-full rounded-[34px] overflow-hidden bg-white">
              <iframe
                key={showPreview ? 'open' : 'closed'}
                src={tenantId ? `/liff/${tenantId}` : ''}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      </div>
    )}
    <div className="px-4 py-4 md:px-6 md:py-6 max-w-5xl">
      <div className="mb-5">
        {/* 1行目: タイトル + 新規作成 */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">イベント管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">イベントの作成、編集、予約状況を確認できます。</p>
          </div>
          <Link href="/admin/events/new" className="shrink-0 rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white hover:bg-[#05a847]">
            新規作成
          </Link>
        </div>
        {/* 2行目: 表示設定 + プレビュー */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 py-1.5">
            <span className="text-xs text-gray-400 mr-0.5">ユーザー画面</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              <button
                onClick={() => setViewMode('card')}
                title="カード表示"
                className={`p-1.5 transition-colors ${viewMode === 'card' ? 'bg-[#06C755] text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                title="カレンダー表示"
                className={`p-1.5 transition-colors ${viewMode === 'calendar' ? 'bg-[#06C755] text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <button
              onClick={handleSaveViewMode}
              disabled={saving || (!isDirty && saveStatus === 'idle')}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                saveStatus === 'saved'
                  ? 'bg-gray-100 text-gray-400'
                  : isDirty
                  ? 'bg-[#06C755] text-white hover:bg-[#05a847]'
                  : 'bg-gray-100 text-gray-400'
              } disabled:cursor-default`}
            >
              {saving ? '保存中...' : saveStatus === 'saved' ? '保存済み ✓' : '反映'}
            </button>
          </div>
          <button
            onClick={() => setShowPreview(true)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            プレビュー
          </button>
        </div>
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
                      <img src={`${API_URL}${event.iconUrl}`} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
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
    </>
  );
}
