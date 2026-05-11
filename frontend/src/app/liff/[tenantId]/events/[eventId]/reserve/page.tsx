'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, LiffEvent } from '@/lib/api';

const GRADES = ['高校1年', '高校2年', '高校3年', '大学1年', '大学2年', '大学3年', '大学4年', '大学院生', '社会人', 'その他'];
const GENDERS = ['男性', '女性', 'その他・回答しない'];

export default function ReservePage() {
  const { tenantId, eventId } = useParams<{ tenantId: string; eventId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isWaitlist = searchParams.get('waitlist') === '1';

  const [event, setEvent] = useState<LiffEvent | null>(null);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<LiffEvent>(`/liff/${tenantId}/events/${eventId}`).then(setEvent).catch(console.error);
  }, [tenantId, eventId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await apiFetch<{ id: string; status: string; waitlistOrder: number | null }>(
        `/liff/${tenantId}/reservations`,
        {
          method: 'POST',
          body: JSON.stringify({
            eventId,
            lineUserId: `demo-user-${Date.now()}`,
            name,
            grade,
            gender,
          }),
        },
      );
      router.push(`/liff/${tenantId}/events/${eventId}/done?status=${result.status}&order=${result.waitlistOrder ?? ''}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-600 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/80 hover:text-white">←</button>
        <h1 className="text-lg font-bold">{isWaitlist ? 'キャンセル待ち登録' : '予約フォーム'}</h1>
      </div>

      <div className="px-4 py-6">
        {event && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 text-sm text-indigo-800">
            <p className="font-semibold">{event.title}</p>
            <p className="mt-0.5 text-indigo-600">{event.location}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">お名前 <span className="text-red-500">*</span></label>
            <input
              required minLength={1} maxLength={50}
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="山田太郎"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学年 <span className="text-red-500">*</span></label>
            <select
              required value={grade} onChange={(e) => setGrade(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">選択してください</option>
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">性別 <span className="text-red-500">*</span></label>
            <div className="flex gap-3">
              {GENDERS.map((g) => (
                <label key={g} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" name="gender" value={g} required checked={gender === g} onChange={() => setGender(g)} />
                  {g}
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit" disabled={submitting}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium disabled:opacity-50 active:bg-indigo-700 transition-colors"
            >
              {submitting ? '送信中...' : isWaitlist ? 'キャンセル待ちに登録する' : '予約を確定する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
