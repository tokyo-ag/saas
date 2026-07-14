'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, OfficialArticleInput } from '@/lib/api';
import ArticleForm from '../ArticleForm';

export default function NewArticlePage() {
  const router = useRouter();

  async function handleSubmit(data: OfficialArticleInput) {
    const created = await api.superadmin.createOfficialArticle(data);
    router.push(`/superadmin/articles/${created.id}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FA] lg:h-screen">
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex items-center gap-3">
          <Link href="/superadmin/articles" className="text-gray-400 hover:text-gray-600 text-sm">← 戻る</Link>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">新規記事を作成</h1>
        </div>
      </div>

      <div className="lg:min-h-0 lg:flex-1">
        <ArticleForm onSubmit={handleSubmit} submitLabel="作成する" />
      </div>
    </div>
  );
}
