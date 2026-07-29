'use client';

import { useEffect, useRef, useState } from 'react';
import { api, BlogPost, BlogPostInput } from '@/lib/api';
import { API_URL, SITE_URL } from '@/lib/config';
import { imgUrl } from '@/lib/imgUrl';
import { getToken } from '@/lib/auth';

type Mode = 'list' | 'edit';

type CropSel = { x1: number; y1: number; x2: number; y2: number };

function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
}

// 句読点が一切なく空白区切りの単語が並んでいるだけの、旧来のキーワード羅列型の
// 概要文を検出する（バックエンド側のlooksLikeKeywordExcerptと同じ判定基準）
function looksLikeKeywordExcerpt(excerpt: string | null | undefined): boolean {
  if (!excerpt) return false;
  if (/[。！？!?]/.test(excerpt)) return false;
  const segments = excerpt.split(/[\s　、,]+/).filter(Boolean);
  return segments.length >= 2;
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

// 記事は「画像1枚（任意）＋文章1本」だけの構成。旧仕様で複数画像が入っていた記事を開いた場合、
// 1枚目だけを画像欄に出し、2枚目以降は文章欄を汚さないようextraImagesとして裏で保持する
// （保存時にそのまま末尾へ書き戻すので、編集し直しても画像が消えることはない）
function parseBody(body: string): { imageUrl: string | null; extraImages: string[]; text: string } {
  const lines = body.split('\n');
  const images: string[] = [];
  const textLines: string[] = [];
  for (const line of lines) {
    const m = IMAGE_RE.exec(line.trim());
    if (m) {
      images.push(m[2]);
    } else {
      textLines.push(line);
    }
  }
  const text = textLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');
  return { imageUrl: images[0] ?? null, extraImages: images.slice(1), text };
}

function buildBody(imageUrl: string | null, text: string, extraImages: string[] = []): string {
  const parts: string[] = [];
  if (imageUrl) parts.push(`![](${imageUrl})`, '');
  parts.push(text);
  for (const url of extraImages) parts.push('', `![](${url})`);
  return parts.join('\n');
}

// ChatGPT/Claude等に記事の下書きを書かせる際、最初に貼り付けてもらう指示文。
// この形式で出力させると、貼り付けるだけでタイトル・概要・見出しが自動で振り分けられる
const AI_DRAFT_PROMPT = `ブログ記事の下書きを書いてもらいたいです。

内容の薄い記事にならないよう、まず先に、記事を具体的にするための質問を5つしてください。
（例：どんな読者に向けた記事か、団体・イベントならではの強み、具体的なエピソードや数字、読んだ後に取ってほしい行動など）
私の回答を踏まえてから、以下のルールを守って記事を書いてください。

・1行目：記事のタイトルだけを書く（記号や「タイトル：」などの接頭辞は付けない）
・1行空けて、2〜3行程度で記事の概要（要約）を書く
・1行空けて、本文を書く
・本文の最初は「## はじめに」で始め、読者の悩みや記事を読むメリットを書く
・本文の最後は「## まとめ」で締めくくり、記事全体の要点を簡潔に振り返る
・本文中で見出しを付けたい場合は「## 見出し」「### 小見出し」のように#を使うか、見出しにしたい行だけを「**見出し**」のように太字にする
・強調したい語句は文中で「**このように**」太字にする
・箇条書きにしたい場合は各行を「- 項目」または「・項目」で始める
・手順など順番が大事なリストは「1. 項目」のように数字で始める
・特に伝えたいポイントや引用は「> 伝えたい内容」のように行頭に>を付ける（強調ボックスとして表示されます）
・よくある質問（Q&A）を書く場合は「Q: 質問文」の次の行に「A: 回答文」を書く。複数ある場合はこれを繰り返す（Q&Aカードとして表示されます）
・注意点やヒントを目立たせたい場合は「!伝えたい内容」のように行頭に!を付ける（黄色の吹き出しボックスとして表示されます）
・料金プランや比較表を書きたい場合はMarkdown表記法（「| 項目 | 内容 |」の見出し行、次に「|---|---|」、続けてデータ行）を使う（表として表示されます）
・大きく話題を切り替える箇所には「---」だけの行を入れて区切り線にする
・公式LINEの追加を促したい場合は、そのURLだけを1行にして書く（自動でボタンとして表示されます）
・当日のタイムスケジュールを書く場合は、各行を「内容の説明19:00」のように末尾に時刻（H:MM形式）を付けて書く（タイムライン形式で表示されます）
・絵文字や記号の羅列など、装飾的な表現は使わない
・1つの段落は2〜4文でまとめる。1文ごとに改行するのではなく、同じ話題の文はまとめて1つの段落にし、話題が変わるところだけ空行で段落を分ける
・他の団体の記事と内容が似通わないよう、この団体・イベントならではの固有名詞、実際のエピソード、具体的な数字を必ず盛り込み、どこにでも当てはまるような一般論だけの文章にしない`;

// AIに書かせた原稿をそのまま貼り付けられるように、1行目=タイトル、
// 続く段落=概要、それ以降=本文（見出しは #/##/### や **太字** のまま残す）として分割する
function parseAiDraft(raw: string): { title: string; excerpt: string; body: string } {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  const titleLine = (lines[i] ?? '').trim().replace(/^#{1,6}\s+/, '').replace(/^\*\*([^*]+)\*\*$/, '$1');
  i++;
  while (i < lines.length && lines[i].trim() === '') i++;

  const excerptLines: string[] = [];
  while (i < lines.length && lines[i].trim() !== '') {
    excerptLines.push(lines[i].trim());
    i++;
  }
  while (i < lines.length && lines[i].trim() === '') i++;

  const body = lines.slice(i).join('\n').trim();
  return {
    title: titleLine.slice(0, 160),
    excerpt: excerptLines.join(' ').slice(0, 300),
    body,
  };
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
  const [bodyText, setBodyText] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState('');
  const [cropModal, setCropModal] = useState<string | null>(null);
  const [tenantCode, setTenantCode] = useState('');
  const [tenantTags, setTenantTags] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [regeneratingSlugs, setRegeneratingSlugs] = useState(false);
  const [regeneratingExcerpts, setRegeneratingExcerpts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    api.blog.list().then(setPosts).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.tenant.get()
      .then((tenant) => {
        setTenantCode(tenant.code ?? tenant.id);
        setTenantTags([...new Set([...(tenant.typeTags ?? []), ...(tenant.activityTags ?? [])])]);
      })
      .catch(() => setTenantCode(''));
  }, []);

  // 公開ページのキャッシュ再検証。失敗すると古い内容が表示され続けてしまうため、
  // 1回失敗しても静かに諦めず、もう一度だけ試みる
  async function revalidatePublishedBlog(post: BlogPost) {
    if (!tenantCode || post.status !== 'published') return;
    const token = getToken();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('/api/revalidate-public-page', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ tenantCode, blogSlug: post.slug }),
        });
        if (res.ok) return;
        console.error(`公開ページの再検証に失敗しました（試行${attempt + 1}回目、status: ${res.status}）`);
      } catch (err) {
        console.error(`公開ページの再検証に失敗しました（試行${attempt + 1}回目）`, err);
      }
    }
    alert('記事は保存されましたが、公開ページへの反映確認が取れませんでした。少し時間を置いてから公開ページをご確認ください。');
  }

  function openNew() {
    setEditing(null);
    setForm({ title: '', body: '', excerpt: '', tags: [], status: 'draft' });
    setBodyText('');
    setImageUrl(null);
    setExtraImages([]);
    setError('');
    setMode('edit');
  }

  function openEdit(post: BlogPost) {
    setEditing(post);
    setForm({ title: post.title, body: post.body, excerpt: post.excerpt ?? '', tags: post.tags ?? [], status: post.status });
    const parsed = parseBody(post.body);
    setBodyText(parsed.text);
    setImageUrl(parsed.imageUrl);
    setExtraImages(parsed.extraImages);
    setError('');
    setMode('edit');
  }

  // 文章欄が空の状態でAI原稿をまるごと貼り付けたときだけ、
  // 1行目=タイトル、続く段落=概要として自動で抜き出す
  function handleBodyPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (bodyText.trim() !== '') return;
    const pasted = e.clipboardData.getData('text');
    if (!pasted.includes('\n')) return;
    const { title, excerpt, body } = parseAiDraft(pasted);
    if (!title && !body) return;
    e.preventDefault();
    setForm((p) => ({ ...p, title: title || p.title, excerpt: excerpt || p.excerpt }));
    const parsed = parseBody(body);
    setBodyText(parsed.text);
    if (parsed.imageUrl && !imageUrl) setImageUrl(parsed.imageUrl);
    if (parsed.extraImages.length > 0) setExtraImages((prev) => [...prev, ...parsed.extraImages]);
  }

  async function handleSave(publish: boolean) {
    const body = buildBody(imageUrl, bodyText, extraImages);
    if (!form.title.trim() || !bodyText.trim()) {
      setError('タイトルと本文は必須です'); return;
    }
    if (tenantTags.length === 0) {
      setError('団体設定で団体種別・活動タグを設定してください'); return;
    }
    setSaving(true); setError('');
    try {
      const payload: BlogPostInput = { ...form, tags: tenantTags, body, status: publish ? 'published' : 'draft' };
      let savedPost: BlogPost;
      if (editing) {
        savedPost = await api.blog.update(editing.id, payload);
      } else {
        savedPost = await api.blog.create(payload);
      }
      await revalidatePublishedBlog(savedPost);
      load();
      setMode('list');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerateAllLongSlugs() {
    if (!confirm('60文字を超えるURLをすべて短縮します。よろしいですか？')) return;
    setRegeneratingSlugs(true);
    try {
      const { updated } = await api.blog.regenerateLongSlugs();
      for (const post of posts) {
        if (updated.some((u) => u.id === post.id)) {
          await revalidatePublishedBlog({ ...post, slug: updated.find((u) => u.id === post.id)!.slug });
        }
      }
      load();
      alert(updated.length > 0 ? `${updated.length}件のURLを短縮しました` : '短縮が必要なURLはありませんでした');
    } catch {
      alert('URLの一括短縮に失敗しました');
    } finally {
      setRegeneratingSlugs(false);
    }
  }

  async function handleRegenerateAllKeywordExcerpts() {
    if (!confirm('キーワード羅列になっている概要文を、本文から作った説明文に置き換えます。よろしいですか？')) return;
    setRegeneratingExcerpts(true);
    try {
      const { updated } = await api.blog.regenerateKeywordExcerpts();
      for (const post of posts) {
        const match = updated.find((u) => u.id === post.id);
        if (match) {
          await revalidatePublishedBlog({ ...post, excerpt: match.excerpt });
        }
      }
      load();
      alert(updated.length > 0 ? `${updated.length}件の概要文を更新しました` : '更新が必要な概要文はありませんでした');
    } catch {
      alert('概要文の一括更新に失敗しました');
    } finally {
      setRegeneratingExcerpts(false);
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
      setImageUrl(url);
    } catch {
      alert('画像のアップロードに失敗しました');
    } finally {
      setImageUploading(false);
    }
  }

  if (mode === 'edit') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        {cropModal && (
          <CropModal
            url={cropModal}
            onConfirm={(newUrl) => {
              setImageUrl(newUrl);
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
          {editing && tenantCode && (
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(`${SITE_URL}/clubs/${tenantCode}/blog/${editing.slug}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
              className="ml-auto rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
            >
              {copied ? 'コピー済み' : 'URLコピー'}
            </button>
          )}
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 p-4">
          <div>
            <p className="text-sm font-bold text-violet-700">🤖 AIに記事を書かせる時の指示文</p>
            <p className="mt-0.5 text-xs text-violet-400">この指示文をコピーしてChatGPTなどに貼り付けてから、記事の内容を伝えてください</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(AI_DRAFT_PROMPT);
              setPromptCopied(true);
              setTimeout(() => setPromptCopied(false), 1600);
            }}
            className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-violet-700"
          >
            {promptCopied ? 'コピー済み ✓' : '指示文をコピー'}
          </button>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">

          {/* 画像（任意・1枚まで） */}
          <div>
            <span className="mb-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">画像</span>
            {imageUrl ? (
              <div className="group relative overflow-hidden rounded-lg border border-gray-200">
                <img src={imageUrl} alt="" className="w-full max-h-72 rounded-lg object-contain bg-gray-50" />
                <div className="absolute right-2 top-2 hidden gap-1.5 group-hover:flex">
                  <button
                    type="button"
                    onClick={() => setCropModal(imageUrl)}
                    className="flex h-7 items-center gap-1 rounded-full bg-black/60 px-2.5 text-xs font-bold text-white hover:bg-black/80"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5 3a2 2 0 00-2 2v2h2V5h2V3H5zM3 13v2a2 2 0 002 2h2v-2H5v-2H3zM17 5V3h-2v2h-2v2h2a2 2 0 012-2V5h-2V3h2a2 2 0 012 2zm-2 10h-2v2h2a2 2 0 002-2v-2h-2v2z"/>
                    </svg>
                    切り取り
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white hover:bg-black/80"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <label className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 py-8 text-sm font-bold text-gray-400 hover:bg-gray-50 ${imageUploading ? 'pointer-events-none opacity-50' : ''}`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={imageUploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageFile(f); e.currentTarget.value = ''; }}
                />
                {imageUploading ? (
                  <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />アップロード中</>
                ) : (
                  <><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 5.5 2-3.5 3 6z" clipRule="evenodd" /></svg>画像を追加</>
                )}
              </label>
            )}
          </div>

          {/* 文章 */}
          <div>
            <span className="mb-1 inline-block rounded-full bg-[#06C755]/10 px-2 py-0.5 text-[10px] font-bold text-[#06C755]">文章</span>
            <p className="mb-1 text-xs text-gray-400">AIに書かせた原稿をそのまま貼り付けると、1行目→タイトル、2行目以降の段落→概要に自動で振り分けられます。本文中の「# 見出し」「**太字**」「- 箇条書き」「1. 番号リスト」「&gt; 引用」「Q: 質問 / A: 回答」「!ヒント」「表（Markdown表記法）」「---区切り線」「公式LINEのURL（1行単独）」「内容19:00のような時刻付きの行（タイムスケジュール）」「InstagramやThreadsの「埋め込みコードをコピー」で取得できるコード（そのまま貼り付けでOK）」はそのまま装飾・ボタン・埋め込みとして表示されます</p>
            <div className="rounded-xl border border-[#06C755] p-1">
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                onPaste={handleBodyPaste}
                placeholder="活動の様子やお知らせを書いてください（AI原稿をそのまま貼り付けてもOK）..."
                rows={Math.max(8, (bodyText.split('\n').length || 1) + 1)}
                className="w-full resize-none rounded-lg bg-transparent px-3 py-2 text-sm leading-7 text-gray-800 outline-none placeholder:text-gray-300 focus:bg-gray-50/60"
              />
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
              className="rounded-lg bg-gradient-to-r from-[#06C755] to-emerald-400 px-5 py-2 text-sm font-bold text-white shadow-sm hover:shadow-md disabled:opacity-50"
            >
              {saving ? '保存中...' : '🚀 公開する'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#06C755] to-emerald-400 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">✨ ブログ</h1>
            <p className="mt-1 text-xs text-white/80">公開した記事は公開サイトとSEOに反映されます</p>
          </div>
          <div className="flex items-center gap-2">
            {posts.some((p) => p.slug.length > 60) && (
              <button
                type="button"
                disabled={regeneratingSlugs}
                onClick={handleRegenerateAllLongSlugs}
                className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 disabled:opacity-50"
              >
                {regeneratingSlugs ? '短縮中...' : '長いURLを一括で短縮する'}
              </button>
            )}
            {posts.some((p) => looksLikeKeywordExcerpt(p.excerpt)) && (
              <button
                type="button"
                disabled={regeneratingExcerpts}
                onClick={handleRegenerateAllKeywordExcerpts}
                className="rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 disabled:opacity-50"
              >
                {regeneratingExcerpts ? '更新中...' : '概要文を本文から一括再生成'}
              </button>
            )}
            <button
              type="button"
              onClick={openNew}
              className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#06C755] shadow-sm hover:bg-white/90"
            >
              ＋ 新規作成
            </button>
          </div>
        </div>
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
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className={`flex items-start gap-3 rounded-xl border-l-4 bg-white px-4 py-4 shadow-sm transition-shadow hover:shadow-md ${
                post.status === 'published' ? 'border-l-[#06C755]' : 'border-l-gray-300'
              } border-y border-r border-gray-200`}
            >
              {(() => {
                const image = imgUrl(post.coverImageUrl ?? firstBlogImage(post.body), API_URL);
                return image ? (
                  <img src={image} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover shadow-sm" />
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
