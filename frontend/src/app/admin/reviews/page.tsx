'use client';

import { useEffect, useState } from 'react';
import { api, AdminTenantReview, formatDate } from '@/lib/api';

function TenantReviewSection() {
  const [rows, setRows] = useState<AdminTenantReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api.tenant.reviews()
      .then((data) => { if (active) setRows(data); })
      .catch((err) => { if (active) setError(err?.message ?? 'サイト全体の口コミの読み込みに失敗しました'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function toggleReview(row: AdminTenantReview) {
    const nextPublished = !row.isPublished;
    setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, isPublished: nextPublished } : item)));
    try {
      await api.tenant.updateReview(row.id, { isPublished: nextPublished });
    } catch {
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, isPublished: row.isPublished } : item)));
      setError('公開設定の更新に失敗しました');
    }
  }

  function startEdit(row: AdminTenantReview) {
    setEditingId(row.id);
    setEditContent(row.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent('');
  }

  async function saveEdit(row: AdminTenantReview) {
    const content = editContent.trim();
    if (content.length < 5 || content.length > 300) {
      setError('感想は5文字以上300文字以内で入力してください');
      return;
    }
    setSaving(true);
    try {
      await api.tenant.updateReview(row.id, { content });
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, content } : item)));
      setError('');
      setEditingId(null);
    } catch {
      setError('口コミの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-8">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-gray-800">サイト全体の口コミ</h2>
        <p className="mt-1 text-xs text-gray-400">公開サイトの「口コミ」セクションに表示されます。LINE連携済みのメンバーなら、予約の有無に関わらず投稿できます。</p>
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
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      row.isPublished ? 'bg-green-50 text-[#06C755]' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {row.isPublished ? '公開中' : '非公開'}
                    </span>
                  </div>
                  {editingId === row.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        maxLength={300}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#06C755] focus:outline-none"
                      />
                      <p className="text-right text-[11px] text-gray-400">{editContent.length}/300</p>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{row.content}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
                    <span>{row.member.name ?? '未入力'}</span>
                    {row.member.grade && <span>{row.member.grade}</span>}
                    <span>{formatDate(row.createdAt)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {editingId === row.id ? (
                    <>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveEdit(row)}
                        disabled={saving}
                        className="rounded-lg bg-[#06C755] px-4 py-2 text-xs font-bold text-white hover:bg-[#05a847]"
                      >
                        {saving ? '保存中...' : '保存する'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleReview(row)}
                        className={`rounded-lg px-4 py-2 text-xs font-bold ${
                          row.isPublished
                            ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                            : 'bg-[#06C755] text-white hover:bg-[#05a847]'
                        }`}
                      >
                        {row.isPublished ? '非公開にする' : '公開する'}
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">口コミ</h1>
      </div>

      <TenantReviewSection />
    </div>
  );
}
