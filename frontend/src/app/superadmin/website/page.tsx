'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, OfficialArticle, OfficialArticleInput, OfficialSiteInput, OfficialSiteSettings } from '@/lib/api';
import { getToken } from '@/lib/auth';

type ArticleForm = OfficialArticleInput & { id?: string };

const emptySite: OfficialSiteSettings = {
  status: 'published',
  heroTitle: 'サークル・イベント運営をLINEでかんたんに',
  heroLead: 'COMIUは、予約管理・参加者名簿・リマインド・問い合わせ対応をまとめて管理できる主催者向けWEBサービスです。',
  primaryCtaLabel: '無料ではじめる',
  primaryCtaHref: '/register',
  secondaryCtaLabel: '相談する',
  secondaryCtaHref: '/contact',
  seoTitle: '',
  seoDescription: '',
  updatedAt: '',
};

const emptyArticle: ArticleForm = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  category: 'サークル運営',
  targetKeyword: '',
  ctaLabel: '無料ではじめる',
  ctaHref: '/register',
  ogImageUrl: '',
  status: 'draft',
};

async function revalidateOfficialSite(slug?: string) {
  const token = getToken();
  await fetch('/api/revalidate-official-site', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ slug }),
  }).catch(() => null);
}

export default function SuperadminWebsitePage() {
  const [site, setSite] = useState<OfficialSiteSettings>(emptySite);
  const [articles, setArticles] = useState<OfficialArticle[]>([]);
  const [article, setArticle] = useState<ArticleForm>(emptyArticle);
  const [loading, setLoading] = useState(true);
  const [savingSite, setSavingSite] = useState(false);
  const [savingArticle, setSavingArticle] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    Promise.all([api.superadmin.officialSite(), api.superadmin.officialArticles()])
      .then(([siteData, articleData]) => {
        setSite(siteData);
        setArticles(articleData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function showSaved(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(''), 2200);
  }

  async function saveSite(e: React.FormEvent) {
    e.preventDefault();
    setSavingSite(true);
    setError('');
    try {
      const payload: OfficialSiteInput = {
        status: site.status,
        heroTitle: site.heroTitle,
        heroLead: site.heroLead,
        primaryCtaLabel: site.primaryCtaLabel,
        primaryCtaHref: site.primaryCtaHref,
        secondaryCtaLabel: site.secondaryCtaLabel,
        secondaryCtaHref: site.secondaryCtaHref,
        seoTitle: site.seoTitle ?? '',
        seoDescription: site.seoDescription ?? '',
      };
      const saved = await api.superadmin.updateOfficialSite(payload);
      setSite(saved);
      await revalidateOfficialSite();
      showSaved('WEBサイト設定を保存しました');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSavingSite(false);
    }
  }

  async function saveArticle(e: React.FormEvent) {
    e.preventDefault();
    if (!article.title.trim() || !article.body.trim()) {
      setError('タイトルと本文を入力してください');
      return;
    }
    setSavingArticle(true);
    setError('');
    try {
      const payload: OfficialArticleInput = {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        body: article.body,
        category: article.category,
        targetKeyword: article.targetKeyword,
        ctaLabel: article.ctaLabel,
        ctaHref: article.ctaHref,
        ogImageUrl: article.ogImageUrl,
        status: article.status,
      };
      const saved = article.id
        ? await api.superadmin.updateOfficialArticle(article.id, payload)
        : await api.superadmin.createOfficialArticle(payload);
      setArticle({
        id: saved.id,
        title: saved.title,
        slug: saved.slug,
        excerpt: saved.excerpt ?? '',
        body: saved.body,
        category: saved.category ?? '',
        targetKeyword: saved.targetKeyword ?? '',
        ctaLabel: saved.ctaLabel ?? '',
        ctaHref: saved.ctaHref ?? '',
        ogImageUrl: saved.ogImageUrl ?? '',
        status: saved.status,
      });
      await revalidateOfficialSite(saved.slug);
      load();
      showSaved('記事を保存しました');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSavingArticle(false);
    }
  }

  async function deleteArticle(id: string) {
    if (!confirm('この記事を削除しますか？')) return;
    await api.superadmin.deleteOfficialArticle(id);
    if (article.id === id) setArticle(emptyArticle);
    await revalidateOfficialSite();
    load();
  }

  function editArticle(item: OfficialArticle) {
    setArticle({
      id: item.id,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt ?? '',
      body: item.body,
      category: item.category ?? '',
      targetKeyword: item.targetKeyword ?? '',
      ctaLabel: item.ctaLabel ?? '',
      ctaHref: item.ctaHref ?? '',
      ogImageUrl: item.ogImageUrl ?? '',
      status: item.status,
    });
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-gray-900">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link href="/superadmin" className="text-sm font-bold text-gray-400 hover:text-gray-700">← 管理</Link>
          <div>
            <h1 className="text-lg font-bold">公式WEBサイト</h1>
            <p className="text-xs text-gray-500">COMIUの主催者向けWEBサイトと記事ストックを管理します。</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Link href="/organizers" target="_blank" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">WEBサイト</Link>
            <Link href="/guide" target="_blank" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">記事一覧</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[420px_1fr]">
        <section className="space-y-5">
          <form onSubmit={saveSite} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">WEBサイト設定</h2>
              <select
                value={site.status}
                onChange={(e) => setSite((p) => ({ ...p, status: e.target.value as 'draft' | 'published' }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold"
              >
                <option value="published">公開</option>
                <option value="draft">非公開</option>
              </select>
            </div>

            {loading ? (
              <p className="py-8 text-center text-sm text-gray-400">読み込み中...</p>
            ) : (
              <div className="space-y-4">
                <Field label="メイン見出し">
                  <input value={site.heroTitle} onChange={(e) => setSite((p) => ({ ...p, heroTitle: e.target.value }))} className="input" />
                </Field>
                <Field label="説明文">
                  <textarea value={site.heroLead} onChange={(e) => setSite((p) => ({ ...p, heroLead: e.target.value }))} rows={4} className="input resize-none" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="メインボタン">
                    <input value={site.primaryCtaLabel} onChange={(e) => setSite((p) => ({ ...p, primaryCtaLabel: e.target.value }))} className="input" />
                  </Field>
                  <Field label="リンク">
                    <input value={site.primaryCtaHref} onChange={(e) => setSite((p) => ({ ...p, primaryCtaHref: e.target.value }))} className="input" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="サブボタン">
                    <input value={site.secondaryCtaLabel} onChange={(e) => setSite((p) => ({ ...p, secondaryCtaLabel: e.target.value }))} className="input" />
                  </Field>
                  <Field label="リンク">
                    <input value={site.secondaryCtaHref} onChange={(e) => setSite((p) => ({ ...p, secondaryCtaHref: e.target.value }))} className="input" />
                  </Field>
                </div>
                <Field label="SEOタイトル">
                  <input value={site.seoTitle ?? ''} onChange={(e) => setSite((p) => ({ ...p, seoTitle: e.target.value }))} className="input" />
                </Field>
                <Field label="SEO説明文">
                  <textarea value={site.seoDescription ?? ''} onChange={(e) => setSite((p) => ({ ...p, seoDescription: e.target.value }))} rows={3} className="input resize-none" />
                </Field>
                <button disabled={savingSite} className="w-full rounded-lg bg-[#06C755] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {savingSite ? '保存中...' : 'WEBサイト設定を保存'}
                </button>
              </div>
            )}
          </form>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">記事ストック</h2>
              <button type="button" onClick={() => setArticle(emptyArticle)} className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white">新規</button>
            </div>
            <div className="space-y-2">
              {articles.length === 0 ? (
                <p className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">まだ記事がありません</p>
              ) : articles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => editArticle(item)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition hover:bg-gray-50 ${article.id === item.id ? 'border-[#06C755] bg-[#06C755]/5' : 'border-gray-200 bg-white'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.status === 'published' ? 'bg-[#06C755]/10 text-[#06C755]' : 'bg-gray-100 text-gray-400'}`}>
                      {item.status === 'published' ? '公開' : '下書き'}
                    </span>
                    {item.category && <span className="text-[11px] text-gray-400">{item.category}</span>}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-bold text-gray-900">{item.title}</p>
                  <p className="mt-1 text-xs text-gray-400">/guide/{item.slug}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <form onSubmit={saveArticle} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">記事編集</h2>
                <p className="text-xs text-gray-500">ブログではなく、検索の入口になる記事を丁寧にストックします。</p>
              </div>
              <select
                value={article.status}
                onChange={(e) => setArticle((p) => ({ ...p, status: e.target.value as 'draft' | 'published' }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold"
              >
                <option value="published">公開</option>
                <option value="draft">下書き</option>
              </select>
            </div>

            {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            {message && <p className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-bold text-[#06C755]">{message}</p>}

            <div className="grid gap-4">
              <Field label="タイトル">
                <input value={article.title} onChange={(e) => setArticle((p) => ({ ...p, title: e.target.value }))} className="input" placeholder="例：サークルの新歓集客をLINEで楽にする方法" />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="URLスラッグ">
                  <input value={article.slug ?? ''} onChange={(e) => setArticle((p) => ({ ...p, slug: e.target.value }))} className="input" placeholder="circle-recruiting-line" />
                </Field>
                <Field label="カテゴリ">
                  <input value={article.category ?? ''} onChange={(e) => setArticle((p) => ({ ...p, category: e.target.value }))} className="input" placeholder="サークル運営" />
                </Field>
              </div>
              <Field label="狙う検索キーワード">
                <input value={article.targetKeyword ?? ''} onChange={(e) => setArticle((p) => ({ ...p, targetKeyword: e.target.value }))} className="input" placeholder="サークル 新歓 集客 LINE" />
              </Field>
              <Field label="一覧説明">
                <textarea value={article.excerpt ?? ''} onChange={(e) => setArticle((p) => ({ ...p, excerpt: e.target.value }))} rows={3} className="input resize-none" />
              </Field>
              <Field label="本文">
                <textarea value={article.body} onChange={(e) => setArticle((p) => ({ ...p, body: e.target.value }))} rows={18} className="input resize-y leading-7" placeholder={'## 見出し\n本文を入力してください。\n\n- 箇条書きも使えます'} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="CTA文言">
                  <input value={article.ctaLabel ?? ''} onChange={(e) => setArticle((p) => ({ ...p, ctaLabel: e.target.value }))} className="input" />
                </Field>
                <Field label="CTAリンク">
                  <input value={article.ctaHref ?? ''} onChange={(e) => setArticle((p) => ({ ...p, ctaHref: e.target.value }))} className="input" />
                </Field>
              </div>
              <Field label="OGP画像URL">
                <input value={article.ogImageUrl ?? ''} onChange={(e) => setArticle((p) => ({ ...p, ogImageUrl: e.target.value }))} className="input" placeholder="https://..." />
              </Field>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button disabled={savingArticle} className="rounded-lg bg-[#06C755] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                {savingArticle ? '保存中...' : '記事を保存'}
              </button>
              {article.id && (
                <>
                  <Link href={`/guide/${article.slug}`} target="_blank" className="rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50">公開ページ</Link>
                  <button type="button" onClick={() => deleteArticle(article.id!)} className="rounded-lg bg-red-50 px-5 py-3 text-sm font-bold text-red-500">削除</button>
                </>
              )}
            </div>
          </form>
        </section>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #d1d5db;
          background: #fff;
          padding: 0.75rem 0.875rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: #06c755;
          box-shadow: 0 0 0 3px rgba(6, 199, 85, 0.12);
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-gray-500">{label}</span>
      {children}
    </label>
  );
}
