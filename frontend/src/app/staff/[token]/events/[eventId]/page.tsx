'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, formatDate, StaffViewEventDetail } from '@/lib/api';
import { ReservationBadge, EventStatusBadge } from '@/components/ui/StatusBadge';

const POLL_INTERVAL_MS = 15000;

function formatAnswerValue(value: string | string[]) {
  return Array.isArray(value) ? value.join('、') : value;
}

export default function StaffViewEventPage() {
  const { token, eventId } = useParams<{ token: string; eventId: string }>();
  const [data, setData] = useState<StaffViewEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cancellingAll, setCancellingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api.public.staffViewEvent(token, eventId)
        .then((res) => { if (!cancelled) setData(res); })
        .catch(() => { if (!cancelled) setNotFound(true); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [token, eventId]);

  async function handleStatus(reservationId: string, status: 'reserved' | 'cancelled') {
    const message = status === 'reserved'
      ? 'この参加者を承認して、予約完了通知を送りますか？'
      : 'この参加者をキャンセルして、キャンセル通知を送りますか？';
    if (!window.confirm(message)) return;
    setSavingId(reservationId);
    try {
      await api.public.updateStaffViewReservationStatus(token, eventId, reservationId, status);
      setData(await api.public.staffViewEvent(token, eventId));
    } catch (error) {
      alert(error instanceof Error ? error.message : '処理に失敗しました');
    } finally {
      setSavingId(null);
    }
  }

  async function handleCancelAll() {
    if (!window.confirm(`表示中の参加者${reservations.length}名を全員キャンセルし、通知を送ります。元に戻せません。実行しますか？`)) return;
    if (!window.confirm('本当に全員キャンセルしますか？')) return;
    setCancellingAll(true);
    try {
      const result = await api.public.cancelAllStaffViewReservations(token, eventId);
      setData(await api.public.staffViewEvent(token, eventId));
      alert(`${result.cancelled}名をキャンセルしました。${result.notificationErrors ? `（通知エラー：${result.notificationErrors}件）` : ''}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : '一括キャンセルに失敗しました');
    } finally {
      setCancellingAll(false);
    }
  }

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

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-[#06C755] text-white px-4 py-5">
        <Link href={`/staff/${token}`} className="text-xs opacity-80 underline">← 予約ページ一覧</Link>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <EventStatusBadge status={event.status} />
          <h1 className="text-base font-bold">{event.title}</h1>
        </div>
        <p className="text-xs mt-1 opacity-90">{formatDate(event.heldAt)} ・ {event.locationHint || event.location}</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-[11px] text-gray-400">合計</p>
            <p className="mt-0.5 text-lg font-bold text-gray-900">{summary.total}{event.capacity != null ? <span className="text-xs font-normal text-gray-400">/{event.capacity}</span> : null}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-[11px] text-gray-400">男性</p>
            <p className="mt-0.5 text-lg font-bold text-blue-600">{summary.male}{event.capacityMale != null ? <span className="text-xs font-normal text-gray-400">/{event.capacityMale}</span> : null}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-[11px] text-gray-400">女性</p>
            <p className="mt-0.5 text-lg font-bold text-pink-500">{summary.female}{event.capacityFemale != null ? <span className="text-xs font-normal text-gray-400">/{event.capacityFemale}</span> : null}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-[11px] text-gray-400">未確定</p>
            <p className="mt-0.5 text-lg font-bold text-amber-600">{summary.waitlisted}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">予約者一覧 ({reservations.length}件)</h2>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-gray-400">自動更新中</span>
              {reservations.length > 0 && (
                <button onClick={handleCancelAll} disabled={cancellingAll} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50">
                  {cancellingAll ? '処理中...' : '全員キャンセル'}
                </button>
              )}
            </div>
          </div>

          {reservations.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">まだ参加者はいません</div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 md:hidden">
                {reservations.map((r, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        {r.linePictureUrl ? (
                          <img src={r.linePictureUrl} alt="" className="mt-0.5 h-6 w-6 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-gray-200" />
                        )}
                        <div>
                          <p className="text-sm font-bold text-gray-900">{r.name ?? '未入力'}</p>
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
                    <div className="mt-3 flex gap-2 pl-8">
                      {r.status === 'pending_approval' && (
                        <button onClick={() => handleStatus(r.id, 'reserved')} disabled={savingId === r.id} className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">承認して通知</button>
                      )}
                      <button onClick={() => handleStatus(r.id, 'cancelled')} disabled={savingId === r.id} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50">キャンセルして通知</button>
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
                    {reservations.map((r, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {r.linePictureUrl ? (
                              <img src={r.linePictureUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                            ) : (
                              <span className="h-6 w-6 shrink-0 rounded-full bg-gray-200" />
                            )}
                            {r.name ?? '未入力'}
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
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex gap-3">
                            {r.status === 'pending_approval' && (
                              <button onClick={() => handleStatus(r.id, 'reserved')} disabled={savingId === r.id} className="text-xs font-bold text-purple-600 disabled:opacity-50">承認して通知</button>
                            )}
                            <button onClick={() => handleStatus(r.id, 'cancelled')} disabled={savingId === r.id} className="text-xs font-bold text-red-600 disabled:opacity-50">キャンセルして通知</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
