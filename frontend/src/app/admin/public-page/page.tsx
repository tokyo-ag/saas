'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, PublicPage, PublicPageInput, Tenant } from '@/lib/api';
import { SITE_URL } from '@/lib/config';
import { SaveToast } from '@/components/ui/SaveToast';

const emptyForm: PublicPageInput = {
  title: '',
  slug: '',
  body: '',
  coverImageUrl: '',
  seoTitle: '',
  seoDescription: '',
  status: 'draft',
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export default function AdminPublicPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [pages, setPages] = useState<PublicPage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<PublicPageInput>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const selected = pages.find((page) => page.id === selectedId) ?? null;
  const tenantCode = tenant?.code ?? tenant?.id ?? '';
  const previewUrl = tenantCode && form.slug
    ? `${SITE_URL}/clubs/${tenantCode}/${form.slug}`
    : '';

  const publishedPages = useMemo(
    () => pages.filter((page) => page.status === 'published').length,
    [pages],
  );

  useEffect(() => {
    Promise.all([api.tenant.get(), api.publicPages.list()])
      .then(([tenantData, pageData]) => {
        setTenant(tenantData);
        setPages(pageData);
        const first = pageData[0];
        if (first) {
          setSelectedId(first.id);
          setForm({
            title: first.title,
            slug: first.slug,
            body: first.body,
            coverImageUrl: first.coverImageUrl ?? '',
            seoTitle: first.seoTitle ?? '',
            seoDescription: first.seoDescription ?? '',
            status: first.status,
          });
        }
      })
      .catch((err: any) => setError(err?.message ?? '読み込みに失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  function selectPage(page: PublicPage) {
    setSelectedId(page.id);
    setForm({
      title: page.title,
      slug: page.slug,
      body: page.body,
      coverImageUrl: page.coverImageUrl ?? '',
      seoTitle: page.seoTitle ?? '',
      seoDescription: page.seoDescription ?? '',
      status: page.status,
    });
    setError('');
  }

  function newPage() {
    setSelectedId(null);
    setForm(emptyForm);
    setError('');
  }

  function updateTitle(title: string) {
    setForm((prev) => ({
      ...prev,
      title,
      slug: selectedId || prev.slug ? prev.slug : slugify(title),
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);

    const payload: PublicPageInput = {
      ...form,
      slug: slugify(form.slug || form.title),
      coverImageUrl: form.coverImageUrl?.trim(),
      seoTitle: form.seoTitle?.trim(),
      seoDescription: form.seoDescription?.trim(),
    };

    try {
      const page = selectedId
        ? await api.publicPages.update(selectedId, payload)
        : await api.publicPages.create(payload);
      setPages((prev) => {
        const exists = prev.some((item) => item.id === page.id);
        return exists
          ? prev.map((item) => (item.id === page.id ? page : item))
          : [page, ...prev];
      });
      setSelectedId(page.id);
      setForm({
        title: page.title,
        slug: page.slug,
        body: page.body,
        coverImageUrl: page.coverImageUrl ?? '',
        seoTitle: page.seoTitle ?? '',
        seoDescription: page.seoDescription ?? '',
        status: page.status,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message ?? '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function deletePage() {
    if (!selectedId || !selected) return;
    if (!window.confirm(`「${selected.title}」を削除しますか？`)) return;
    setSaving(true);
    setError('');
    try {
      await api.publicPages.delete(selectedId);
      const nextPages = pages.filter((page) => page.id !== selectedId);
      setPages(nextPages);
      const next = nextPages[0];
      if (next) selectPage(next);
      else newPage();
    } catch (err: any) {
      setError(err?.message ?? '削除に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="px-4 py-12 text-center text-sm text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEOページCMS</h1>
          <p className="mt-2 text-sm text-gray-500">
            COMIU配下に公開される集客ページを作成・編集できます。
          </p>
        </div>
        <button
          type="button"
          onClick={newPage}
          className="rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white hover:bg-[#05a847]"
        >
          新規ページ
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <SaveToast show={saved} />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">ページ一覧</p>
            <span className="text-xs text-gray-400">{publishedPages}/{pages.length} 公開</span>
          </div>
          {pages.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-3 py-8 text-center text-sm text-gray-400">
              まだページがありません
            </p>
          ) : (
            <div className="space-y-2">
              {pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => selectPage(page)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                    selectedId === page.id
                      ? 'border-[#06C755] bg-green-50'
                      : 'border-gray-100 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-bold text-gray-900">{page.title}</p>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-bold ${
                      page.status === 'published'
                        ? 'bg-[#06C755]/10 text-[#06C755]'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {page.status === 'published' ? '公開' : '下書き'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-400">/{page.slug}</p>
                </button>
              ))}
            </div>
          )}
        </aside>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">{selectedId ? 'ページ編集' : '新規ページ作成'}</p>
              {previewUrl && (
                <Link
                  href={previewUrl}
                  target="_blank"
                  className="mt-1 block break-all text-xs text-[#06C755] hover:underline"
                >
                  {previewUrl}
                </Link>
              )}
            </div>
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as PublicPageInput['status'] }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            >
              <option value="draft">下書き</option>
              <option value="published">公開</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">タイトル</label>
              <input
                required
                maxLength={120}
                value={form.title}
                onChange={(e) => updateTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">URL slug</label>
              <input
                required
                maxLength={80}
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                placeholder="welcome"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">本文</label>
            <textarea
              required
              rows={14}
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              placeholder={'## 見出し\n本文を入力してください。\n- 箇条書きも使えます'}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">カバー画像URL</label>
            <input
              value={form.coverImageUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">SEOタイトル</label>
              <input
                maxLength={160}
                value={form.seoTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, seoTitle: e.target.value }))}
                placeholder="未入力ならタイトルを使用"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">SEO説明文</label>
              <input
                maxLength={300}
                value={form.seoDescription}
                onChange={(e) => setForm((prev) => ({ ...prev, seoDescription: e.target.value }))}
                placeholder="検索結果やOGPに使う説明"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={deletePage}
              disabled={!selectedId || saving}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 disabled:cursor-default disabled:opacity-40"
            >
              削除
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#06C755] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
