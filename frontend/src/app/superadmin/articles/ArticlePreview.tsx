'use client';

import { Block } from './BlockEditor';

function BlockView({ block }: { block: Block }) {
  if (block.type === 'h2') {
    return <h2 className="pt-6 text-2xl font-bold text-gray-950">{block.text || '見出し'}</h2>;
  }
  if (block.type === 'h3') {
    return <h3 className="pt-4 text-lg font-bold text-gray-950">{block.text || '小見出し'}</h3>;
  }
  if (block.type === 'list') {
    return <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm">{block.text || 'リスト項目'}</p>;
  }
  if (block.type === 'image') {
    if (!block.imageUrl) return null;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={block.imageUrl} alt={block.text} className="my-6 w-full rounded-xl border border-gray-100 object-cover" />;
  }
  return <p>{block.text || ' '}</p>;
}

export default function ArticlePreview({
  title,
  category,
  areaTags,
  targetKeyword,
  excerpt,
  blocks,
}: {
  title: string;
  category: string;
  areaTags: string[];
  targetKeyword: string;
  excerpt: string;
  blocks: Block[];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-9">
      <div className="flex flex-wrap items-center gap-2">
        {category && <span className="rounded-full bg-[#06C755]/10 px-3 py-1 text-xs font-bold text-[#06C755]">{category}</span>}
        {areaTags.map((area) => (
          <span key={area} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{area}</span>
        ))}
        {targetKeyword && <span className="text-xs text-gray-400">{targetKeyword}</span>}
      </div>
      <h1 className="mt-4 text-3xl font-bold leading-tight text-gray-950">{title || '（タイトル未入力）'}</h1>
      {excerpt && <p className="mt-4 text-sm leading-7 text-gray-500">{excerpt}</p>}
      <div className="my-8 h-px bg-gray-100" />
      <div className="space-y-4 text-[15px] leading-8 text-gray-700">
        {blocks.length === 0 ? (
          <p className="text-sm text-gray-300">ブロックを追加すると、ここにプレビューが表示されます。</p>
        ) : (
          blocks.map((block) => <BlockView key={block.id} block={block} />)
        )}
      </div>
    </div>
  );
}
