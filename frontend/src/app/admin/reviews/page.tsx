'use client';

import { useEffect, useState } from 'react';
import { api, AdminTenantReview, formatDate } from '@/lib/api';
import { SITE_URL } from '@/lib/config';
import { TenantSeoTextSection } from '@/components/admin/TenantSeoTextSection';

function TenantReviewSection({
  rows,
  loading,
  error,
  onDelete,
}: {
  rows: AdminTenantReview[];
  loading: boolean;
  error: string;
  onDelete: (row: AdminTenantReview) => void;
}) {
  return (
    <div className="mb-8">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-gray-800">サイト全体の口コミ</h2>
        <p className="mt-1 text-xs text-gray-400">LINE連携済みのメンバーが投稿すると、自動で公開サイトの「口コミ」セクションに表示されます。不適切な投稿は削除してください。</p>
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
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{row.content}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
                    <span>{row.member.name ?? '未入力'}</span>
                    {row.member.grade && <span>{row.member.grade}</span>}
                    <span>{formatDate(row.createdAt)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewsSeoPreview({
  previewUrl,
  iframeKey,
  onReload,
}: {
  previewUrl: string;
  iframeKey: number;
  onReload: () => void;
}) {
  if (!previewUrl) return null;
  return (
    <aside className="hidden shrink-0 lg:block">
      <div className="sticky top-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-gray-400">🔍 SEOページはこう見えます</p>
          <button
            type="button"
            onClick={onReload}
            className="text-[10px] text-gray-400 hover:text-gray-600 underline"
          >
            再読込
          </button>
        </div>
        <div className="overflow-hidden rounded-[2.5rem] border-[6px] border-gray-800 bg-white shadow-2xl" style={{ width: '220px' }}>
          <div className="flex items-center justify-center gap-2 bg-gray-800 py-2">
            <div className="h-1.5 w-12 rounded-full bg-gray-600" />
          </div>
          <iframe
            key={iframeKey}
            src={previewUrl}
            width="375"
            height="667"
            style={{ zoom: 0.587, border: 'none', display: 'block' }}
            title="SEOページプレビュー"
          />
        </div>
      </div>
    </aside>
  );
}

export default function AdminReviewsPage() {
  const [rows, setRows] = useState<AdminTenantReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [seoDescription, setSeoDescription] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    let active = true;
    api.tenant.reviews()
      .then((data) => { if (active) setRows(data); })
      .catch((err) => { if (active) setError(err?.message ?? 'サイト全体の口コミの読み込みに失敗しました'); })
      .finally(() => { if (active) setLoading(false); });
    api.tenant.get().then((t) => {
      if (!active) return;
      setTenantCode(t.code ?? t.id);
      setSeoDescription(t.reviewsSeoDescription ?? '');
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const publicReviewsUrl = tenantCode ? `${SITE_URL}/clubs/${tenantCode}/reviews` : '';

  function copyPublicReviewsUrl() {
    if (!publicReviewsUrl) return;
    navigator.clipboard.writeText(publicReviewsUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleDelete(row: AdminTenantReview) {
    if (!confirm('この口コミを削除しますか？元に戻せません。')) return;
    try {
      await api.tenant.deleteReview(row.id);
      setRows((prev) => prev.filter((item) => item.id !== row.id));
    } catch {
      setError('口コミの削除に失敗しました');
    }
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">口コミ</h1>
      </div>

      {publicReviewsUrl && (
        <div className="mb-6 max-w-3xl rounded-xl border border-gray-200 bg-gray-50 p-4 md:p-5">
          <p className="mb-3 text-xs font-medium text-gray-700">公開用の口コミURL（LINEログイン不要・SEO対象）</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs font-mono text-gray-600">
              {publicReviewsUrl}
            </span>
            <button
              type="button"
              onClick={copyPublicReviewsUrl}
              className="shrink-0 rounded-lg bg-gray-700 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800"
            >
              {copied ? 'コピー済み ✓' : 'コピー'}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500 leading-relaxed">
            公開中の口コミだけをまとめた専用ページです。「団体名 + 評判」「団体名 + 口コミ」などの検索でも見つけてもらえるよう、SEOにも対応しています。
          </p>
        </div>
      )}

      {seoDescription !== null && (
        <TenantSeoTextSection
          field="reviewsSeoDescription"
          title="口コミページのSEO文言"
          helpText="公開用の口コミページの見出し下とmeta descriptionに使われます。空欄の場合は団体の紹介文が使われます。「評判」「口コミ」で検索して不安を持っている人に向けて、団体の雰囲気や安心して参加できる理由を書くのがおすすめです。"
          placeholder="例：飲み会中心の雰囲気ではなく、初参加や1人参加の方でも安心して楽しめるサークルです。"
          initialValue={seoDescription}
          onSaved={(value) => { setSeoDescription(value); setIframeKey((k) => k + 1); }}
        />
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <TenantReviewSection
            rows={rows}
            loading={loading}
            error={error}
            onDelete={handleDelete}
          />
        </div>
        <ReviewsSeoPreview
          previewUrl={tenantCode ? `/clubs/${tenantCode}/reviews` : ''}
          iframeKey={iframeKey}
          onReload={() => setIframeKey((k) => k + 1)}
        />
      </div>
    </div>
  );
}
