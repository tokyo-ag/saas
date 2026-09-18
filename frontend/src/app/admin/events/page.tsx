'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, formatDate } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { SITE_URL } from '@/lib/config';
import { EventStatusBadge } from '@/components/ui/StatusBadge';
import { TenantSeoTextSection } from '@/components/admin/TenantSeoTextSection';
import {
  DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS,
  normalizeEventSocialProofSettings,
} from '@/lib/eventSocialProof';
import type { Event, EventSocialProofRule, EventSocialProofSettings } from '@/lib/api';

const reserveViewOptions = [
  { label: 'カレンダー', value: 'calendar' },
  { label: 'カード', value: 'card' },
  { label: 'スレッド', value: 'thread' },
];

type ReservationActionStyle = 'comiu' | 'line';
type DisplayFields = { location: boolean; price: boolean; capacity: boolean; description: boolean };
type SocialProofRuleKey = 'balanced' | 'femaleHigh' | 'ratio32' | 'bothGenders';

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
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [publicPageId, setPublicPageId] = useState<string | null>(null);
  const [publicPageData, setPublicPageData] = useState<import('@/lib/api').PublicPage | null>(null);
  const [reserveViewStyle, setReserveViewStyle] = useState<string>('calendar');
  const [reservationActionStyle, setReservationActionStyle] = useState<ReservationActionStyle>('comiu');
  const [reservationLineUrl, setReservationLineUrl] = useState('');
  const [displayFields, setDisplayFields] = useState<DisplayFields>(DEFAULT_DISPLAY_FIELDS);
  const [activityTickerEnabled, setActivityTickerEnabled] = useState(true);
  const [socialProofSettings, setSocialProofSettings] = useState<EventSocialProofSettings>(DEFAULT_EVENT_SOCIAL_PROOF_SETTINGS);
  const [savingSocialProof, setSavingSocialProof] = useState(false);
  const [socialProofSaved, setSocialProofSaved] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);
  const [reflected, setReflected] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [eventsSeoDescription, setEventsSeoDescription] = useState<string | null>(null);
  const [staffViewEnabled, setStaffViewEnabled] = useState(false);
  const [staffViewToken, setStaffViewToken] = useState<string | null>(null);
  const [savingStaffView, setSavingStaffView] = useState(false);
  const [staffViewCopied, setStaffViewCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.events.list().then(setEvents).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    api.tenant.get().then((t) => {
      setTenantId(t.code ?? t.id);
      setActivityTickerEnabled(t.activityTickerEnabled !== false);
      setSocialProofSettings(normalizeEventSocialProofSettings(t.eventSocialProofSettings));
      setEventsSeoDescription(t.eventsSeoDescription ?? '');
      setStaffViewEnabled(!!t.staffViewEnabled);
      setStaffViewToken(t.staffViewToken ?? null);
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

  async function revalidate(tenantCode: string, slug?: string) {
    if (!tenantCode) return;
    const token = getToken();
    await fetch('/api/revalidate-public-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ tenantCode, ...(slug ? { slug } : {}) }),
    }).catch(() => null);
  }

  function updateSocialProofRule(key: SocialProofRuleKey, patch: Partial<EventSocialProofRule>) {
    setSocialProofSettings((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  }

  function updateSocialProofTier(min: 40 | 50 | 60 | 100, patch: Partial<EventSocialProofSettings['sizeTiers'][number]>) {
    setSocialProofSettings((current) => ({
      ...current,
      sizeTiers: current.sizeTiers.map((tier) => tier.min === min ? { ...tier, ...patch } : tier),
    }));
  }

  async function saveSocialProofSettings() {
    setSavingSocialProof(true);
    setSocialProofSaved(false);
    try {
      const updated = await api.tenant.update({ eventSocialProofSettings: socialProofSettings });
      setSocialProofSettings(normalizeEventSocialProofSettings(updated.eventSocialProofSettings));
      await revalidate(tenantId, publicPageData?.slug);
      setIframeKey((key) => key + 1);
      setSocialProofSaved(true);
      setTimeout(() => setSocialProofSaved(false), 2500);
    } catch (error: any) {
      alert(error?.message ?? '注目表示の設定を保存できませんでした');
    } finally {
      setSavingSocialProof(false);
    }
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

  const publicScheduleUrl = tenantId ? `${SITE_URL}/e/${tenantId}` : '';
  // LINE認証後の画面ではなく、Googleなどからそのまま見られるSEOページ
  // (/e/{tenantId})をプレビューに使う。
  const previewUrl = tenantId ? `/e/${tenantId}` : '';

  function copyPublicScheduleUrl() {
    if (!publicScheduleUrl) return;
    navigator.clipboard.writeText(publicScheduleUrl).then(() => {
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2000);
    });
  }

  async function toggleStaffView(enabled: boolean) {
    setSavingStaffView(true);
    try {
      const updated = await api.tenant.toggleStaffView(enabled);
      setStaffViewEnabled(!!updated.staffViewEnabled);
      setStaffViewToken(updated.staffViewToken ?? null);
    } catch {
      alert('運営用リンクの設定に失敗しました');
    } finally {
      setSavingStaffView(false);
    }
  }

  function copyStaffViewUrl() {
    if (!staffViewToken) return;
    navigator.clipboard.writeText(`${SITE_URL}/staff/${staffViewToken}`).then(() => {
      setStaffViewCopied(true);
      setTimeout(() => setStaffViewCopied(false), 2000);
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
        locationHint: ev.locationHint ?? null,
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
        reservationMessageTemplate: ev.reservationMessageTemplate ?? null,
        remindEnabled: ev.remindEnabled,
        remindAt: ev.remindAt ?? null,
        reminderMessageTemplate: ev.reminderMessageTemplate ?? null,
        imageUrl: ev.imageUrl,
        iconUrl: ev.iconUrl,
        category: ev.category ?? null,
        tags: ev.tags ?? [],
        levelEnabled: ev.levelEnabled,
        rosterShareEnabled: ev.rosterShareEnabled,
        reserveActionStyle: ev.reserveActionStyle ?? null,
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

      {/* 運営用の閲覧専用リンク */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">運営用の閲覧リンク</h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">ONにすると、ログイン不要で予約ページ一覧と各イベントの予約者一覧（人数・男女比を含む）を閲覧できるリンクを発行できます。編集はできません。</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={staffViewEnabled}
            disabled={savingStaffView}
            onClick={() => toggleStaffView(!staffViewEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${staffViewEnabled ? 'bg-[#06C755]' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${staffViewEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        {staffViewEnabled && staffViewToken && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              readOnly
              value={`${SITE_URL}/staff/${staffViewToken}`}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={copyStaffViewUrl}
              className="shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {staffViewCopied ? 'コピーしました' : 'コピー'}
            </button>
          </div>
        )}
      </div>

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

          {/* イベントカードの注目表示 */}
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gray-700">イベントカードの注目表示</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400">
                  LINEログイン後の予約ページで、スレッド右下に男女比・参加規模を表示します。公開SEOページや、該当情報がないイベントには表示しません。
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={socialProofSettings.enabled}
                onClick={() => setSocialProofSettings((current) => ({ ...current, enabled: !current.enabled }))}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${socialProofSettings.enabled ? 'bg-[#06C755]' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${socialProofSettings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {socialProofSettings.enabled && (
              <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                <div>
                  <p className="mb-2 text-[11px] font-bold text-gray-500">表示する判定</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ['balanced', '男女比半々'],
                      ['femaleHigh', '女性参加率高め'],
                      ['ratio32', '男女比約3:2'],
                      ['bothGenders', '男女とも参加予定'],
                    ] as const).map(([key, label]) => {
                      const enabled = socialProofSettings[key].enabled;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateSocialProofRule(key, { enabled: !enabled })}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${enabled ? 'border-[#06C755] bg-[#06C755]/8 text-[#06C755]' : 'border-gray-200 bg-gray-50 text-gray-400 line-through'}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSocialProofSettings((current) => ({
                        ...current,
                        aboveAverage: { ...current.aboveAverage, enabled: !current.aboveAverage.enabled },
                      }))}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${socialProofSettings.aboveAverage.enabled ? 'border-[#06C755] bg-[#06C755]/8 text-[#06C755]' : 'border-gray-200 bg-gray-50 text-gray-400 line-through'}`}
                    >
                      いつもより参加多め
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-bold text-gray-500">参加規模</p>
                  <div className="flex flex-wrap gap-2">
                    {[...socialProofSettings.sizeTiers].sort((a, b) => a.min - b.min).map((tier) => (
                      <button
                        key={tier.min}
                        type="button"
                        onClick={() => updateSocialProofTier(tier.min, { enabled: !tier.enabled })}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${tier.enabled ? 'border-[#06C755] bg-[#06C755]/8 text-[#06C755]' : 'border-gray-200 bg-gray-50 text-gray-400 line-through'}`}
                      >
                        {tier.min}人以上
                      </button>
                    ))}
                  </div>
                </div>

                <details className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-bold text-gray-600">表示文言を編集</summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {([
                      ['balanced', '男女比が半々'],
                      ['femaleHigh', '女性が多い'],
                      ['ratio32', '男女比が約3:2'],
                      ['bothGenders', '男女とも参加'],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="text-[11px] font-medium text-gray-500">
                        {label}
                        <input
                          type="text"
                          maxLength={40}
                          value={socialProofSettings[key].label}
                          onChange={(event) => updateSocialProofRule(key, { label: event.target.value })}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:border-[#06C755] focus:outline-none"
                        />
                      </label>
                    ))}
                    <label className="text-[11px] font-medium text-gray-500">
                      平均より多い
                      <input
                        type="text"
                        maxLength={40}
                        value={socialProofSettings.aboveAverage.label}
                        onChange={(event) => setSocialProofSettings((current) => ({
                          ...current,
                          aboveAverage: { ...current.aboveAverage, label: event.target.value },
                        }))}
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:border-[#06C755] focus:outline-none"
                      />
                    </label>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[...socialProofSettings.sizeTiers].sort((a, b) => a.min - b.min).map((tier) => (
                      <div key={tier.min} className="grid gap-2 sm:grid-cols-[70px_1fr] sm:items-end">
                        <span className="pb-2 text-[11px] font-bold text-gray-500">{tier.min}人～</span>
                        <label className="text-[10px] text-gray-400">
                          単独表示
                          <input
                            type="text"
                            maxLength={40}
                            value={tier.label}
                            onChange={(event) => updateSocialProofTier(tier.min, { label: event.target.value })}
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:border-[#06C755] focus:outline-none"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </details>

                <details className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-bold text-gray-600">判定条件の詳細</summary>
                  <p className="mt-2 text-[10px] leading-relaxed text-gray-400">
                    性別未回答者は参加規模には含め、男女比の計算からは除外します。1～3人では性別を推測されないよう男女比を表示しません。
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {([
                      ['minGenderSample', '男女比を出す最低人数', 4, 100],
                      ['balanceDifference4To9', '4～9人の許容差', 0, 9],
                      ['balanceDifference10To39', '10～39人の許容差', 0, 39],
                      ['balanceDifference40To69', '40～69人の許容差', 0, 69],
                      ['balanceDifference70To99', '70～99人の許容差', 0, 99],
                      ['balanceDifference100PlusPercent', '100人以上の許容率（%）', 0, 50],
                      ['ratio32MinMalePercent', '3:2 男性比率 最小（%）', 50, 100],
                      ['ratio32MaxMalePercent', '3:2 男性比率 最大（%）', 50, 100],
                    ] as const).map(([key, label, min, max]) => (
                      <label key={key} className="text-[10px] font-medium text-gray-500">
                        {label}
                        <input
                          type="number"
                          min={min}
                          max={max}
                          value={socialProofSettings[key]}
                          onChange={(event) => setSocialProofSettings((current) => ({
                            ...current,
                            [key]: Number(event.target.value),
                          }))}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-[#06C755] focus:outline-none"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <label className="text-[10px] font-medium text-gray-500">
                      比較する過去イベント数
                      <input
                        type="number"
                        min={3}
                        max={30}
                        value={socialProofSettings.aboveAverage.historyCount}
                        onChange={(event) => setSocialProofSettings((current) => ({ ...current, aboveAverage: { ...current.aboveAverage, historyCount: Number(event.target.value) } }))}
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-[#06C755] focus:outline-none"
                      />
                    </label>
                    <label className="text-[10px] font-medium text-gray-500">
                      平均より多い最低人数
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={socialProofSettings.aboveAverage.minimumIncreaseCount}
                        onChange={(event) => setSocialProofSettings((current) => ({ ...current, aboveAverage: { ...current.aboveAverage, minimumIncreaseCount: Number(event.target.value) } }))}
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-[#06C755] focus:outline-none"
                      />
                    </label>
                    <label className="text-[10px] font-medium text-gray-500">
                      平均より多い最低率（%）
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={socialProofSettings.aboveAverage.minimumIncreasePercent}
                        onChange={(event) => setSocialProofSettings((current) => ({ ...current, aboveAverage: { ...current.aboveAverage, minimumIncreasePercent: Number(event.target.value) } }))}
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-[#06C755] focus:outline-none"
                      />
                    </label>
                  </div>
                </details>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#06C755]/20 bg-[#06C755]/5 px-3 py-2">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400">表示例</p>
                    <p className="text-xs font-bold text-[#06C755]">{socialProofSettings.balanced.label}</p>
                    <p className="text-xs font-bold text-[#06C755]">
                      {socialProofSettings.sizeTiers.find((tier) => tier.min === 50)?.label ?? '50人以上参加予定'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={saveSocialProofSettings}
                    disabled={savingSocialProof}
                    className="rounded-lg bg-[#06C755] px-4 py-2 text-xs font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
                  >
                    {savingSocialProof ? '保存中...' : socialProofSaved ? '保存しました ✓' : '設定を保存'}
                  </button>
                </div>
              </div>
            )}

            {!socialProofSettings.enabled && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={saveSocialProofSettings}
                  disabled={savingSocialProof}
                  className="rounded-lg bg-[#06C755] px-4 py-2 text-xs font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
                >
                  {savingSocialProof ? '保存中...' : socialProofSaved ? '保存しました ✓' : '設定を保存'}
                </button>
              </div>
            )}
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
        {previewUrl && (
          <div className="shrink-0 hidden lg:block">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-gray-400">🔍 SEOページはこう見えます</p>
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
                src={previewUrl}
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

    {publicScheduleUrl && (
      <div className="px-4 pb-6 md:px-6 max-w-5xl">
        <div className="rounded-xl border border-[#06C755]/30 bg-[#06C755]/5 p-4 md:p-5">
          <p className="mb-1 text-sm font-bold text-[#06C755]">☆ COMIUの運営ポイント</p>
          <p className="mb-3 text-xs font-medium text-gray-700">イベントスケジュールのURL（LINEログイン不要）</p>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex-1 truncate rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs font-mono text-gray-600">
              {publicScheduleUrl}
            </span>
            <button
              type="button"
              onClick={copyPublicScheduleUrl}
              className="shrink-0 rounded-lg bg-[#06C755] px-4 py-2 text-xs font-bold text-white hover:bg-[#05a847]"
            >
              {copiedPublic ? 'コピー済み ✓' : 'コピー'}
            </button>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            このURLリンクを共有または公式LINEのチャットに貼ると、団体の活動スケジュールを直接共有できます！LINEログイン前でも誰でも見られ、GoogleなどのSEOにも反映されるので、SNSのプロフィール欄やホームページでの共有にもおすすめです。<br />
            また外部リンクからのアクセスが多い団体を30日間毎でカウントを行い、COMIU注目の団体！としてCOMIUからPRさせて頂いてます！
          </p>
        </div>
      </div>
    )}

    {eventsSeoDescription !== null && (
      <div className="px-4 pb-6 md:px-6 max-w-5xl">
        <TenantSeoTextSection
          field="eventsSeoDescription"
          title="予約スケジュールページのSEO文言"
          helpText="公開用の予約スケジュールページの見出し下とmeta descriptionに使われます。空欄の場合は団体の紹介文が使われます。"
          placeholder="例：池袋・新宿・渋谷で活動するインカレサークルBELL。初参加・一人参加も大歓迎です。"
          initialValue={eventsSeoDescription}
          onSaved={setEventsSeoDescription}
        />
      </div>
    )}
    </>
  );
}
