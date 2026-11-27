'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, formatDate, StaffViewEventDetail, StaffViewReservation } from '@/lib/api';
import { ReservationBadge, EventStatusBadge } from '@/components/ui/StatusBadge';

const POLL_INTERVAL_MS = 15000;

function formatAnswerValue(value: string | string[]) {
  return Array.isArray(value) ? value.join('、') : value;
}

function genderSummary(reservations: StaffViewReservation[]) {
  const active = reservations.filter((r) => r.status !== 'waitlisted');
  return {
    total: active.length,
    male: active.filter((r) => r.gender === '男性').length,
    female: active.filter((r) => r.gender === '女性').length,
    waitlisted: reservations.length - active.length,
    duplicateCount: reservations.filter((r) => r.isDuplicate).length,
  };
}

function SummaryGrid({ total, male, female, duplicateCount, capacityMale, capacityFemale, capacity }: {
  total: number; male: number; female: number; duplicateCount: number;
  capacity?: number | null; capacityMale?: number | null; capacityFemale?: number | null;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
        <p className="text-[11px] text-gray-400">合計</p>
        <p className="mt-0.5 text-lg font-bold text-gray-900">
          {total}{capacity != null ? <span className="text-xs font-normal text-gray-400">/{capacity}</span> : null}
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
        <p className="text-[11px] text-gray-400">男性</p>
        <p className="mt-0.5 text-lg font-bold text-blue-600">
          {male}{capacityMale != null ? <span className="text-xs font-normal text-gray-400">/{capacityMale}</span> : null}
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
        <p className="text-[11px] text-gray-400">女性</p>
        <p className="mt-0.5 text-lg font-bold text-pink-500">
          {female}{capacityFemale != null ? <span className="text-xs font-normal text-gray-400">/{capacityFemale}</span> : null}
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
        <p className="text-[11px] text-gray-400">重複</p>
        <p className="mt-0.5 text-lg font-bold text-orange-500">{duplicateCount}</p>
      </div>
    </div>
  );
}

function AssignTenantDropdown({ reservation, collabTenants, token, eventId, onAssigned }: {
  reservation: StaffViewReservation;
  collabTenants: { tenantId: string; tenantName: string }[];
  token: string;
  eventId: string;
  onAssigned: (reservationId: string, tenantId: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(reservation.tenantId ?? '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleChange(tenantId: string) {
    setSelected(tenantId);
    setErrorMsg(null);
    setSaving(true);
    try {
      await api.public.assignStaffViewReservationTenant(token, eventId, reservation.id, tenantId);
      onAssigned(reservation.id, tenantId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '振り分けに失敗しました';
      setErrorMsg(msg);
      setSelected(reservation.tenantId ?? '');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="mt-1.5 w-full rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-60"
      >
        <option value="" disabled>振り分け先を選択</option>
        {collabTenants.map((t) => (
          <option key={t.tenantId} value={t.tenantId}>{t.tenantName}</option>
        ))}
      </select>
      {errorMsg && <p className="mt-0.5 text-[10px] text-red-500">{errorMsg}</p>}
    </div>
  );
}

function ReservationList({ reservations, event, token, eventId, onReassign }: {
  reservations: StaffViewReservation[];
  event: StaffViewEventDetail['event'];
  token: string;
  eventId: string;
  onReassign: (reservationId: string, tenantId: string) => void;
}) {
  const isCollab = event.isCollab && (event.collabTenants?.length ?? 0) > 1;
  const collabTenants = event.collabTenants ?? [];

  if (reservations.length === 0) {
    return <div className="p-8 text-center text-sm text-gray-400">まだ参加者はいません</div>;
  }

  return (
    <>
      <div className="divide-y divide-gray-100 md:hidden">
        {reservations.map((r, i) => (
          <div key={i} className={`p-4 ${r.isDuplicate ? 'bg-orange-50/60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                {r.linePictureUrl ? (
                  <img src={r.linePictureUrl} alt="" className="mt-0.5 h-6 w-6 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-gray-200" />
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-gray-900">{r.name ?? '未入力'}</p>
                    {r.isDuplicate && (
                      <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">重複</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                    <span>{r.grade ?? '-'}</span>
                    <span>{r.gender ?? '-'}</span>
                    {event.levelEnabled && <span>{r.level ?? '-'}</span>}
                  </div>
                </div>
              </div>
              <ReservationBadge status={r.status} />
            </div>
            {(r.comment || r.customAnswers.length > 0) && (
              <div className="mt-2 space-y-0.5 pl-8 text-xs text-gray-500">
                {r.comment && <p>一言：{r.comment}</p>}
                {r.customAnswers.map((a, j) => (
                  <p key={j}>{a.label}：{formatAnswerValue(a.value)}</p>
                ))}
              </div>
            )}
            <p className="mt-2 pl-8 text-[11px] text-gray-400">予約：{formatDate(r.reservedAt)}</p>
            {r.isDuplicate && isCollab && (
              <div className="pl-8">
                <AssignTenantDropdown
                  reservation={r}
                  collabTenants={collabTenants}
                  token={token}
                  eventId={eventId}
                  onAssigned={onReassign}
                />
              </div>
            )}
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
              {isCollab && <th className="px-6 py-3 text-left">団体振り分け</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reservations.map((r, i) => (
              <tr key={i} className={r.isDuplicate ? 'bg-orange-50/50' : ''}>
                <td className="px-6 py-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    {r.linePictureUrl ? (
                      <img src={r.linePictureUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="h-6 w-6 shrink-0 rounded-full bg-gray-200" />
                    )}
                    <div>
                      {r.name ?? '未入力'}
                      {r.isDuplicate && (
                        <span className="ml-1.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">重複</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{r.grade ?? '-'}</td>
                <td className="px-6 py-4 text-gray-600">{r.gender ?? '-'}</td>
                {event.levelEnabled && <td className="px-6 py-4 text-gray-600">{r.level ?? '-'}</td>}
                <td className="px-6 py-4 text-xs text-gray-500">
                  {r.comment && <p>一言：{r.comment}</p>}
                  {r.customAnswers.map((a, j) => (
                    <p key={j}>{a.label}：{formatAnswerValue(a.value)}</p>
                  ))}
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">{formatDate(r.reservedAt)}</td>
                <td className="px-6 py-4">
                  <ReservationBadge status={r.status} />
                </td>
                {isCollab && (
                  <td className="px-6 py-4">
                    {r.isDuplicate ? (
                      <AssignTenantDropdown
                        reservation={r}
                        collabTenants={collabTenants}
                        token={token}
                        eventId={eventId}
                        onAssigned={onReassign}
                      />
                    ) : (
                      <span className="text-xs text-gray-400">
                        {collabTenants.find((t) => t.tenantId === r.tenantId)?.tenantName ?? '-'}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function StaffViewEventPage() {
  const { token, eventId } = useParams<{ token: string; eventId: string }>();
  const [data, setData] = useState<StaffViewEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<string>('all');

  const load = useCallback(() => {
    api.public.staffViewEvent(token, eventId)
      .then((res) => setData(res))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token, eventId]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  const handleReassign = useCallback((reservationId: string, tenantId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        reservations: prev.reservations.map((r) =>
          r.id === reservationId ? { ...r, tenantId, isDuplicate: false } : r
        ),
      };
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#06C755] text-sm">読み込み中...</div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-lg font-bold text-gray-900">このリンクは無効です</p>
        <p className="text-sm text-gray-500">共有が停止されたか、リンクが正しくない可能性があります。</p>
      </div>
    );
  }

  const { event, summary, reservations } = data;
  const isCollab = event.isCollab && (event.collabTenants?.length ?? 0) > 1;
  const collabTenants = event.collabTenants ?? [];

  const filteredReservations = isCollab && tab !== 'all'
    ? reservations.filter((r) => r.tenantId === tab)
    : reservations;

  const tabSummary = tab === 'all' ? summary : genderSummary(filteredReservations);

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-[#06C755] text-white px-4 py-5">
        <Link href={`/staff/${token}`} className="text-xs opacity-80 underline">← 予約ページ一覧</Link>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <EventStatusBadge status={event.status} />
          <h1 className="text-base font-bold">{event.title}</h1>
          {isCollab && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">合同開催</span>}
        </div>
        <p className="text-xs mt-1 opacity-90">{formatDate(event.heldAt)} ・ {event.locationHint || event.location}</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {isCollab && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setTab('all')}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${tab === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              全体
            </button>
            {collabTenants.map((t) => (
              <button
                key={t.tenantId}
                onClick={() => setTab(t.tenantId)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${tab === t.tenantId ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
              >
                {t.tenantName}
              </button>
            ))}
          </div>
        )}

        <SummaryGrid
          total={tabSummary.total}
          male={tabSummary.male}
          female={tabSummary.female}
          duplicateCount={tabSummary.duplicateCount ?? 0}
          capacity={tab === 'all' ? event.capacity : undefined}
          capacityMale={tab === 'all' ? event.capacityMale : undefined}
          capacityFemale={tab === 'all' ? event.capacityFemale : undefined}
        />

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">予約者一覧 ({filteredReservations.length}件)</h2>
            <span className="text-[11px] text-gray-400">自動更新中</span>
          </div>
          <ReservationList
            reservations={filteredReservations}
            event={event}
            token={token}
            eventId={eventId}
            onReassign={handleReassign}
          />
        </div>
      </div>
    </div>
  );
}
