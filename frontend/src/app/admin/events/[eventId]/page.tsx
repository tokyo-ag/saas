'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, formatDate, downloadWithAuth, API_URL, Event, Reservation, CustomProfileQuestion } from '@/lib/api';
import { imgUrl } from '@/lib/imgUrl';
import { SITE_URL } from '@/lib/config';
import { EventBadge, ReservationBadge } from '@/components/ui/StatusBadge';


type EventReservation = Reservation & {
  member: {
    id: string;
    name?: string | null;
    grade?: string | null;
    gender?: string | null;
    level?: string | null;
    comment?: string | null;
    customAnswers?: Record<string, string | string[]> | null;
  };
};

type CollabTenantOption = {
  id: string;
  name: string;
};

function formatCustomAnswers(
  customAnswers: Record<string, string | string[]> | null | undefined,
  customQuestions: CustomProfileQuestion[],
): string {
  if (!customAnswers) return '';
  return Object.entries(customAnswers)
    .filter(([, value]) => (Array.isArray(value) ? value.length > 0 : !!value))
    .map(([id, value]) => {
      const label = customQuestions.find((q) => q.id === id)?.label ?? '質問';
      const text = Array.isArray(value) ? value.join('、') : value;
      return `${label}：${text}`;
    })
    .join(' / ');
}

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [reservations, setReservations] = useState<EventReservation[]>([]);
  const [customQuestions, setCustomQuestions] = useState<CustomProfileQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterCopied, setRosterCopied] = useState(false);
  const [savingRosterShare, setSavingRosterShare] = useState(false);
  const [collabCopied, setCollabCopied] = useState(false);
  const [sendingCollab, setSendingCollab] = useState(false);
  const [collabRequested, setCollabRequested] = useState(false);
  const [collabTenants, setCollabTenants] = useState<CollabTenantOption[]>([]);
  const [collabTenantsLoading, setCollabTenantsLoading] = useState(true);
  const [collabTenantsError, setCollabTenantsError] = useState(false);
  const [collabTargetIds, setCollabTargetIds] = useState<string[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState('');

  const load = useCallback(async () => {
    const [eventData, reservationList] = await Promise.all([
      api.events.get(eventId),
      api.events.reservations(eventId),
    ]);
    setEvent(eventData);
    setReservations(reservationList as EventReservation[]);
  }, [eventId]);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
    api.tenant.get()
      .then((tenant) => {
        setCustomQuestions(tenant.customProfileQuestions ?? []);
        setCurrentTenantId(tenant.id);
        setCollabTargetIds((current) =>
          current.filter((id) => id !== tenant.id),
        );
      })
      .catch(() => {});
    api.tenant.listForCollab()
      .then(setCollabTenants)
      .catch(() => setCollabTenantsError(true))
      .finally(() => setCollabTenantsLoading(false));
  }, [load]);

  async function updateStatus(reservationId: string, status: string) {
    try {
      await api.reservations.updateStatus(reservationId, status);
      const updated = await api.events.reservations(eventId);
      setReservations(updated as EventReservation[]);
    } catch {
      alert('ステータスの更新に失敗しました');
    }
  }

  async function toggleRosterShare(enabled: boolean) {
    setSavingRosterShare(true);
    try {
      const updated = await api.events.toggleRosterShare(eventId, enabled);
      setEvent(updated);
    } catch {
      alert('名簿共有設定の更新に失敗しました');
    } finally {
      setSavingRosterShare(false);
    }
  }

  function copyRosterUrl() {
    if (!event?.rosterShareToken) return;
    navigator.clipboard.writeText(`${SITE_URL}/roster/${event.rosterShareToken}`).then(() => {
      setRosterCopied(true);
      setTimeout(() => setRosterCopied(false), 2000);
    });
  }

  function copyCollabUrl() {
    if (!event?.collab?.viewToken) return;
    navigator.clipboard.writeText(`${SITE_URL}/collab-roster/${event.collab.viewToken}`).then(() => {
      setCollabCopied(true);
      setTimeout(() => setCollabCopied(false), 2000);
    });
  }

  async function submitCollabRequest() {
    const targetTenantIds = collabTargetIds.filter(
      (tenantId) => tenantId !== currentTenantId,
    );
    if (targetTenantIds.length === 0) return;
    setSendingCollab(true);
    try {
      await api.events.requestCollab(eventId, targetTenantIds);
      setCollabRequested(true);
    } catch (e: any) {
      alert(e.message ?? '送信に失敗しました');
    } finally {
      setSendingCollab(false);
    }
  }

  function addCollabTenant(tenantId: string) {
    if (!tenantId) return;
    setCollabTargetIds((current) =>
      current.length >= 4 || current.includes(tenantId)
        ? current
        : [...current, tenantId],
    );
  }

  function removeCollabTenant(tenantId: string) {
    setCollabTargetIds((current) => current.filter((id) => id !== tenantId));
  }

  const availableCollabTenants = collabTenants.filter(
    (tenant) =>
      tenant.id !== currentTenantId && !collabTargetIds.includes(tenant.id),
  );
  let collabTenantSelectLabel = '団体を選択（最大4つ）';
  if (collabTenantsLoading) {
    collabTenantSelectLabel = '団体を読み込み中...';
  } else if (collabTenantsError) {
    collabTenantSelectLabel = '団体一覧を取得できませんでした';
  } else if (collabTenants.length === 0) {
    collabTenantSelectLabel = '選択できる団体がありません';
  } else if (collabTargetIds.length >= 4) {
    collabTenantSelectLabel = '4団体を選択済み';
  } else if (availableCollabTenants.length === 0) {
    collabTenantSelectLabel = '選択できる団体はありません';
  }

  if (loading) return <div className="px-4 py-12 text-center text-sm text-gray-400">読み込み中...</div>;
  if (!event) return <div className="px-4 py-12 text-center text-sm text-red-500">イベントが見つかりません</div>;

  return (
    <>
    <div className="px-4 py-4 md:px-6 md:py-6">
      {event.imageUrl && (
        <Image
          src={imgUrl(event.imageUrl, API_URL)!}
          alt={event.title}
          width={1200}
          height={1500}
          className="mb-5 w-full rounded-xl border border-gray-200 object-cover aspect-[4/5]"
          unoptimized
        />
      )}

      <div className="mb-6 space-y-4">
        <div className="flex items-start gap-3">
          {event.iconUrl && (
            <Image src={`${API_URL}${event.iconUrl}`} width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-cover" alt="" unoptimized />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-xl font-bold leading-tight text-gray-900 md:text-2xl">{event.title}</h1>
              <EventBadge status={event.status} />
            </div>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{formatDate(event.heldAt)} ・ {event.location}</p>
            <p className="mt-1 text-sm text-gray-600">
              予約: {event.reservedCount}{event.capacity ? ` / ${event.capacity}` : ''}人
              {(event.waitlistedCount ?? 0) > 0 && ` ・ 未確定 ${event.waitlistedCount}人`}
            </p>
          </div>
        </div>

        {event.collabReadOnly ? (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
            コラボ先から共有された閲覧専用イベントです
          </p>
        ) : (
          <div>
            <Link
              href={`/admin/events/${eventId}/edit`}
              className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[#06C755] px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-[#05a847] sm:w-auto sm:px-6"
            >
              編集
            </Link>
          </div>
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-4 md:px-6">
          <h2 className="font-semibold text-gray-900">予約一覧 ({reservations.length}件)</h2>
        </div>

        {reservations.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">まだ予約はありません</div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 md:hidden">
              {reservations.map((reservation) => (
                <div key={reservation.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {reservation.member.linePictureUrl ? (
                        <Image src={reservation.member.linePictureUrl} alt="" width={36} height={36} className="w-9 h-9 rounded-full shrink-0 object-cover" unoptimized />
                      ) : (
                        <div className="w-9 h-9 rounded-full shrink-0 bg-gray-200 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link href={`/admin/members/${reservation.member.id}`} className="break-words text-sm font-bold text-[#06C755]">
                          {reservation.member.lineDisplayName ?? reservation.member.name ?? '未入力'}
                          {reservation.member.lineDisplayName && reservation.member.name && (
                            <span className="font-normal text-gray-500"> / {reservation.member.name}</span>
                          )}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                          <span>{reservation.member.grade ?? '-'}</span>
                          <span>{reservation.member.gender ?? '-'}</span>
                          {event.levelEnabled && <span>{reservation.member.level ?? '-'}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <ReservationBadge status={reservation.status} />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">予約日時: {formatDate(reservation.reservedAt)}</p>
                  {reservation.member.comment && (
                    <p className="mt-1 text-xs text-gray-500">一言: {reservation.member.comment}</p>
                  )}
                  {formatCustomAnswers(reservation.member.customAnswers, customQuestions) && (
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">
                      {formatCustomAnswers(reservation.member.customAnswers, customQuestions)}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {reservation.status === 'reserved' && (
                      <button onClick={() => updateStatus(reservation.id, 'attended')} className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                        参加済みにする
                      </button>
                    )}
                    {['reserved', 'waitlisted', 'attended'].includes(reservation.status) && (
                      <button onClick={() => updateStatus(reservation.id, 'cancelled')} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                        キャンセル
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left">名前</th>
                    <th className="px-6 py-3 text-left">年齢</th>
                    <th className="px-6 py-3 text-left">性別</th>
                    {event.levelEnabled && <th className="px-6 py-3 text-left">レベル</th>}
                    <th className="px-6 py-3 text-left">回答</th>
                    <th className="px-6 py-3 text-left">予約日時</th>
                    <th className="px-6 py-3 text-left">ステータス</th>
                    <th className="px-6 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {reservation.member.linePictureUrl ? (
                            <Image src={reservation.member.linePictureUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full shrink-0 object-cover" unoptimized />
                          ) : (
                            <div className="w-8 h-8 rounded-full shrink-0 bg-gray-200 flex items-center justify-center">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link href={`/admin/members/${reservation.member.id}`} className="font-medium text-[#06C755] hover:underline">
                              {reservation.member.lineDisplayName ?? reservation.member.name ?? '未入力'}
                              {reservation.member.lineDisplayName && reservation.member.name && (
                                <span className="font-normal text-gray-500"> / {reservation.member.name}</span>
                              )}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{reservation.member.grade ?? '-'}</td>
                      <td className="px-6 py-4 text-gray-600">{reservation.member.gender ?? '-'}</td>
                      {event.levelEnabled && <td className="px-6 py-4 text-gray-600">{reservation.member.level ?? '-'}</td>}
                      <td className="max-w-[240px] px-6 py-4 text-xs text-gray-500">
                        {[
                          reservation.member.comment ? `一言：${reservation.member.comment}` : '',
                          formatCustomAnswers(reservation.member.customAnswers, customQuestions),
                        ].filter(Boolean).join(' / ') || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(reservation.reservedAt)}</td>
                      <td className="px-6 py-4">
                        <ReservationBadge status={reservation.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {reservation.status === 'reserved' && (
                            <button onClick={() => updateStatus(reservation.id, 'attended')} className="text-xs text-green-600 hover:underline">参加済みにする</button>
                          )}
                          {['reserved', 'waitlisted', 'attended'].includes(reservation.status) && (
                            <button onClick={() => updateStatus(reservation.id, 'cancelled')} className="text-xs text-red-600 hover:underline">キャンセル</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {!event.collabReadOnly && <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">参加者名簿の共有</h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">ONにすると、ログイン不要で参加者名簿を閲覧できるリンクを発行できます。スタッフへの共有などにご活用ください。</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!event.rosterShareEnabled}
            disabled={savingRosterShare}
            onClick={() => toggleRosterShare(!event.rosterShareEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${event.rosterShareEnabled ? 'bg-[#06C755]' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${event.rosterShareEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        {event.rosterShareEnabled && event.rosterShareToken && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              readOnly
              value={`${SITE_URL}/roster/${event.rosterShareToken}`}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={copyRosterUrl}
              className="shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {rosterCopied ? 'コピーしました' : 'コピー'}
            </button>
          </div>
        )}
      </section>}

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <h2 className="text-sm font-semibold text-gray-800">コラボ申請</h2>
        {event.collab ? (
          <div className="mt-2 space-y-2">
            <p className="text-xs leading-relaxed text-gray-400">
              他団体との合同開催として連携されています{!event.collab.active && '（現在は無効化されています）'}。以下のリンクで参加者名簿を統合して確認できます。
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                readOnly
                value={`${SITE_URL}/collab-roster/${event.collab.viewToken}`}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={copyCollabUrl}
                className="shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                {collabCopied ? 'コピーしました' : 'コピー'}
              </button>
            </div>
          </div>
        ) : collabRequested ? (
          <p className="mt-2 text-xs text-gray-500">申請しました</p>
        ) : (
          <div className="mt-2 space-y-2">
            <select
              value=""
              onChange={(e) => addCollabTenant(e.target.value)}
              disabled={
                collabTenantsLoading ||
                collabTenantsError ||
                availableCollabTenants.length === 0 ||
                collabTargetIds.length >= 4
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">{collabTenantSelectLabel}</option>
              {availableCollabTenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
            {collabTargetIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {collabTargetIds.map((tenantId) => {
                  const tenant = collabTenants.find((item) => item.id === tenantId);
                  if (!tenant) return null;
                  return (
                    <button
                      key={tenant.id}
                      type="button"
                      onClick={() => removeCollabTenant(tenant.id)}
                      className="rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200"
                      aria-label={`${tenant.name}を選択から外す`}
                    >
                      {tenant.name} ×
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={submitCollabRequest}
              disabled={sendingCollab || collabTargetIds.length === 0}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {sendingCollab ? '送信中...' : 'コラボ申請'}
            </button>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <h2 className="text-sm font-semibold text-gray-800">データエクスポート</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-400">参加者一覧・予約状況をCSVファイルでダウンロードできます。名簿管理や出欠確認にご活用ください。</p>
        <button
          onClick={() => downloadWithAuth(`${API_URL}/api/admin/events/${eventId}/export`, `event-${eventId}.csv`).catch(() => alert('ダウンロードに失敗しました'))}
          className="mt-3 flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSVダウンロード
        </button>
      </section>
    </div>
    </>
  );
}
