'use client';

import { useState, type ReactNode } from 'react';

const BATCH_SIZE = 5;

// Circle-card entries beyond the visible limit are grouped into batches of 5 here. Every batch
// is always present in the DOM (so it stays in the server-rendered HTML for SEO crawling) but
// collapsed via max-height/opacity until revealed, so newly revealed batches slide/fade in
// instead of a plain <details> snapping open all at once.
export default function CircleCardReveal({ items }: { items: ReactNode[] }) {
  const [revealedBatches, setRevealedBatches] = useState(0);

  const batches: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) batches.push(items.slice(i, i + BATCH_SIZE));

  const remaining = items.length - revealedBatches * BATCH_SIZE;

  return (
    <div>
      {batches.map((batch, bi) => {
        const isRevealed = bi < revealedBatches;
        return (
          <div
            key={bi}
            aria-hidden={!isRevealed}
            className={`grid overflow-hidden transition-all duration-500 ease-out ${
              isRevealed ? 'mt-0 max-h-[4000px] opacity-100' : 'max-h-0 -translate-y-2 opacity-0'
            }`}
          >
            {batch}
          </div>
        );
      })}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setRevealedBatches((v) => v + 1)}
          className="mx-auto my-4 flex items-center gap-1 rounded-full border border-[#06C755]/30 bg-[#06C755]/5 px-5 py-2 text-sm font-bold text-[#06C755] transition hover:bg-[#06C755]/10"
        >
          つづきを見る（あと{remaining}件）
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
