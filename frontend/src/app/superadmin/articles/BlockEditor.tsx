'use client';

import { useState } from 'react';
import { SEARCH_TAGS } from '@/lib/lpTags';

export type BlockType = 'paragraph' | 'h2' | 'h3' | 'list' | 'image' | 'cta' | 'events' | 'circles';

export type ListStyle = 'check' | 'bullet' | 'number';

export type Block = {
  id: string;
  type: BlockType;
  text: string;
  imageUrl?: string;
  href?: string;
  tag?: string;
  listStyle?: ListStyle;
};

const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: '段落',
  h2: '見出し',
  h3: '小見出し',
  list: 'リスト項目',
  image: '画像',
  cta: 'CTAボタン',
  events: 'サークルカード',
  circles: '団体カード',
};

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
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
    const image = IMAGE_RE.exec(line);
    const cta = CTA_RE.exec(line);
    const events = EVENTS_RE.exec(line);
    const circles = CIRCLES_RE.exec(line);
    if (events) {
      blocks.push({ id: newId(), type: 'events', text: events[1] ?? '', tag: events[2] || undefined });
    } else if (circles) {
      blocks.push({ id: newId(), type: 'circles', text: circles[1] ?? '' });
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
    else if (block.type === 'image') line = `![${block.text}](${block.imageUrl ?? ''})`;
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
  function insertAt(index: number, type: BlockType) {
    const block: Block = { id: newId(), type, text: '', imageUrl: type === 'image' ? '' : undefined };
    const next = [...blocks];
    next.splice(index, 0, block);
    onChange(next);
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
                <input
                  value={block.imageUrl ?? ''}
                  onChange={(e) => updateBlock(block.id, { imageUrl: e.target.value })}
                  placeholder="画像URL"
                  className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
                <input
                  value={block.text}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                  placeholder="alt（画像の説明）"
                  className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {block.imageUrl && <img src={block.imageUrl} alt={block.text} className="max-h-32 rounded-md border border-gray-100 object-cover" />}
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
                  value={block.text}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                  placeholder="リスト項目のテキスト"
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
                value={block.text}
                onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                placeholder={block.type === 'h2' ? '見出しテキスト' : '小見出しテキスト'}
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
