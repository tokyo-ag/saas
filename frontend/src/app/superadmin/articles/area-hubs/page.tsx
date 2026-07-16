'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, AreaHubSummaryRow } from '@/lib/api';
import { SITE_URL } from '@/lib/config';

export default function AreaHubSummaryPage() {
  const [rows, setRows] = useState<AreaHubSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.superadmin.areaHubSummary().then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/superadmin/articles" className="text-gray-400 hover:text-gray-600 text-sm">← 戻る</Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">地域×カテゴリ ハブページ一覧</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              /guide/tag/[カテゴリ]?area=... は記事として保存されていない自動生成ページです。実際にデータがある組み合わせだけをここに一覧表示します（閲覧のみ・編集不可）。
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
        {loading ? (
          <p className="text-gray-400 text-sm">読み込み中...</p>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            団体・記事・イベントのいずれにも地域タグの一致がありません。
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-bold text-gray-500">
                  <th className="px-4 py-2.5">カテゴリ</th>
                  <th className="px-4 py-2.5">地域</th>
                  <th className="px-4 py-2.5 text-right">団体</th>
                  <th className="px-4 py-2.5 text-right">記事</th>
                  <th className="px-4 py-2.5 text-right">イベント</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.category}-${row.area}`} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.category}</td>
                    <td className="px-4 py-3 text-gray-700">{row.area}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.circleCount}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.articleCount}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.eventCount}</td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`${SITE_URL}/guide/tag/${encodeURIComponent(row.category)}?area=${encodeURIComponent(row.area)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#06C755] hover:underline"
                      >
                        開く →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
