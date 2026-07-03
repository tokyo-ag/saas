'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, OfficialArticle, OfficialArticleInput } from '@/lib/api';
import ArticleForm from '../ArticleForm';

export default function EditArticlePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<OfficialArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.superadmin.officialArticles()
      .then((list) => {
        const found = list.find((a) => a.id === params.id);
        if (!found) { setNotFound(true); return; }
        setArticle(found);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSubmit(data: OfficialArticleInput) {
    await api.superadmin.updateOfficialArticle(params.id, data);
    router.push('/superadmin/articles');
  }

  async function handleDelete() {
    if (!article || !confirm(`「${article.title}」を削除しますか？この操作は取り消せません。`)) return;
    await api.superadmin.deleteOfficialArticle(article.id);
    router.push('/superadmin/articles');
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/superadmin/articles" className="text-gray-400 hover:text-gray-600 text-sm shrink-0">← 戻る</Link>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">記事を編集</h1>
          </div>
          {article && (
            <button onClick={handleDelete} className="text-sm text-red-500 hover:underline shrink-0">削除</button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
        {loading ? (
          <p className="text-gray-400 text-sm">読み込み中...</p>
        ) : notFound || !article ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            記事が見つかりませんでした。
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-7">
            <ArticleForm initial={article} onSubmit={handleSubmit} submitLabel="保存する" />
          </div>
        )}
      </div>
    </div>
  );
}
