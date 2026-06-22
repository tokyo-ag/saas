'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type CheckinReservation = {
  id: string;
  status: string;
  reservedAt: string;
  member: { id: string; name?: string | null; grade?: string | null; gender?: string | null };
};

type CheckinResult = { memberName: string; alreadyCheckedIn: boolean } | null;

export default function CheckinPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const [reservations, setReservations] = useState<CheckinReservation[]>([]);
  const [result, setResult] = useState<CheckinResult>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'attended'>('all');
  const [processingMemberId, setProcessingMemberId] = useState<string | null>(null);

  const loadReservations = useCallback(async () => {
    const data = await api.events.reservations(eventId) as CheckinReservation[];
    setReservations(data);
  }, [eventId]);

  useEffect(() => {
    loadReservations().catch(console.error);
  }, [loadReservations]);

  async function checkIn(memberId: string) {
    if (processingMemberId) return;
    setProcessingMemberId(memberId);
    try {
      const next = await api.events.checkin(eventId, memberId);
      setResult(next);
      await loadReservations();
      window.setTimeout(() => setResult(null), 3000);
    } finally {
      setProcessingMemberId(null);
    }
  }

  const attended = reservations.filter((r) => r.status === 'attended').length;
  const total = reservations.filter((r) => ['reserved', 'attended', 'waiting_payment'].includes(r.status)).length;

  const filtered = reservations.filter((r) => {
    if (filter === 'pending') return ['reserved', 'waiting_payment'].includes(r.status);
    if (filter === 'attended') return r.status === 'attended';
    return ['reserved', 'attended', 'waiting_payment', 'waitlisted'].includes(r.status);
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-gray-400 p-1 -ml-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-sm font-bold">受付モード</p>
          <p className="text-xs text-gray-400">{attended} / {total} 人 来場確認済み</p>
        </div>
        <div className="w-8" />
      </div>

      <div className="px-4 py-4">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 px-4 py-4">
          <p className="text-sm font-semibold text-white">来場確認</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            予約者リストから対象者を確認して、来場済みにしてください。
          </p>
          {result && (
            <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${result.alreadyCheckedIn ? 'bg-yellow-500/20 text-yellow-300' : 'bg-[#06C755]/20 text-[#06C755]'}`}>
              {result.memberName} さんは{result.alreadyCheckedIn ? '既に来場確認済みです' : '来場確認済みになりました'}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-8">
        <div className="flex gap-2 mb-3">
          {(['all', 'pending', 'attended'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {f === 'all' ? `全員 (${total})` : f === 'pending' ? `未着 (${total - attended})` : `来場済 (${attended})`}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((reservation) => {
            const checkedIn = reservation.status === 'attended';
            const pending = ['reserved', 'waiting_payment'].includes(reservation.status);
            return (
              <div
                key={reservation.id}
                className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
                  checkedIn ? 'bg-[#06C755]/15 border border-[#06C755]/30' : 'bg-gray-800'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  checkedIn ? 'bg-[#06C755] text-white' : 'bg-gray-700 text-gray-300'
                }`}>
                  {checkedIn ? '✓' : (reservation.member.name ?? '?').slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{reservation.member.name ?? '未入力'}</p>
                  <p className="text-xs text-gray-400">{reservation.member.grade ?? '-'} ・ {reservation.member.gender ?? '-'}</p>
                </div>
                {pending ? (
                  <button
                    onClick={() => checkIn(reservation.member.id)}
                    disabled={processingMemberId === reservation.member.id}
                    className="rounded-full bg-[#06C755] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {processingMemberId === reservation.member.id ? '処理中' : '来場済みにする'}
                  </button>
                ) : (
                  <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                    checkedIn ? 'bg-[#06C755]/20 text-[#06C755]' :
                    reservation.status === 'waitlisted' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {checkedIn ? '来場済' : reservation.status === 'waitlisted' ? '待機' : '未着'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
