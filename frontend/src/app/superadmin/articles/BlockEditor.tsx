'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
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

export async function uploadFile(file: File): Promise<string> {
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

export type BlockType = 'paragraph' | 'h2' | 'h3' | 'list' | 'image' | 'imageText' | 'textImage' | 'cta' | 'events' | 'circles' | 'table' | 'cardSlider';

export type ListStyle = 'check' | 'bullet' | 'number';
export type ImageSize = 'small' | 'medium' | 'large';
export type TextSize = 'small' | 'medium' | 'large';

export type CardItem = {
  imageUrl: string;
  name: string;
  description: string;
  href: string;
  imageSize?: ImageSize;
};

// Width of the card image as a fraction of the card's own width (kept uncropped; only the display size changes).
// "large" fills the card edge-to-edge (zero side margin); smaller sizes leave proportionally more margin.
export const CARD_IMAGE_SIZE_CLASS: Record<ImageSize, string> = {
  small: 'w-1/3',
  medium: 'w-2/3',
  large: 'w-full',
};

export type Block = {
  id: string;
  type: BlockType;
  text: string;
  imageUrl?: string;
  href?: string;
  tag?: string;
  listStyle?: ListStyle;
  imageSize?: ImageSize;
  textSize?: TextSize;
  tableRows?: string[][];
  cardItems?: CardItem[];
  eventsAreaSearchEnabled?: boolean;
  eventsShowFilterTagEnabled?: boolean;
};

// UTF-8-safe base64 so embedded Japanese/symbol text survives being placed in a single-line marker.
function encodeJsonB64(value: unknown): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
}

function decodeJsonB64<T>(encoded: string, fallback: T): T {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return fallback;
  }
}

export function encodeTable(rows: string[][]): string {
  return encodeJsonB64(rows);
}

export function decodeTable(encoded: string): string[][] {
  const parsed = decodeJsonB64<string[][]>(encoded, [['', ''], ['', '']]);
  if (Array.isArray(parsed) && parsed.every((row) => Array.isArray(row))) return parsed;
  return [['', ''], ['', '']];
}

export function encodeCardItems(items: CardItem[]): string {
  return encodeJsonB64(items);
}

export function decodeCardItems(encoded: string): CardItem[] {
  const parsed = decodeJsonB64<CardItem[]>(encoded, []);
  if (Array.isArray(parsed)) return parsed;
  return [];
}

export const IMAGE_SIZE_PX: Record<ImageSize, number> = { small: 80, medium: 128, large: 200 };
// Smaller cap below sm: so image+text blocks stay side-by-side (not stacked) on narrow phones.
export const IMAGE_SIZE_CLASS: Record<ImageSize, string> = {
  small: 'max-w-14 max-h-14 sm:max-w-[80px] sm:max-h-[80px]',
  medium: 'max-w-20 max-h-20 sm:max-w-[128px] sm:max-h-[128px]',
  large: 'max-w-28 max-h-28 sm:max-w-[200px] sm:max-h-[200px]',
};
export const TEXT_SIZE_CLASS: Record<TextSize, string> = {
  small: 'text-[13px] sm:text-sm',
  medium: 'text-[15px] sm:text-base',
  large: 'text-lg sm:text-xl',
};

const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: '段落',
  h2: '見出し',
  h3: '小見出し',
  list: 'リスト項目',
  image: '画像',
  imageText: '画像＋テキスト（左画像）',
  textImage: 'テキスト＋画像（右画像）',
  cta: 'CTAボタン',
  events: 'サークルカード',
  circles: '団体カード',
  table: '表（比較表）',
  cardSlider: 'カードスライド（横スクロール）',
};

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const LINKED_IMAGE_RE = /^\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)$/;
const IMAGE_TEXT_RE_V3 = /^\{\{imagetext:([^|]*)\|([^|]*)\|(small|medium|large)\|(small|medium|large)\|(.*)\}\}$/;
const IMAGE_TEXT_RE_V2 = /^\{\{imagetext:([^|]*)\|([^|]*)\|(small|medium|large)\|(.*)\}\}$/;
const IMAGE_TEXT_RE_V1 = /^\{\{imagetext:([^|]*)\|([^|]*)\|(.*)\}\}$/;
const TEXT_IMAGE_RE = /^\{\{textimage:([^|]*)\|([^|]*)\|(small|medium|large)\|(small|medium|large)\|(.*)\}\}$/;
const CTA_RE = /^\{\{cta:(.*)\|(.*)\}\}$/;
const EVENTS_RE = /^\{\{events(?::([^|}]*)(?:\|([^|}]*)(?:\|(true|false)(?:\|(true|false))?)?)?)?\}\}$/;
const CIRCLES_RE = /^\{\{circles(?::(.*))?\}\}$/;
const TABLE_RE = /^\{\{table:(.+)\}\}$/;
const CARD_SLIDER_RE = /^\{\{cardslider:(.+)\}\}$/;

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
    const imageTextV3 = IMAGE_TEXT_RE_V3.exec(line);
    const imageTextV2 = IMAGE_TEXT_RE_V2.exec(line);
    const imageTextV1 = IMAGE_TEXT_RE_V1.exec(line);
    const textImage = TEXT_IMAGE_RE.exec(line);
    const cta = CTA_RE.exec(line);
    const events = EVENTS_RE.exec(line);
    const circles = CIRCLES_RE.exec(line);
    const table = TABLE_RE.exec(line);
    const cardSlider = CARD_SLIDER_RE.exec(line);
    if (table) {
      blocks.push({ id: newId(), type: 'table', text: '', tableRows: decodeTable(table[1]) });
    } else if (cardSlider) {
      blocks.push({ id: newId(), type: 'cardSlider', text: '', cardItems: decodeCardItems(cardSlider[1]) });
    } else if (events) {
      blocks.push({ id: newId(), type: 'events', text: events[1] ?? '', tag: events[2] || undefined, eventsAreaSearchEnabled: events[3] === 'true', eventsShowFilterTagEnabled: events[4] === 'true' });
    } else if (circles) {
      blocks.push({ id: newId(), type: 'circles', text: circles[1] ?? '' });
    } else if (textImage) {
      blocks.push({
        id: newId(),
        type: 'textImage',
        text: textImage[5].replace(/\\n/g, '\n'),
        imageUrl: textImage[1],
        href: textImage[2] || undefined,
        imageSize: textImage[3] as ImageSize,
        textSize: textImage[4] as TextSize,
      });
    } else if (imageTextV3) {
      blocks.push({
        id: newId(),
        type: 'imageText',
        text: imageTextV3[5].replace(/\\n/g, '\n'),
        imageUrl: imageTextV3[1],
        href: imageTextV3[2] || undefined,
        imageSize: imageTextV3[3] as ImageSize,
        textSize: imageTextV3[4] as TextSize,
      });
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
      line = `{{imagetext:${block.imageUrl ?? ''}|${block.href ?? ''}|${block.imageSize ?? 'medium'}|${block.textSize ?? 'medium'}|${block.text.replace(/\n/g, '\\n')}}}`;
    }
    else if (block.type === 'textImage') {
      line = `{{textimage:${block.imageUrl ?? ''}|${block.href ?? ''}|${block.imageSize ?? 'medium'}|${block.textSize ?? 'medium'}|${block.text.replace(/\n/g, '\\n')}}}`;
    }
    else if (block.type === 'cta') line = `{{cta:${block.text}|${block.href ?? ''}}}`;
    else if (block.type === 'events') {
      const areaSearch = block.eventsAreaSearchEnabled ?? false;
      const showFilterTag = block.eventsShowFilterTagEnabled ?? false;
      const extra = (areaSearch || showFilterTag) ? `|${areaSearch}${showFilterTag ? '|true' : ''}` : '';
      line = (block.text || block.tag || areaSearch || showFilterTag)
        ? `{{events:${block.text ?? ''}|${block.tag ?? ''}${extra}}}`
        : '{{events}}';
    }
    else if (block.type === 'circles') line = block.text ? `{{circles:${block.text}}}` : '{{circles}}';
    else if (block.type === 'table') line = `{{table:${encodeTable(block.tableRows ?? [['', ''], ['', '']])}}}`;
    else if (block.type === 'cardSlider') line = `{{cardslider:${encodeCardItems(block.cardItems ?? [])}}}`;
    else line = block.text;
    parts.push(line);
  });
  return parts.join('\n');
}

function SizePicker({ label, value, onChange }: { label: string; value: ImageSize | TextSize; onChange: (size: 'small' | 'medium' | 'large') => void }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      <div className="flex gap-1.5">
        {([
          { size: 'small' as const, label: '小' },
          { size: 'medium' as const, label: '中' },
          { size: 'large' as const, label: '大' },
        ]).map(({ size, label: sizeLabel }) => (
          <button
            key={size}
            type="button"
            onClick={() => onChange(size)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              value === size ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {sizeLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function ImageTextFields({
  block,
  updateBlock,
  uploadingId,
  setUploadingId,
  setUploadError,
  removingBgId,
  handleRemoveBackground,
}: {
  block: Block;
  updateBlock: (id: string, patch: Partial<Block>) => void;
  uploadingId: string | null;
  setUploadingId: (id: string | null) => void;
  setUploadError: (message: string) => void;
  removingBgId: string | null;
  handleRemoveBackground: (block: Block) => void;
}) {
  return (
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
        <div className="flex gap-3">
          <button type="button" onClick={() => updateBlock(block.id, { imageUrl: '' })} className="text-xs text-red-500 hover:underline">画像を削除</button>
          <button
            type="button"
            onClick={() => handleRemoveBackground(block)}
            disabled={removingBgId === block.id}
            className="text-xs text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-50"
          >
            {removingBgId === block.id ? '背景を削除中…（数秒かかります）' : '背景を削除'}
          </button>
        </div>
      )}
      <SizePicker label="画像サイズ" value={block.imageSize ?? 'medium'} onChange={(size) => updateBlock(block.id, { imageSize: size })} />
      <SizePicker label="文字サイズ" value={block.textSize ?? 'medium'} onChange={(size) => updateBlock(block.id, { textSize: size })} />
      <textarea
        value={block.text}
        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
        rows={3}
        placeholder="テキスト"
        className="w-full resize-y rounded-md border border-gray-200 px-2.5 py-1.5 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
      />
      <input
        value={block.href ?? ''}
        onChange={(e) => updateBlock(block.id, { href: e.target.value })}
        placeholder="タップ時のリンク先URL（任意）"
        className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#06C755]"
      />
    </div>
  );
}

function TableFields({ block, updateBlock }: { block: Block; updateBlock: (id: string, patch: Partial<Block>) => void }) {
  const rows = block.tableRows ?? [['', '']];
  const colCount = rows[0]?.length ?? 0;

  function setCell(r: number, c: number, value: string) {
    const next = rows.map((row) => [...row]);
    next[r][c] = value;
    updateBlock(block.id, { tableRows: next });
  }

  function addRow() {
    updateBlock(block.id, { tableRows: [...rows, Array(colCount).fill('')] });
  }

  function insertRowAt(index: number) {
    const next = [...rows];
    next.splice(index, 0, Array(colCount).fill(''));
    updateBlock(block.id, { tableRows: next });
  }

  function removeRow(r: number) {
    if (rows.length <= 1) return;
    if (!confirm('この行を削除しますか？')) return;
    updateBlock(block.id, { tableRows: rows.filter((_, i) => i !== r) });
  }

  function addColumn() {
    updateBlock(block.id, { tableRows: rows.map((row) => [...row, '']) });
  }

  function insertColumnAt(index: number) {
    updateBlock(block.id, {
      tableRows: rows.map((row) => {
        const next = [...row];
        next.splice(index, 0, '');
        return next;
      }),
    });
  }

  function removeColumn(c: number) {
    if (colCount <= 1) return;
    if (!confirm('この列を削除しますか？')) return;
    updateBlock(block.id, { tableRows: rows.map((row) => row.filter((_, i) => i !== c)) });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">
        1行目が見出し行として表示されます。セルに <code className="rounded bg-gray-100 px-1">[団体名](URL)</code> の形式で入力すると、緑色のテキストリンクになります。
      </p>
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="border-collapse">
          <tbody>
            {rows.map((row, r) => (
              <Fragment key={r}>
                <tr>
                  {row.map((cell, c) => (
                    <Fragment key={c}>
                      <td className="border border-gray-200 p-0.5">
                        <input
                          value={cell}
                          onChange={(e) => setCell(r, c, e.target.value)}
                          className={`w-28 border-0 px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#06C755] ${r === 0 ? 'bg-gray-50 font-bold' : ''}`}
                        />
                      </td>
                      {r === 0 && (
                        <td rowSpan={rows.length * 2} className="p-0 align-top">
                          <div className="flex justify-center pt-2">
                            <button
                              type="button"
                              onClick={() => insertColumnAt(c + 1)}
                              aria-label="この位置に列を挿入"
                              className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-dashed border-gray-300 text-[9px] leading-none text-gray-400 hover:border-[#06C755] hover:text-[#06C755]"
                            >
                              ＋
                            </button>
                          </div>
                        </td>
                      )}
                    </Fragment>
                  ))}
                  <td className="p-0.5">
                    <button type="button" onClick={() => removeRow(r)} disabled={rows.length <= 1} className="text-xs text-red-400 hover:text-red-600 disabled:opacity-30">
                      行削除
                    </button>
                  </td>
                </tr>
                <tr>
                  <td colSpan={colCount * 2 + 1} className="p-0">
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => insertRowAt(r + 1)}
                        aria-label="この位置に行を挿入"
                        className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-dashed border-gray-300 text-[9px] leading-none text-gray-400 hover:border-[#06C755] hover:text-[#06C755]"
                      >
                        ＋
                      </button>
                    </div>
                  </td>
                </tr>
              </Fragment>
            ))}
            <tr>
              {rows[0]?.map((_, c) => (
                <Fragment key={c}>
                  <td className="p-0.5 text-center">
                    <button type="button" onClick={() => removeColumn(c)} disabled={colCount <= 1} className="text-[10px] text-red-400 hover:text-red-600 disabled:opacity-30">
                      列削除
                    </button>
                  </td>
                  <td className="p-0" />
                </Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={addRow} className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
          ＋行を追加
        </button>
        <button type="button" onClick={addColumn} className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
          ＋列を追加
        </button>
      </div>
    </div>
  );
}

function CardSliderFields({
  block,
  updateBlock,
  uploadingId,
  setUploadingId,
  setUploadError,
}: {
  block: Block;
  updateBlock: (id: string, patch: Partial<Block>) => void;
  uploadingId: string | null;
  setUploadingId: (id: string | null) => void;
  setUploadError: (message: string) => void;
}) {
  const items = block.cardItems ?? [];

  function updateItem(index: number, patch: Partial<CardItem>) {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    updateBlock(block.id, { cardItems: next });
  }

  function addItem() {
    updateBlock(block.id, { cardItems: [...items, { imageUrl: '', name: '', description: '', href: '' }] });
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    if (!confirm('このカードを削除しますか？')) return;
    updateBlock(block.id, { cardItems: items.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">団体を横スクロールカードで並べて紹介します。1枚につき画像・団体名・説明文・リンク先を入力してください。</p>
      {items.map((item, index) => {
        const uploadKey = `${block.id}-${index}`;
        return (
          <div key={index} className="space-y-2 rounded-md border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">カード{index + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={items.length <= 1}
                className="text-xs text-red-400 hover:text-red-600 disabled:opacity-30"
              >
                削除
              </button>
            </div>
            {item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="mx-auto max-h-32 rounded-md border border-gray-100 object-contain" />
            )}
            <UploadButton
              uploading={uploadingId === uploadKey}
              onUpload={async (file) => { const url = await uploadFile(file); updateItem(index, { imageUrl: url }); }}
              setUploading={(v) => setUploadingId(v ? uploadKey : null)}
              setError={setUploadError}
            />
            {item.imageUrl && (
              <button type="button" onClick={() => updateItem(index, { imageUrl: '' })} className="text-xs text-red-500 hover:underline">
                画像を削除
              </button>
            )}
            <SizePicker label="画像サイズ" value={item.imageSize ?? 'medium'} onChange={(size) => updateItem(index, { imageSize: size })} />
            <input
              value={item.name}
              onChange={(e) => updateItem(index, { name: e.target.value })}
              placeholder="団体名 例: ゆるばど"
              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
            <textarea
              value={item.description}
              onChange={(e) => updateItem(index, { description: e.target.value.replace(/\n/g, ' ') })}
              rows={2}
              placeholder="短い説明文（改行なしで自然に折り返されます）"
              className="w-full resize-y rounded-md border border-gray-200 px-2.5 py-1.5 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
            <input
              value={item.href}
              onChange={(e) => updateItem(index, { href: e.target.value })}
              placeholder="団体ページのURL"
              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>
        );
      })}
      <button type="button" onClick={addItem} className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
        ＋カードを追加
      </button>
    </div>
  );
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
  const [removingBgId, setRemovingBgId] = useState<string | null>(null);

  useEffect(() => {
    if (focusId && inputRefs.current[focusId]) {
      inputRefs.current[focusId]?.focus();
      setFocusId(null);
    }
  }, [focusId, blocks]);

  async function handleRemoveBackground(block: Block) {
    if (!block.imageUrl) return;
    setRemovingBgId(block.id);
    setUploadError('');
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const resultBlob = await removeBackground(block.imageUrl);
      const file = new File([resultBlob], `bg-removed-${Date.now()}.png`, { type: 'image/png' });
      const url = await uploadFile(file);
      updateBlock(block.id, { imageUrl: url });
    } catch (err: any) {
      setUploadError(err?.message ?? '背景の削除に失敗しました');
    } finally {
      setRemovingBgId(null);
    }
  }

  function insertAt(index: number, type: BlockType) {
    const block: Block = {
      id: newId(),
      type,
      text: '',
      imageUrl: (type === 'image' || type === 'imageText' || type === 'textImage') ? '' : undefined,
      tableRows: type === 'table' ? [['見出し1', '見出し2'], ['', '']] : undefined,
      cardItems: type === 'cardSlider' ? [{ imageUrl: '', name: '', description: '', href: '' }] : undefined,
      eventsAreaSearchEnabled: type === 'events' ? false : undefined,
      eventsShowFilterTagEnabled: type === 'events' ? false : undefined,
    };
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
    if (!confirm('このブロックを削除しますか？')) return;
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
                  <img src={block.imageUrl} alt={block.text} className="mx-auto max-h-64 max-w-full rounded-md border border-gray-100 object-contain" />
                )}
                <UploadButton
                  uploading={uploadingId === block.id}
                  onUpload={async (file) => { const url = await uploadFile(file); updateBlock(block.id, { imageUrl: url }); }}
                  setUploading={(v) => setUploadingId(v ? block.id : null)}
                  setError={setUploadError}
                />
                {block.imageUrl && (
                  <div className="flex gap-3">
                    <button type="button" onClick={() => updateBlock(block.id, { imageUrl: '' })} className="text-xs text-red-500 hover:underline">画像を削除</button>
                    <button
                      type="button"
                      onClick={() => handleRemoveBackground(block)}
                      disabled={removingBgId === block.id}
                      className="text-xs text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-50"
                    >
                      {removingBgId === block.id ? '背景を削除中…（数秒かかります）' : '背景を削除'}
                    </button>
                  </div>
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
            ) : block.type === 'imageText' || block.type === 'textImage' ? (
              <ImageTextFields
                block={block}
                updateBlock={updateBlock}
                uploadingId={uploadingId}
                setUploadingId={setUploadingId}
                setUploadError={setUploadError}
                removingBgId={removingBgId}
                handleRemoveBackground={handleRemoveBackground}
              />
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
                <div className={block.eventsShowFilterTagEnabled ? 'opacity-40' : ''}>
                  <p className="mb-1 text-xs font-medium text-gray-500">絞り込みタグ（任意）</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={block.eventsShowFilterTagEnabled}
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
                        disabled={block.eventsShowFilterTagEnabled}
                        onClick={() => updateBlock(block.id, { tag })}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                          block.tag === tag ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  {block.eventsShowFilterTagEnabled && (
                    <p className="mt-1 text-xs text-gray-400">下の「タブで絞り込む」がONの間は使いません。</p>
                  )}
                </div>
                <p className="rounded-md bg-gray-50 px-2.5 py-2 text-xs text-gray-500">
                  記事のカテゴリ（と選んだタグ）に応じて、COMIUに掲載中のイベントカードをここに自動で表示します。
                </p>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={block.eventsAreaSearchEnabled ?? false}
                    onChange={(e) => updateBlock(block.id, { eventsAreaSearchEnabled: e.target.checked })}
                    className="accent-[#06C755]"
                  />
                  地域検索タブを表示する（カード一覧を地域で絞り込めるようにする）
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={block.eventsShowFilterTagEnabled ?? false}
                    onChange={(e) => updateBlock(block.id, { eventsShowFilterTagEnabled: e.target.checked })}
                    className="accent-[#06C755]"
                  />
                  絞り込みタグをタブで表示する（読者がタグを切り替えてカードを絞り込めるようにする）
                </label>
              </div>
            ) : block.type === 'table' ? (
              <TableFields block={block} updateBlock={updateBlock} />
            ) : block.type === 'cardSlider' ? (
              <CardSliderFields
                block={block}
                updateBlock={updateBlock}
                uploadingId={uploadingId}
                setUploadingId={setUploadingId}
                setUploadError={setUploadError}
              />
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
