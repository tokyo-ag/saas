'use client';

import { useEffect, useRef, useState } from 'react';
import { SEARCH_TAGS } from '@/lib/lpTags';
import { UploadButton } from '@/components/admin/EventFormPrimitives';

async function compressImage(file: File, maxBytes = 4 * 1024 * 1024): Promise<Blob> {
  if (file.size <= maxBytes) return file;
  // Keep PNG output for PNG input so transparency survives compression - JPEG has no alpha channel.
  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const quality = 0.8;
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > 1920) { height = Math.round(height * 1920 / width); width = 1920; }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob ?? file), outputType, quality);
    };
    img.src = url;
  });
}

async function uploadFile(file: File): Promise<string> {
  const compressed = await compressImage(file);
  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `${Date.now()}.${ext}`;
  const res = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
    method: 'POST',
    body: compressed,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'アップロードに失敗しました');
  return data.url as string;
}

export type BlockType = 'paragraph' | 'h2' | 'h3' | 'list' | 'image' | 'imageText' | 'cta' | 'events' | 'circles';

export type ListStyle = 'check' | 'bullet' | 'number';
export type ImageSize = 'small' | 'medium' | 'large';

export type Block = {
  id: string;
  type: BlockType;
  text: string;
  imageUrl?: string;
  href?: string;
  tag?: string;
  listStyle?: ListStyle;
  imageSize?: ImageSize;
};

export const IMAGE_SIZE_PX: Record<ImageSize, number> = { small: 80, medium: 128, large: 200 };

const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: '段落',
  h2: '見出し',
  h3: '小見出し',
  list: 'リスト項目',
  image: '画像',
  imageText: '画像＋テキスト（左画像）',
  cta: 'CTAボタン',
  events: 'サークルカード',
  circles: '団体カード',
};

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const LINKED_IMAGE_RE = /^\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)$/;
const IMAGE_TEXT_RE_V2 = /^\{\{imagetext:([^|]*)\|([^|]*)\|(small|medium|large)\|(.*)\}\}$/;
const IMAGE_TEXT_RE_V1 = /^\{\{imagetext:([^|]*)\|([^|]*)\|(.*)\}\}$/;
const CTA_RE = /^\{\{cta:(.*)\|(.*)\}\}$/;
const EVENTS_RE = /^\{\{events(?::([^|}]*)(?:\|(.*))?)?\}\}$/;
const CIRCLES_RE = /^\{\{circles(?::(.*))?\}\}$/;

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

const LIST_PREFIX: Record<ListStyle, string> = { check: '- ', bullet: '-b ', number: '-n ' };

export function parseBodyToBlocks(body: string): Block[] {
  const lines = body.split('\n');
  const blocks: Block[] = [];
  let blankBefore = true;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { blankBefore = true; continue; }
    const linkedImage = LINKED_IMAGE_RE.exec(line);
    const image = IMAGE_RE.exec(line);
    const imageTextV2 = IMAGE_TEXT_RE_V2.exec(line);
    const imageTextV1 = IMAGE_TEXT_RE_V1.exec(line);
    const cta = CTA_RE.exec(line);
    const events = EVENTS_RE.exec(line);
    const circles = CIRCLES_RE.exec(line);
    if (events) {
      blocks.push({ id: newId(), type: 'events', text: events[1] ?? '', tag: events[2] || undefined });
    } else if (circles) {
      blocks.push({ id: newId(), type: 'circles', text: circles[1] ?? '' });
    } else if (imageTextV2) {
      blocks.push({
        id: newId(),
        type: 'imageText',
        text: imageTextV2[4].replace(/\\n/g, '\n'),
        imageUrl: imageTextV2[1],
        href: imageTextV2[2] || undefined,
        imageSize: imageTextV2[3] as ImageSize,
      });
    } else if (imageTextV1) {
      blocks.push({ id: newId(), type: 'imageText', text: imageTextV1[3].replace(/\\n/g, '\n'), imageUrl: imageTextV1[1], href: imageTextV1[2] || undefined });
    } else if (linkedImage) {
      blocks.push({ id: newId(), type: 'image', text: linkedImage[1], imageUrl: linkedImage[2], href: linkedImage[3] });
    } else if (cta) {
      blocks.push({ id: newId(), type: 'cta', text: cta[1], href: cta[2] });
    } else if (image) {
      blocks.push({ id: newId(), type: 'image', text: image[1], imageUrl: image[2] });
    } else if (line.startsWith('### ')) {
      blocks.push({ id: newId(), type: 'h3', text: line.replace(/^###\s+/, '') });
    } else if (line.startsWith('## ')) {
      blocks.push({ id: newId(), type: 'h2', text: line.replace(/^##\s+/, '') });
    } else if (line.startsWith('-b ')) {
      blocks.push({ id: newId(), type: 'list', text: line.replace(/^-b\s+/, ''), listStyle: 'bullet' });
    } else if (line.startsWith('-n ')) {
      blocks.push({ id: newId(), type: 'list', text: line.replace(/^-n\s+/, ''), listStyle: 'number' });
    } else if (line.startsWith('- ')) {
      blocks.push({ id: newId(), type: 'list', text: line.replace(/^-\s+/, ''), listStyle: 'check' });
    } else {
      const prevBlock = blocks[blocks.length - 1];
      if (!blankBefore && prevBlock?.type === 'paragraph') {
        prevBlock.text += `\n${line}`;
      } else {
        blocks.push({ id: newId(), type: 'paragraph', text: line });
      }
    }
    blankBefore = false;
  }
  return blocks;
}

export function blocksToBody(blocks: Block[]): string {
  const parts: string[] = [];
  blocks.forEach((block, i) => {
    const prev = blocks[i - 1];
    const sameListRun = block.type === 'list' && prev?.type === 'list';
    if (i > 0 && !sameListRun) parts.push('');
    let line = '';
    if (block.type === 'h2') line = `## ${block.text}`;
    else if (block.type === 'h3') line = `### ${block.text}`;
    else if (block.type === 'list') line = `${LIST_PREFIX[block.listStyle ?? 'check']}${block.text}`;
    else if (block.type === 'image') {
      line = block.href
        ? `[![${block.text}](${block.imageUrl ?? ''})](${block.href})`
        : `![${block.text}](${block.imageUrl ?? ''})`;
    }
    else if (block.type === 'imageText') {
      line = `{{imagetext:${block.imageUrl ?? ''}|${block.href ?? ''}|${block.imageSize ?? 'medium'}|${block.text.replace(/\n/g, '\\n')}}}`;
    }
    else if (block.type === 'cta') line = `{{cta:${block.text}|${block.href ?? ''}}}`;
    else if (block.type === 'events') {
      line = (block.text || block.tag) ? `{{events:${block.text ?? ''}${block.tag ? `|${block.tag}` : ''}}}` : '{{events}}';
    }
    else if (block.type === 'circles') line = block.text ? `{{circles:${block.text}}}` : '{{circles}}';
    else line = block.text;
    parts.push(line);
  });
  return parts.join('\n');
}

function BlockTypePicker({ onPick, onClose }: { onPick: (type: BlockType) => void; onClose: () => void }) {
  return (
    <div className="absolute z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
      {(Object.keys(BLOCK_LABELS) as BlockType[]).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => { onPick(type); onClose(); }}
          className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
          {BLOCK_LABELS[type]}
        </button>
      ))}
    </div>
  );
}

function AddBlockButton({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-[#06C755] hover:text-[#06C755]"
        aria-label="ブロックを追加"
      >
        ＋
      </button>
      {open && <BlockTypePicker onPick={onAdd} onClose={() => setOpen(false)} />}
    </div>
  );
}

export default function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [focusId, setFocusId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (focusId && inputRefs.current[focusId]) {
      inputRefs.current[focusId]?.focus();
      setFocusId(null);
    }
  }, [focusId, blocks]);

  function insertAt(index: number, type: BlockType) {
    const block: Block = { id: newId(), type, text: '', imageUrl: (type === 'image' || type === 'imageText') ? '' : undefined };
    const next = [...blocks];
    next.splice(index, 0, block);
    onChange(next);
  }

  function insertAfterOnEnter(e: React.KeyboardEvent, block: Block) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const index = blocks.findIndex((b) => b.id === block.id);
    const newBlock: Block = {
      id: newId(),
      type: block.type,
      text: '',
      listStyle: block.type === 'list' ? (block.listStyle ?? 'check') : undefined,
    };
    const next = [...blocks];
    next.splice(index + 1, 0, newBlock);
    onChange(next);
    setFocusId(newBlock.id);
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }

  function moveBlock(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {uploadError && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{uploadError}</p>}
      <AddBlockButton onAdd={(type) => insertAt(0, type)} />
      {blocks.map((block, index) => (
        <div key={block.id}>
          <div className="group relative rounded-lg border border-gray-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500">{BLOCK_LABELS[block.type]}</span>
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0} className="rounded px-1.5 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">↑</button>
                <button type="button" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1} className="rounded px-1.5 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => removeBlock(block.id)} className="rounded px-1.5 text-xs text-red-400 hover:text-red-600">削除</button>
              </div>
            </div>

            {block.type === 'image' ? (
              <div className="space-y-2">
                {block.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={block.imageUrl} alt={block.text} className="max-h-48 w-full rounded-md border border-gray-100 object-cover" />
                )}
                <UploadButton
                  uploading={uploadingId === block.id}
                  onUpload={async (file) => { const url = await uploadFile(file); updateBlock(block.id, { imageUrl: url }); }}
                  setUploading={(v) => setUploadingId(v ? block.id : null)}
                  setError={setUploadError}
                />
                {block.imageUrl && (
                  <button type="button" onClick={() => updateBlock(block.id, { imageUrl: '' })} className="text-xs text-red-500 hover:underline">画像を削除</button>
                )}
                <input
                  value={block.text}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                  placeholder="alt（画像の説明）"
                  className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
                <input
                  value={block.href ?? ''}
                  onChange={(e) => updateBlock(block.id, { href: e.target.value })}
                  placeholder="タップ時のリンク先URL（任意）"
                  className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>
            ) : block.type === 'imageText' ? (
              <div className="space-y-2">
                {block.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={block.imageUrl}
                    alt=""
                    className="rounded-md border border-gray-100 object-contain"
                    style={{ maxWidth: IMAGE_SIZE_PX[block.imageSize ?? 'medium'], maxHeight: IMAGE_SIZE_PX[block.imageSize ?? 'medium'] }}
                  />
                )}
                <UploadButton
                  uploading={uploadingId === block.id}
                  onUpload={async (file) => { const url = await uploadFile(file); updateBlock(block.id, { imageUrl: url }); }}
                  setUploading={(v) => setUploadingId(v ? block.id : null)}
                  setError={setUploadError}
                />
                {block.imageUrl && (
                  <button type="button" onClick={() => updateBlock(block.id, { imageUrl: '' })} className="text-xs text-red-500 hover:underline">画像を削除</button>
                )}
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">画像サイズ</p>
                  <div className="flex gap-1.5">
                    {([
                      { size: 'small' as const, label: '小' },
                      { size: 'medium' as const, label: '中' },
                      { size: 'large' as const, label: '大' },
                    ]).map(({ size, label }) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => updateBlock(block.id, { imageSize: size })}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                          (block.imageSize ?? 'medium') === size ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={block.text}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                  rows={3}
                  placeholder="右側に表示するテキスト"
                  className="w-full resize-y rounded-md border border-gray-200 px-2.5 py-1.5 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
                <input
                  value={block.href ?? ''}
                  onChange={(e) => updateBlock(block.id, { href: e.target.value })}
                  placeholder="タップ時のリンク先URL（任意）"
                  className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>
            ) : block.type === 'cta' ? (
              <div className="space-y-2">
                <input
                  value={block.text}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                  placeholder="ボタンラベル 例: COMIUを無料で試す"
                  className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
                <input
                  value={block.href ?? ''}
                  onChange={(e) => updateBlock(block.id, { href: e.target.value })}
                  placeholder="リンク先 例: /register"
                  className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>
            ) : block.type === 'events' ? (
              <div className="space-y-2">
                <input
                  value={block.text}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                  placeholder="見出し・説明（任意） 例: 東京の人気バドミントンサークル"
                  className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">絞り込みタグ（任意）</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateBlock(block.id, { tag: undefined })}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                        !block.tag ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      指定なし
                    </button>
                    {SEARCH_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => updateBlock(block.id, { tag })}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                          block.tag === tag ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="rounded-md bg-gray-50 px-2.5 py-2 text-xs text-gray-500">
                  記事のカテゴリ（と選んだタグ）に応じて、COMIUに掲載中のイベントカードをここに自動で表示します。
                </p>
              </div>
            ) : block.type === 'circles' ? (
              <div className="space-y-2">
                <input
                  value={block.text}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                  placeholder="見出し・説明（任意） 例: 東京の注目バドミントン団体"
                  className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
                <p className="rounded-md bg-gray-50 px-2.5 py-2 text-xs text-gray-500">
                  記事のカテゴリに応じて、COMIUに登録されている団体をアクセス数順にここに自動で表示します。
                </p>
              </div>
            ) : block.type === 'paragraph' ? (
              <textarea
                value={block.text}
                onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                rows={3}
                placeholder="本文テキスト"
                className="w-full resize-y rounded-md border border-gray-200 px-2.5 py-1.5 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            ) : block.type === 'list' ? (
              <div className="space-y-2">
                <input
                  ref={(el) => { inputRefs.current[block.id] = el; }}
                  value={block.text}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                  onKeyDown={(e) => insertAfterOnEnter(e, block)}
                  placeholder="リスト項目のテキスト（Enterで次の項目を追加）"
                  className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
                <div className="flex gap-1.5">
                  {([
                    { style: 'check' as const, label: '✓ チェック' },
                    { style: 'bullet' as const, label: '・ 中黒' },
                    { style: 'number' as const, label: '1,2,3 番号' },
                  ]).map(({ style, label }) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => updateBlock(block.id, { listStyle: style })}
                      className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                        (block.listStyle ?? 'check') === style ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <input
                ref={(el) => { inputRefs.current[block.id] = el; }}
                value={block.text}
                onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                onKeyDown={(e) => insertAfterOnEnter(e, block)}
                placeholder={block.type === 'h2' ? '見出しテキスト（Enterで次の見出しを追加）' : '小見出しテキスト（Enterで次の小見出しを追加）'}
                className={`w-full rounded-md border border-gray-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#06C755] ${
                  block.type === 'h2' ? 'text-lg font-bold' : 'text-base font-bold'
                }`}
              />
            )}
          </div>
          <AddBlockButton onAdd={(type) => insertAt(index + 1, type)} />
        </div>
      ))}
      {blocks.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">「＋」からブロックを追加してください</p>
      )}
    </div>
  );
}
