'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, AdminEventReview, Event, formatDate } from '@/lib/api';

type ReviewRow = AdminEventReview & {
  event: Event;
};

export default function AdminReviewsPage() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadReviews() {
      setLoading(true);
      setError('');
      try {
        const events = await api.events.list();
        const reviewGroups = await Promise.all(
          events.map(async (event) => {
            const reviews = await api.events.reviews(event.id).catch(() => [] as AdminEventReview[]);
            return reviews.map((review) => ({ ...review, event }));
          }),
        );
        if (!active) return;
        setRows(
          reviewGroups
            .flat()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        );
      } catch (err: any) {
        if (active) setError(err?.message ?? '口コミの読み込みに失敗しました');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReviews();
    return () => {
      active = false;
    };
  }, []);

  async function toggleReview(row: ReviewRow) {
    const nextPublished = !row.isPublished;
    setRows((prev) => prev.map((item) => (
      item.id === row.id ? { ...item, isPublished: nextPublished } : item
    )));
    try {
      await api.events.updateReview(row.event.id, row.id, nextPublished);
    } catch {
      setRows((prev) => prev.map((item) => (
        item.id === row.id ? { ...item, isPublished: row.isPublished } : item
      )));
      setError('公開設定の更新に失敗しました');
    }
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">口コミ</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">読み込み中...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
          まだ口コミはありません
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="divide-y divide-gray-100">
            {rows.map((row) => (
              <article key={row.id} className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between md:p-6">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Link href={`/admin/events/${row.event.id}`} className="text-sm font-bold text-[#06C755] hover:underline">
                      {row.event.title}
                    </Link>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      row.isPublished ? 'bg-green-50 text-[#06C755]' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {row.isPublished ? '公開中' : '非公開'}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{row.content}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
                    <span>{row.member.name ?? '未入力'}</span>
                    {row.member.grade && <span>{row.member.grade}</span>}
                    <span>{formatDate(row.createdAt)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleReview(row)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold ${
                    row.isPublished
                      ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      : 'bg-[#06C755] text-white hover:bg-[#05a847]'
                  }`}
                >
                  {row.isPublished ? '非公開にする' : '公開する'}
                </button>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
