'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, Tenant } from '@/lib/api';
import { SaveToast } from '@/components/ui/SaveToast';

export default function AdminPublicPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [description, setDescription] = useState('');
  const [publicBlogUrl, setPublicBlogUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.tenant.get()
      .then((data) => {
        setTenant(data);
        setDescription(data.description ?? '');
        setPublicBlogUrl(data.publicBlogUrl ?? '');
      })
      .catch(() => {
        setError('団体情報の読み込みに失敗しました');
      });
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api.tenant.update({ description, publicBlogUrl });
      setTenant(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message ?? '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">公開ページ</h1>
        <p className="mt-2 text-sm text-gray-500">公開クラブページに表示される情報を編集します。</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <SaveToast show={saved} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">公開ページ説明</label>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="公開クラブページに表示される説明文を入力してください"
            className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          />
          <p className="mt-2 text-xs text-gray-500">クラブ紹介文として公開ページに表示されます。</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">ブログURL</label>
          <input
            value={publicBlogUrl}
            onChange={(e) => setPublicBlogUrl(e.target.value)}
            placeholder="https://example.com/blog"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          />
          <p className="mt-2 text-xs text-gray-500">公開ページにブログリンクを表示します。</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-[#06C755] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#05a847] disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存する'}
        </button>
      </form>
    </div>
  );
}
