'use client';

import { useEffect, useRef, useState } from 'react';
import { api, BlogPost, BlogPostInput } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { imgUrl } from '@/lib/imgUrl';

type TextBlock = { type: 'text'; content: string };
type ImageBlock = { type: 'image'; url: string };
type Block = TextBlock | ImageBlock;
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

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const ANY_IMAGE_RE = /!\[[^\]]*]\(([^)]+)\)/;

function firstBlogImage(body: string | null | undefined) {
  return body?.match(ANY_IMAGE_RE)?.[1] ?? null;
}

function bodyToBlocks(body: string): Block[] {
  const result: Block[] = [];
  let textLines: string[] = [];
  for (const line of body.split('\n')) {
    const m = IMAGE_RE.exec(line.trim());
    if (m) {
      result.push({ type: 'text', content: textLines.join('\n') });
      textLines = [];
      result.push({ type: 'image', url: m[2] });
    } else {
      textLines.push(line);
    }
  }
  result.push({ type: 'text', content: textLines.join('\n') });
  const filtered = result.filter((b, i) => b.type === 'image' || b.content !== '' || i === 0);
  return filtered.length > 0 ? filtered : [{ type: 'text', content: '' }];
}

function blocksToBody(blocks: Block[]): string {
  return blocks.map((b) => (b.type === 'image' ? `![](${b.url})` : b.content)).join('\n');
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogPostInput>({ title: '', body: '', excerpt: '', status: 'draft' });
  const [blocks, setBlocks] = useState<Block[]>([{ type: 'text', content: '' }]);
  const [activeBlockIdx, setActiveBlockIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    api.blog.list().then(setPosts).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ title: '', body: '', excerpt: '', status: 'draft' });
    setBlocks([{ type: 'text', content: '' }]);
    setActiveBlockIdx(0);
    setError('');
    setMode('edit');
  }

  function openEdit(post: BlogPost) {
    setEditing(post);
    setForm({ title: post.title, body: post.body, excerpt: post.excerpt ?? '', status: post.status });
    setBlocks(bodyToBlocks(post.body));
    setActiveBlockIdx(0);
    setError('');
    setMode('edit');
  }

  async function handleSave(publish: boolean) {
    const body = blocksToBody(blocks);
    if (!form.title.trim() || !body.replace(/\n/g, '').trim()) {
      setError('タイトルと本文は必須です'); return;
    }
    setSaving(true); setError('');
    try {
      const payload: BlogPostInput = { ...form, body, status: publish ? 'published' : 'draft' };
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

  async function handleImageFile(file: File) {
    setImageUploading(true);
    try {
      const url = await uploadImage(file);
      setBlocks((prev) => {
        const insertAt = activeBlockIdx + 1;
        const next = [...prev];
        next.splice(insertAt, 0, { type: 'image', url });
        // ensure there's a text block after the image
        if (insertAt + 1 >= next.length || next[insertAt + 1].type === 'image') {
          next.splice(insertAt + 1, 0, { type: 'text', content: '' });
        }
        return next;
      });
      setActiveBlockIdx((i) => i + 2);
    } catch {
      alert('画像のアップロードに失敗しました');
    } finally {
      setImageUploading(false);
    }
  }

  function removeImage(idx: number) {
    setBlocks((prev) => {
      const next = [...prev];
      const before = prev[idx - 1] as TextBlock | undefined;
      const after = prev[idx + 1] as TextBlock | undefined;
      if (before?.type === 'text' && after?.type === 'text') {
        const merged: TextBlock = {
          type: 'text',
          content: [before.content, after.content].filter(Boolean).join('\n'),
        };
        next.splice(idx - 1, 3, merged);
      } else {
        next.splice(idx, 1);
      }
      return next.length > 0 ? next : [{ type: 'text', content: '' }];
    });
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

          {/* Block editor */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700">本文</label>
              <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 hover:bg-gray-50 ${imageUploading ? 'pointer-events-none opacity-50' : ''}`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={imageUploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageFile(f); e.currentTarget.value = ''; }}
                />
                {imageUploading ? (
                  <><span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />アップロード中</>
                ) : (
                  <><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 5.5 2-3.5 3 6z" clipRule="evenodd" /></svg>画像を追加</>
                )}
              </label>
            </div>

            <div className="space-y-1 rounded-xl border border-[#06C755] p-1">
              {blocks.map((block, i) =>
                block.type === 'image' ? (
                  <div key={i} className="group relative overflow-hidden rounded-lg">
                    <img src={block.url} alt="" className="w-full max-h-72 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute right-2 top-2 hidden h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white group-hover:flex hover:bg-black/80"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <textarea
                    key={i}
                    value={block.content}
                    onChange={(e) => setBlocks((prev) => prev.map((b, idx) => idx === i ? { ...b, content: e.target.value } : b))}
                    onFocus={() => setActiveBlockIdx(i)}
                    placeholder={blocks.filter(b => b.type === 'text').indexOf(block as TextBlock) === 0 ? '活動の様子やお知らせを書いてください...' : '続きを入力...'}
                    rows={Math.max(3, (block.content.split('\n').length || 1) + 1)}
                    className="w-full resize-none rounded-lg bg-transparent px-3 py-2 text-sm leading-7 text-gray-800 outline-none placeholder:text-gray-300 focus:bg-gray-50/60"
                  />
                )
              )}
            </div>
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
              {(() => {
                const image = imgUrl(post.coverImageUrl ?? firstBlogImage(post.body), API_URL);
                return image ? (
                  <img src={image} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] font-bold text-gray-300">
                    NO IMAGE
                  </div>
                );
              })()}
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
