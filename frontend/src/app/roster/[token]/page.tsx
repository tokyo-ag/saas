'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, formatDate, PublicRoster } from '@/lib/api';
import { ReservationBadge } from '@/components/ui/StatusBadge';

const POLL_INTERVAL_MS = 15000;

type EditableField = 'referrer' | 'staffNote';
type Reservation = PublicRoster['reservations'][number];

export default function RosterSharePage() {
  const { token } = useParams<{ token: string }>();
  const [roster, setRoster] = useState<PublicRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // ポーリングで再取得しても入力中の内容が消えないよう、保存前の編集中の値は
  // ここに保持し、サーバーから来た値より優先して表示する。
  const [edits, setEdits] = useState<Record<string, Partial<Record<EditableField, string>>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api.public.roster(token)
        .then((data) => { if (!cancelled) setRoster(data); })
        .catch(() => { if (!cancelled) setNotFound(true); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [token]);

  function fieldValue(r: Reservation, field: EditableField) {
    return edits[r.id]?.[field] ?? r[field] ?? '';
  }

  function handleFieldChange(id: string, field: EditableField, value: string) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleFieldBlur(id: string, field: EditableField) {
    const value = edits[id]?.[field];
    if (value === undefined) return;
    setSavingId(id);
    try {
      await api.public.updateRosterReservation(token, id, { [field]: value });
      setRoster((prev) => prev ? {
        ...prev,
        reservations: prev.reservations.map((r) => r.id === id ? { ...r, [field]: value.trim() || null } : r),
      } : prev);
      setEdits((prev) => {
        const next = { ...prev };
        if (next[id]) {
          const { [field]: _removed, ...rest } = next[id]!;
          if (Object.keys(rest).length === 0) delete next[id];
          else next[id] = rest;
        }
        return next;
      });
    } catch {
      alert('保存に失敗しました');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#06C755] text-sm">読み込み中...</div>
      </div>
    );
  }

  if (notFound || !roster) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-lg font-bold text-gray-900">このリンクは無効です</p>
        <p className="text-sm text-gray-500">共有が停止されたか、リンクが正しくない可能性があります。</p>
      </div>
    );
  }

  const { event, reservations } = roster;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-[#06C755] text-white px-4 py-5">
        <p className="text-xs opacity-80">参加者名簿</p>
        <h1 className="text-base font-bold mt-1">{event.title}</h1>
        <p className="text-xs mt-1 opacity-90">{formatDate(event.heldAt)} ・ {event.locationHint || event.location}</p>
      </div>

      <div className="px-4 py-5">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">参加者一覧 ({reservations.length}件)</h2>
          </div>

          {reservations.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">まだ参加者はいません</div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 md:hidden">
                {reservations.map((r) => (
                  <div key={r.id} className="p-4">
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
                    <div className="mt-2 grid grid-cols-2 gap-2 pl-8">
                      <label className="block">
                        <span className="text-[10px] font-semibold text-gray-400">紹介者</span>
                        <input
                          value={fieldValue(r, 'referrer')}
                          onChange={(e) => handleFieldChange(r.id, 'referrer', e.target.value)}
                          onBlur={() => handleFieldBlur(r.id, 'referrer')}
                          disabled={savingId === r.id}
                          className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#06C755]"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-semibold text-gray-400">備考</span>
                        <input
                          value={fieldValue(r, 'staffNote')}
                          onChange={(e) => handleFieldChange(r.id, 'staffNote', e.target.value)}
                          onBlur={() => handleFieldBlur(r.id, 'staffNote')}
                          disabled={savingId === r.id}
                          className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#06C755]"
                        />
                      </label>
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
                      <th className="px-6 py-3 text-left">ステータス</th>
                      <th className="px-6 py-3 text-left">紹介者</th>
                      <th className="px-6 py-3 text-left">備考</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reservations.map((r) => (
                      <tr key={r.id}>
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
                        <td className="px-6 py-4">
                          <ReservationBadge status={r.status} />
                          {r.waitlistOrder && <span className="ml-1 text-xs text-gray-500">({r.waitlistOrder}番目)</span>}
                        </td>
                        <td className="px-6 py-4">
                          <input
                            value={fieldValue(r, 'referrer')}
                            onChange={(e) => handleFieldChange(r.id, 'referrer', e.target.value)}
                            onBlur={() => handleFieldBlur(r.id, 'referrer')}
                            disabled={savingId === r.id}
                            placeholder="例：〇〇の紹介"
                            className="w-32 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#06C755]"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            value={fieldValue(r, 'staffNote')}
                            onChange={(e) => handleFieldChange(r.id, 'staffNote', e.target.value)}
                            onBlur={() => handleFieldBlur(r.id, 'staffNote')}
                            disabled={savingId === r.id}
                            placeholder="備考"
                            className="w-40 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#06C755]"
                          />
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
