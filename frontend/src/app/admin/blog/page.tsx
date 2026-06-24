'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, BlogPost, BlogPostInput } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { imgUrl } from '@/lib/imgUrl';

type TextBlock = { type: 'text'; content: string };
type ImageBlock = { type: 'image'; url: string };
type Block = TextBlock | ImageBlock;
type Mode = 'list' | 'edit';

type CropSel = { x1: number; y1: number; x2: number; y2: number };

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

function CropModal({
  url,
  onConfirm,
  onClose,
}: {
  url: string;
  onConfirm: (croppedUrl: string) => void;
  onClose: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<CropSel | null>(null);
  const [dragging, setDragging] = useState<{ startX: number; startY: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function toContainerCoords(e: React.MouseEvent) {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    };
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const { x, y } = toContainerCoords(e);
    setDragging({ startX: x, startY: y });
    setSel({ x1: x, y1: y, x2: x, y2: y });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const { x, y } = toContainerCoords(e);
    setSel({ x1: dragging.startX, y1: dragging.startY, x2: x, y2: y });
  }

  function onMouseUp() {
    setDragging(null);
  }

  const selWidth = sel ? Math.abs(sel.x2 - sel.x1) : 0;
  const selHeight = sel ? Math.abs(sel.y2 - sel.y1) : 0;
  const hasSelection = selWidth > 10 && selHeight > 10;

  async function applyCrop() {
    if (!sel || !hasSelection || !imgRef.current || !containerRef.current) return;
    setUploading(true);
    setError('');
    try {
      const img = imgRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const scaleX = img.naturalWidth / rect.width;
      const scaleY = img.naturalHeight / rect.height;

      const cropX = Math.round(Math.min(sel.x1, sel.x2) * scaleX);
      const cropY = Math.round(Math.min(sel.y1, sel.y2) * scaleY);
      const cropW = Math.round(selWidth * scaleX);
      const cropH = Math.round(selHeight * scaleY);

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
      if (!blob) throw new Error('切り取りに失敗しました');
      const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const newUrl = await uploadImage(file);
      onConfirm(newUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '切り取りに失敗しました';
      if (msg.includes('tainted') || msg.includes('cross-origin') || msg.includes('SecurityError')) {
        setError('この画像はセキュリティ制限のため切り取りできません。');
      } else {
        setError(msg);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <p className="text-sm font-bold text-gray-800">切り取り範囲をドラッグで選択</p>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-xl bg-gray-100 cursor-crosshair select-none"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {/* 暗転オーバーレイ */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            <img
              ref={imgRef}
              src={url}
              alt=""
              crossOrigin="anonymous"
              className="block w-full max-h-[60vh] object-contain pointer-events-none select-none"
              draggable={false}
            />
            {sel && hasSelection && (
              <>
                {/* 選択範囲 - 明るく表示 */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: Math.min(sel.x1, sel.x2),
                    top: Math.min(sel.y1, sel.y2),
                    width: selWidth,
                    height: selHeight,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                    border: '2px solid white',
                  }}
                />
                {/* 三分割ガイド線 */}
                {[1, 2].map((n) => (
                  <div key={`h${n}`} className="absolute pointer-events-none bg-white/40"
                    style={{ left: Math.min(sel.x1, sel.x2), top: Math.min(sel.y1, sel.y2) + (selHeight / 3) * n, width: selWidth, height: 1 }} />
                ))}
                {[1, 2].map((n) => (
                  <div key={`v${n}`} className="absolute pointer-events-none bg-white/40"
                    style={{ left: Math.min(sel.x1, sel.x2) + (selWidth / 3) * n, top: Math.min(sel.y1, sel.y2), width: 1, height: selHeight }} />
                ))}
              </>
            )}
          </div>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          {!hasSelection && !error && (
            <p className="mt-2 text-xs text-gray-400">画像上でドラッグして切り取り範囲を選択してください</p>
          )}
          {hasSelection && (
            <p className="mt-2 text-xs text-gray-400">{Math.round(selWidth)} × {Math.round(selHeight)} px（表示サイズ）</p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">
            キャンセル
          </button>
          <button
            type="button"
            onClick={applyCrop}
            disabled={!hasSelection || uploading}
            className="flex items-center gap-2 rounded-lg bg-[#06C755] px-5 py-2 text-sm font-bold text-white hover:bg-[#05a847] disabled:opacity-40"
          >
            {uploading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {uploading ? 'アップロード中...' : '切り取って保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogPostInput>({ title: '', body: '', excerpt: '', tags: [], status: 'draft' });
  const [tagInput, setTagInput] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([{ type: 'text', content: '' }]);
  const [activeBlockIdx, setActiveBlockIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState('');
  const [cropModal, setCropModal] = useState<{ blockIdx: number; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    api.blog.list().then(setPosts).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ title: '', body: '', excerpt: '', tags: [], status: 'draft' });
    setTagInput('');
    setBlocks([{ type: 'text', content: '' }]);
    setActiveBlockIdx(0);
    setError('');
    setMode('edit');
  }

  function openEdit(post: BlogPost) {
    setEditing(post);
    setForm({ title: post.title, body: post.body, excerpt: post.excerpt ?? '', tags: post.tags ?? [], status: post.status });
    setTagInput('');
    setBlocks(bodyToBlocks(post.body));
    setActiveBlockIdx(0);
    setError('');
    setMode('edit');
  }

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || (form.tags ?? []).includes(tag)) return;
    setForm(p => ({ ...p, tags: [...(p.tags ?? []), tag] }));
    setTagInput('');
  }

  function removeTag(tag: string) {
    setForm(p => ({ ...p, tags: (p.tags ?? []).filter(t => t !== tag) }));
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
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
        {cropModal && (
          <CropModal
            url={cropModal.url}
            onConfirm={(newUrl) => {
              setBlocks((prev) =>
                prev.map((b, i) => i === cropModal.blockIdx ? { type: 'image', url: newUrl } : b)
              );
              setCropModal(null);
            }}
            onClose={() => setCropModal(null)}
          />
        )}

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
            <label className="mb-1 block text-sm font-bold text-gray-700">タグ（任意）</label>
            <p className="mb-1.5 text-xs text-gray-400">カテゴリページに表示されます。例：バドミントン・交流会</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(form.tags ?? []).map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[#06C755]/10 px-2.5 py-1 text-xs font-medium text-[#047a35]">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-[#047a35]/60 hover:text-[#047a35] leading-none">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
                placeholder="タグを入力してEnter"
                maxLength={30}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
              <button
                type="button"
                onClick={() => addTag(tagInput)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                追加
              </button>
            </div>
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
                    <img src={block.url} alt="" className="w-full max-h-72 rounded-lg object-contain bg-gray-50" />
                    <div className="absolute right-2 top-2 hidden gap-1.5 group-hover:flex">
                      <button
                        type="button"
                        onClick={() => setCropModal({ blockIdx: i, url: block.url })}
                        className="flex h-7 items-center gap-1 rounded-full bg-black/60 px-2.5 text-xs font-bold text-white hover:bg-black/80"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M5 3a2 2 0 00-2 2v2h2V5h2V3H5zM3 13v2a2 2 0 002 2h2v-2H5v-2H3zM17 5V3h-2v2h-2v2h2a2 2 0 012-2V5h-2V3h2a2 2 0 012 2zm-2 10h-2v2h2a2 2 0 002-2v-2h-2v2z"/>
                        </svg>
                        切り取り
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white hover:bg-black/80"
                      >
                        ✕
                      </button>
                    </div>
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
