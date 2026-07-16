'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, OfficialArticle } from '@/lib/api';

const ACTIVITY_CATEGORIES = ['交流会', 'バドミントン', 'フットサル', 'バスケ', 'バレー'];
const TYPE_CATEGORIES = ['インカレサークル', '学生団体', 'イベント団体', '社会人サークル'];
const KNOWN_CATEGORIES = [...ACTIVITY_CATEGORIES, ...TYPE_CATEGORIES];
const DELETE_PASSPHRASE = 'comiu.link';

type PendingDelete = { type: 'single'; article: OfficialArticle } | { type: 'bulk'; count: number };

export default function SuperadminArticlesPage() {
  const [articles, setArticles] = useState<OfficialArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('すべて');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [passphraseInput, setPassphraseInput] = useState('');

  function load() {
    setLoading(true);
    api.superadmin.officialArticles().then(setArticles).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function closeDeleteModal() {
    setPendingDelete(null);
    setPassphraseInput('');
  }

  async function confirmDelete() {
    if (!pendingDelete || passphraseInput !== DELETE_PASSPHRASE) return;
    setDeleting(true);
    try {
      if (pendingDelete.type === 'single') {
        await api.superadmin.deleteOfficialArticle(pendingDelete.article.id);
      } else {
        for (const id of selected) {
          await api.superadmin.deleteOfficialArticle(id);
        }
        setSelected(new Set());
      }
      load();
    } finally {
      setDeleting(false);
      closeDeleteModal();
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/superadmin" className="text-gray-400 hover:text-gray-600 text-sm">← 戻る</Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">記事管理（ガイド）</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">comiu.link/guide に掲載するSEO記事</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/superadmin/articles/area-hubs"
              className="border border-gray-300 text-gray-600 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              地域×カテゴリ一覧
            </Link>
            <Link
              href="/superadmin/articles/new"
              className="bg-[#06C755] text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#05a847] transition-colors"
            >
              ＋ 新規記事
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
        {(() => {
          const otherCategories = Array.from(
            new Set(
              articles
                .map((a) => a.category)
                .filter((c): c is string => !!c && !KNOWN_CATEGORIES.includes(c)),
            ),
          );
          const hasUncategorized = articles.some((a) => !a.category);
          const tabs = ['すべて', ...ACTIVITY_CATEGORIES, ...TYPE_CATEGORIES, ...otherCategories, ...(hasUncategorized ? ['未分類'] : [])];
          const shown = articles.filter((a) => {
            if (tab === 'すべて') return true;
            if (tab === '未分類') return !a.category;
            return a.category === tab;
          });
          return (
            <>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {tabs.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      tab === t ? 'bg-[#06C755] text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {shown.length > 0 && (
                <div className="flex items-center gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setSelected(new Set(shown.map((a) => a.id)))}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    このタブを全選択
                  </button>
                  {selected.size > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelected(new Set())}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        選択解除
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ type: 'bulk', count: selected.size })}
                        disabled={deleting}
                        className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-full px-3 py-1.5 ml-auto"
                      >
                        {deleting ? '削除中...' : `選択した${selected.size}件を削除`}
                      </button>
                    </>
                  )}
                </div>
              )}
              {loading ? (
                <p className="text-gray-400 text-sm">読み込み中...</p>
              ) : shown.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                  {articles.length === 0 ? '記事がありません。「＋ 新規記事」から作成してください。' : 'このカテゴリの記事はありません。'}
                </div>
              ) : (
                <div className="space-y-3">
                  {shown.map((a) => {
                    const isSelected = selected.has(a.id);
                    return (
                    <div
                      key={a.id}
                      onClick={() => toggleSelected(a.id)}
                      className={`cursor-pointer rounded-xl border shadow-sm p-4 sm:p-5 transition ${
                        isSelected ? 'border-[#06C755] bg-[#06C755]/5 ring-1 ring-[#06C755]' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            {isSelected && <span className="text-[#06C755] text-xs font-bold">✓ 選択中</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === 'published' ? 'bg-[#06C755]/10 text-[#06C755]' : 'bg-gray-100 text-gray-500'}`}>
                              {a.status === 'published' ? '公開中' : '下書き'}
                            </span>
                            {a.category && <span className="text-xs text-gray-400">{a.category}</span>}
                          </div>
                          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{a.title}</p>
                          <p className="text-xs font-mono text-gray-400 mt-0.5 truncate">/guide/{a.slug}</p>
                          {a.targetKeyword && <p className="text-xs text-gray-400 mt-1">狙うKW: {a.targetKeyword}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {a.status === 'published' && (
                          <a href={`/guide/${a.slug}`} target="_blank" rel="noreferrer" className="text-sm text-[#06C755] hover:underline">記事を見る →</a>
                        )}
                        <Link href={`/superadmin/articles/${a.id}`} className="text-sm text-gray-600 hover:underline">編集</Link>
                        <button onClick={() => setPendingDelete({ type: 'single', article: a })} className="text-sm text-red-500 hover:underline">削除</button>
                        <span className="text-xs text-gray-300 ml-auto">更新: {new Date(a.updatedAt).toLocaleDateString('ja-JP')}</span>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={closeDeleteModal}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-gray-900">
              {pendingDelete.type === 'single' ? `「${pendingDelete.article.title}」を削除しますか？` : `選択した${pendingDelete.count}件を削除しますか？`}
            </p>
            <p className="mt-2 text-sm text-gray-500">この操作は取り消せません。続けるには合言葉「{DELETE_PASSPHRASE}」を入力してください。</p>
            <input
              autoFocus
              value={passphraseInput}
              onChange={(e) => setPassphraseInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && passphraseInput === DELETE_PASSPHRASE) confirmDelete(); }}
              placeholder={DELETE_PASSPHRASE}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={closeDeleteModal} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={passphraseInput !== DELETE_PASSPHRASE || deleting}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-40"
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
