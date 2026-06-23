'use client';

import { useEffect, useRef, useState } from 'react';
import { api, BlogPost, BlogPostInput } from '@/lib/api';

type Mode = 'list' | 'edit';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const res = await fetch(`/api/upload?filename=blog-${Date.now()}.${ext}`, {
    method: 'POST',
    body: file,
    headers: { 'content-type': file.type },
  });
  if (!res.ok) throw new Error('アップロード失敗');
  const data = await res.json();
  return data.url as string;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogPostInput>({ title: '', body: '', excerpt: '', status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    api.blog.list().then(setPosts).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ title: '', body: '', excerpt: '', status: 'draft' });
    setError('');
    setMode('edit');
  }

  function openEdit(post: BlogPost) {
    setEditing(post);
    setForm({ title: post.title, body: post.body, excerpt: post.excerpt ?? '', status: post.status });
    setError('');
    setMode('edit');
  }

  async function handleSave(publish: boolean) {
    if (!form.title.trim() || !form.body.trim()) { setError('タイトルと本文は必須です'); return; }
    setSaving(true); setError('');
    try {
      const payload: BlogPostInput = { ...form, status: publish ? 'published' : 'draft' };
      if (editing) {
        await api.blog.update(editing.id, payload);
      } else {
        await api.blog.create(payload);
      }
      load();
      setMode('list');
    } catch (err: any) {
      setError(err?.message ?? '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('この記事を削除しますか？')) return;
    try {
      await api.blog.delete(id);
      load();
    } catch { alert('削除に失敗しました'); }
  }

  function handleImageButtonClick() {
    fileInputRef.current?.click();
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImageUploading(true);
    try {
      const url = await uploadImage(file);
      const ta = textareaRef.current;
      if (ta) {
        const start = ta.selectionStart ?? form.body.length;
        const end = ta.selectionEnd ?? start;
        const before = form.body.slice(0, start);
        const after = form.body.slice(end);
        const insert = `\n![](${url})\n`;
        const newBody = before + insert + after;
        setForm((p) => ({ ...p, body: newBody }));
        setTimeout(() => {
          ta.focus();
          const pos = start + insert.length;
          ta.setSelectionRange(pos, pos);
        }, 0);
      } else {
        setForm((p) => ({ ...p, body: p.body + `\n![](${url})\n` }));
      }
    } catch {
      alert('画像のアップロードに失敗しました');
    } finally {
      setImageUploading(false);
    }
  }

  if (mode === 'edit') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <div className="mb-5 flex items-center gap-3">
          <button type="button" onClick={() => setMode('list')} className="text-sm text-gray-500 hover:text-gray-700">
            ← 一覧
          </button>
          <h1 className="text-xl font-bold text-gray-900">{editing ? '記事を編集' : '新しい記事'}</h1>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">タイトル</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="記事のタイトル"
              maxLength={160}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">概要（任意）</label>
            <input
              value={form.excerpt ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
              placeholder="検索エンジン・一覧に表示される説明文"
              maxLength={300}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700">本文</label>
              <button
                type="button"
                onClick={handleImageButtonClick}
                disabled={imageUploading}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {imageUploading ? 'アップロード中...' : '📷 画像を挿入'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />
            <textarea
              ref={textareaRef}
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              placeholder="活動の様子やお知らせを書いてください..."
              rows={18}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm leading-7 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              下書き保存
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="rounded-lg bg-[#06C755] px-5 py-2 text-sm font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
            >
              {saving ? '保存中...' : '公開する'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ブログ</h1>
          <p className="mt-1 text-xs text-gray-500">公開した記事は公開サイトとSEOに反映されます</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white hover:bg-[#05a847]"
        >
          新規作成
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">読み込み中...</p>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm font-bold text-gray-400">まだ記事がありません</p>
          <p className="mt-1 text-xs text-gray-400">「新規作成」から最初の記事を書いてみましょう</p>
          <button type="button" onClick={openNew} className="mt-4 rounded-lg bg-[#06C755] px-5 py-2 text-sm font-bold text-white hover:bg-[#05a847]">
            記事を書く
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div key={post.id} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {post.status === 'published' ? '公開中' : '下書き'}
                  </span>
                  <span className="text-[11px] text-gray-400">{formatDate(post.publishedAt ?? post.createdAt)}</span>
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">{post.title}</p>
                {post.excerpt && <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{post.excerpt}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => openEdit(post)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50">
                  編集
                </button>
                <button type="button" onClick={() => handleDelete(post.id)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-100">
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
