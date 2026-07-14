'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, OfficialArticle } from '@/lib/api';

const ACTIVITY_CATEGORIES = ['交流会', 'バドミントン', 'フットサル', 'バスケ', 'バレー'];
const TYPE_CATEGORIES = ['インカレサークル', '学生団体', 'イベント団体', '社会人サークル'];
const KNOWN_CATEGORIES = [...ACTIVITY_CATEGORIES, ...TYPE_CATEGORIES];

export default function SuperadminArticlesPage() {
  const [articles, setArticles] = useState<OfficialArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('すべて');

  function load() {
    setLoading(true);
    api.superadmin.officialArticles().then(setArticles).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(a: OfficialArticle) {
    if (!confirm(`「${a.title}」を削除しますか？この操作は取り消せません。`)) return;
    await api.superadmin.deleteOfficialArticle(a.id);
    load();
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
          <Link
            href="/superadmin/articles/new"
            className="bg-[#06C755] text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#05a847] transition-colors shrink-0"
          >
            ＋ 新規記事
          </Link>
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
              {loading ? (
                <p className="text-gray-400 text-sm">読み込み中...</p>
              ) : shown.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                  {articles.length === 0 ? '記事がありません。「＋ 新規記事」から作成してください。' : 'このカテゴリの記事はありません。'}
                </div>
              ) : (
                <div className="space-y-3">
                  {shown.map((a) => (
                    <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
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
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap">
                        {a.status === 'published' && (
                          <a href={`/guide/${a.slug}`} target="_blank" rel="noreferrer" className="text-sm text-[#06C755] hover:underline">記事を見る →</a>
                        )}
                        <Link href={`/superadmin/articles/${a.id}`} className="text-sm text-gray-600 hover:underline">編集</Link>
                        <button onClick={() => handleDelete(a)} className="text-sm text-red-500 hover:underline">削除</button>
                        <span className="text-xs text-gray-300 ml-auto">更新: {new Date(a.updatedAt).toLocaleDateString('ja-JP')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
