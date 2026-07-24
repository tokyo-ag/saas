'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, formatDate } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { SITE_URL, buildLiffUrl } from '@/lib/config';
import { EventStatusBadge } from '@/components/ui/StatusBadge';
import type { Event } from '@/lib/api';

const reserveViewOptions = [
  { label: 'カレンダー', value: 'calendar' },
  { label: 'カード', value: 'card' },
  { label: 'スレッド', value: 'thread' },
];

type ReservationActionStyle = 'comiu' | 'line';
type DisplayFields = { location: boolean; price: boolean; capacity: boolean; description: boolean };

const DEFAULT_DISPLAY_FIELDS: DisplayFields = { location: true, price: true, capacity: false, description: true };

const reservationActionOptions: { label: string; value: ReservationActionStyle }[] = [
  { label: 'COMIUで予約する', value: 'comiu' },
  { label: 'LINEで予約する', value: 'line' },
];

const displayFieldOptions: { key: keyof DisplayFields; label: string; icon: string }[] = [
  { key: 'location', label: '場所', icon: '📍' },
  { key: 'price', label: '参加費', icon: '💴' },
  { key: 'capacity', label: '定員・残席', icon: '👥' },
  { key: 'description', label: '説明文', icon: '📄' },
];

function parseFooterSettings(raw?: string | null): Record<string, any> {
  try {
    const parsed = JSON.parse(raw ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function parseDisplayFields(settings: Record<string, any>): DisplayFields {
  const df = settings.displayFields;
  if (!df || typeof df !== 'object') return DEFAULT_DISPLAY_FIELDS;
  return {
    location: df.location !== false,
    price: df.price !== false,
    capacity: df.capacity === true,
    description: df.description !== false,
  };
}

function withFooterSettings(
  page: import('@/lib/api').PublicPage,
  actionStyle: ReservationActionStyle,
  reserveViewStyle: string,
  displayFields: DisplayFields,
  reserveLineUrl: string,
) {
  return {
    ...page,
    reserveViewStyle,
    footerText: JSON.stringify({
      ...parseFooterSettings(page.footerText),
      reserveActionStyle: actionStyle,
      reserveLineUrl: reserveLineUrl.trim(),
      displayFields,
    }),
  };
}

type Tab = 'upcoming' | 'past' | 'draft';

const tabs: { key: Tab; label: string }[] = [
  { key: 'upcoming', label: '予定' },
  { key: 'past', label: '過去' },
  { key: 'draft', label: '下書き' },
];

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('upcoming');

  const [tenantId, setTenantId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [publicPageId, setPublicPageId] = useState<string | null>(null);
  const [publicPageData, setPublicPageData] = useState<import('@/lib/api').PublicPage | null>(null);
  const [reserveViewStyle, setReserveViewStyle] = useState<string>('calendar');
  const [reservationActionStyle, setReservationActionStyle] = useState<ReservationActionStyle>('comiu');
  const [reservationLineUrl, setReservationLineUrl] = useState('');
  const [displayFields, setDisplayFields] = useState<DisplayFields>(DEFAULT_DISPLAY_FIELDS);
  const [activityTickerEnabled, setActivityTickerEnabled] = useState(true);
  const [reservationMessageTemplate, setReservationMessageTemplate] = useState('');
  const [reminderMessageTemplate, setReminderMessageTemplate] = useState('');
  const [savingMessages, setSavingMessages] = useState(false);
  const [messagesSaved, setMessagesSaved] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);
  const [reflected, setReflected] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    api.events.list().then(setEvents).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    api.tenant.get().then((t) => {
      setTenantId(t.code ?? t.id);
      setActivityTickerEnabled(t.activityTickerEnabled !== false);
      setReservationMessageTemplate(t.reservationMessageTemplate ?? '');
      setReminderMessageTemplate(t.reminderMessageTemplate ?? '');
    }).catch(() => {});
    api.publicPages.list().then((pages) => {
      const first = pages[0];
      if (first) {
        setPublicPageId(first.id);
        setPublicPageData(first);
        setReserveViewStyle(first.reserveViewStyle ?? 'calendar');
        const footerSettings = parseFooterSettings(first.footerText);
        setReservationActionStyle(footerSettings.reserveActionStyle === 'line' ? 'line' : 'comiu');
        setReservationLineUrl((footerSettings.reserveLineUrl ?? footerSettings.line ?? '').trim());
        setDisplayFields(parseDisplayFields(footerSettings));
      }
    }).catch(() => {});
  }, [load]);

  async function saveReserveViewStyle(style: string) {
    setReserveViewStyle(style);
    setSavingStyle(true);
    try {
      await api.tenant.update({ liffEventView: style });
      if (publicPageId && publicPageData) {
        const updated = await api.publicPages.update(publicPageId, withFooterSettings(publicPageData, reservationActionStyle, style, displayFields, reservationLineUrl) as any);
        setPublicPageData(updated);
      }
    } catch { /* silent */ } finally {
      setSavingStyle(false);
      setIframeKey((k) => k + 1);
    }
  }

  async function saveReservationActionStyle(style: ReservationActionStyle) {
    setReservationActionStyle(style);
    if (!publicPageId || !publicPageData) return;
    setSavingStyle(true);
    try {
      const updated = await api.publicPages.update(publicPageId, withFooterSettings(publicPageData, style, reserveViewStyle, displayFields, reservationLineUrl) as any);
      setPublicPageData(updated);
      await revalidate(tenantId, updated.slug || publicPageData.slug);
    } catch { /* silent */ } finally {
      setSavingStyle(false);
      setIframeKey((k) => k + 1);
    }
  }

  async function saveMessageTemplates() {
    setSavingMessages(true);
    try {
      await api.tenant.update({
        reservationMessageTemplate,
        reminderMessageTemplate,
      });
      setMessagesSaved(true);
      setTimeout(() => setMessagesSaved(false), 2500);
    } catch { /* silent */ } finally {
      setSavingMessages(false);
    }
  }

  async function toggleActivityTicker() {
    const next = !activityTickerEnabled;
    setActivityTickerEnabled(next);
    try {
      await api.tenant.update({ activityTickerEnabled: next });
    } catch { /* silent */ }
  }

  async function toggleDisplayField(key: keyof DisplayFields) {
    const next = { ...displayFields, [key]: !displayFields[key] };
    setDisplayFields(next);
    if (!publicPageId || !publicPageData) return;
    try {
      const updated = await api.publicPages.update(publicPageId, withFooterSettings(publicPageData, reservationActionStyle, reserveViewStyle, next, reservationLineUrl) as any);
      setPublicPageData(updated);
    } catch { /* silent */ }
  }

  async function revalidate(tenantCode: string, slug: string) {
    if (!tenantCode || !slug) return;
    const token = getToken();
    await fetch('/api/revalidate-public-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ tenantCode, slug }),
    }).catch(() => null);
  }

  async function saveAndReflect() {
    if (!publicPageId || !publicPageData) return;
    setSavingStyle(true);
    try {
      const [, updated] = await Promise.all([
        api.tenant.update({ liffEventView: reserveViewStyle }),
        api.publicPages.update(publicPageId, withFooterSettings(publicPageData, reservationActionStyle, reserveViewStyle, displayFields, reservationLineUrl) as any),
      ]);
      setPublicPageData(updated);
      await revalidate(tenantId, updated.slug || publicPageData.slug);
      setReflected(true);
      setIframeKey((k) => k + 1);
      setTimeout(() => setReflected(false), 2500);
    } catch { /* silent */ } finally {
      setSavingStyle(false);
    }
  }

  const schedulePath = tenantId ? `/liff/${tenantId}` : '';
  const scheduleUrl = schedulePath ? buildLiffUrl(schedulePath) ?? `${SITE_URL}${schedulePath}` : '';

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
        remindEnabled: ev.remindEnabled,
        remindApp: ev.remindApp,
        remindAt: ev.remindAt ?? null,
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

      {/* ヘッダー */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">予約ページ</h1>
        <Link href="/admin/events/new" className="shrink-0 rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white hover:bg-[#05a847]">
          新規作成
        </Link>
      </div>

      {/* タブ */}
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

      {/* イベント一覧 */}
      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">イベントがありません</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => (
            <div key={event.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <EventStatusBadge status={event.status} />
                  <Link href={`/admin/events/${event.id}`} className="text-sm font-bold text-gray-900 hover:text-[#06C755] truncate">
                    {event.title}
                  </Link>
                </div>
                <p className="mt-0.5 text-xs text-gray-400">{formatDate(event.heldAt)}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Link href={`/admin/events/${event.id}`} className="rounded-lg bg-[#06C755]/10 px-2.5 py-1.5 text-xs font-bold text-[#06C755]">詳細</Link>
                <Link href={`/admin/events/${event.id}/edit`} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600">編集</Link>
                <button onClick={() => handleDuplicate(event.id)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600">複製</button>
                <button onClick={() => handleDelete(event.id)} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-500">削除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 表示スタイル設定 + プレビュー */}
      <div className="mt-6 flex gap-6 items-start">
        {/* 左：設定パネル */}
        <div className="min-w-0 flex-1 space-y-3">

          {/* 表示項目 */}
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="mb-2.5 text-xs font-bold text-gray-500">公開サイトに表示する項目</p>
            <div className="flex flex-wrap gap-2">
              {displayFieldOptions.map(({ key, label, icon }) => {
                const on = displayFields[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDisplayField(key)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      on
                        ? 'border-[#06C755] bg-[#06C755]/8 text-[#06C755]'
                        : 'border-gray-200 bg-gray-50 text-gray-400 line-through'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ライブフィード */}
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gray-500">ライブフィード</p>
                <p className="mt-0.5 text-[11px] text-gray-400">LIFFホーム画面のヘッダー下に、最近の予約状況を流すテロップを表示します</p>
              </div>
              <button
                type="button"
                onClick={toggleActivityTicker}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  activityTickerEnabled
                    ? 'border-[#06C755] bg-[#06C755]/8 text-[#06C755]'
                    : 'border-gray-200 bg-gray-50 text-gray-400'
                }`}
              >
                {activityTickerEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* メッセージ文面 */}
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-bold text-gray-500">メッセージ文面のカスタマイズ</p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              空欄の場合は標準の文面が使われます。使える変数：{'{title}'}（イベント名）・{'{date}'}（日時）・{'{location}'}（場所）・{'{price}'}（参加費、予約完了メッセージのみ）
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">予約完了メッセージ</label>
                <textarea
                  value={reservationMessageTemplate}
                  onChange={(e) => setReservationMessageTemplate(e.target.value)}
                  placeholder={'【{title}】ご予約ありがとうございます！\n日時：{date}\n場所：{location}'}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">前日リマインドメッセージ</label>
                <textarea
                  value={reminderMessageTemplate}
                  onChange={(e) => setReminderMessageTemplate(e.target.value)}
                  placeholder={'【{title}】まもなく開催です！\n日時：{date}\n場所：{location}'}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>
              <button
                type="button"
                onClick={saveMessageTemplates}
                disabled={savingMessages}
                className="rounded-lg bg-[#06C755] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
              >
                {savingMessages ? '保存中...' : messagesSaved ? '保存しました ✓' : '保存する'}
              </button>
            </div>
          </div>

          {/* 表示スタイル */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="text-xs font-bold text-gray-500">公開サイトの表示スタイル</span>
              <div className="flex gap-1 rounded-lg border border-gray-200 p-0.5">
                {reserveViewOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => saveReserveViewStyle(opt.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                      reserveViewStyle === opt.value
                        ? 'bg-[#06C755] text-white'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className="ml-0 text-xs font-bold text-gray-500 md:ml-2">予約スタイル</span>
              <div className="flex gap-1 rounded-lg border border-gray-200 p-0.5">
                {reservationActionOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => saveReservationActionStyle(opt.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                      reservationActionStyle === opt.value
                        ? 'bg-[#06C755] text-white'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {reservationActionStyle === 'line' && (
                <input
                  type="url"
                  value={reservationLineUrl}
                  onChange={(e) => setReservationLineUrl(e.target.value)}
                  placeholder="予約用LINE URL（https://lin.ee/...）"
                  className="min-w-[240px] flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              )}
              <button
                type="button"
                onClick={saveAndReflect}
                disabled={savingStyle}
                className="rounded-lg bg-[#06C755] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
              >
                {savingStyle ? '処理中...' : reflected ? '反映済み ✓' : '保存・反映'}
              </button>
            </div>
          </div>
        </div>

        {/* 右：モバイルプレビュー */}
        {scheduleUrl && (
          <div className="shrink-0 hidden lg:block">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-gray-400">👤 ユーザーにはこう見えます</p>
              <button
                type="button"
                onClick={() => setIframeKey((k) => k + 1)}
                className="text-[10px] text-gray-400 hover:text-gray-600 underline"
              >
                再読込
              </button>
            </div>
            <div className="overflow-hidden rounded-[2.5rem] border-[6px] border-gray-800 bg-white shadow-2xl" style={{ width: '220px' }}>
              <div className="flex items-center justify-center gap-2 bg-gray-800 py-2">
                <div className="h-1.5 w-12 rounded-full bg-gray-600" />
              </div>
              <iframe
                key={iframeKey}
                src={scheduleUrl}
                width="375"
                height="667"
                style={{ zoom: 0.587, border: 'none', display: 'block' }}
                title="モバイルプレビュー"
              />
            </div>
          </div>
        )}
      </div>
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
