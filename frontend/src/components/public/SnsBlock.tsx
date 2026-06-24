'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';

interface Props {
  instagramUrl?: string | null;
  xUrl?: string | null;
  threadsUrl?: string | null;
  xUsername?: string | null;
  instagramEmbedUrl?: string | null;
  threadsEmbedUrl?: string | null;
  accentColor?: string;
}

const SNS_STYLES: Record<string, { bg: string; label: string }> = {
  instagram: { bg: '#E1306C', label: 'Instagram' },
  x:         { bg: '#000000', label: 'X (Twitter)' },
  threads:   { bg: '#000000', label: 'Threads' },
};

export function SnsBlock({ instagramUrl, xUrl, threadsUrl, xUsername, instagramEmbedUrl, threadsEmbedUrl, accentColor }: Props) {
  const processedInstagram = useRef(false);
  const processedThreads = useRef(false);

  useEffect(() => {
    if (instagramEmbedUrl && !processedInstagram.current) {
      if ((window as any).instgrm) {
        (window as any).instgrm.Embeds.process();
        processedInstagram.current = true;
      }
    }
  }, [instagramEmbedUrl]);

  useEffect(() => {
    if (threadsEmbedUrl && !processedThreads.current) {
      if ((window as any).ThreadsEmbedLoader) {
        (window as any).ThreadsEmbedLoader.process();
        processedThreads.current = true;
      }
    }
  }, [threadsEmbedUrl]);

  const linkButtons = [
    { url: instagramUrl, key: 'instagram' },
    { url: xUrl, key: 'x' },
    { url: threadsUrl, key: 'threads' },
  ].filter(s => s.url);

  return (
    <div className="space-y-4">
      {/* リンクボタン */}
      {linkButtons.length > 0 && (
        <div className="flex flex-col gap-2">
          {linkButtons.map(({ url, key }) => (
            <a key={key} href={url!} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition hover:opacity-80"
              style={{ borderColor: SNS_STYLES[key].bg, color: SNS_STYLES[key].bg }}>
              {SNS_STYLES[key].label} でフォロー →
            </a>
          ))}
        </div>
      )}

      {/* X タイムライン */}
      {xUsername && (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <a className="twitter-timeline" data-height="400" data-chrome="noheader nofooter noborders"
            href={`https://twitter.com/${xUsername}`}>
            Tweets by {xUsername}
          </a>
          <Script src="https://platform.twitter.com/widgets.js" strategy="lazyOnload" />
        </div>
      )}

      {/* Instagram 投稿埋め込み */}
      {instagramEmbedUrl && (
        <div className="overflow-hidden rounded-xl">
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={instagramEmbedUrl}
            data-instgrm-version="14"
            style={{ background: '#FFF', border: 0, margin: 0, padding: 0, width: '100%' }}
          />
          <Script
            src="//www.instagram.com/embed.js"
            strategy="lazyOnload"
            onLoad={() => {
              if ((window as any).instgrm) (window as any).instgrm.Embeds.process();
            }}
          />
        </div>
      )}

      {/* Threads 投稿埋め込み */}
      {threadsEmbedUrl && (
        <div className="overflow-hidden rounded-xl">
          <blockquote
            className="text-post-media"
            data-url={threadsEmbedUrl}
            style={{ background: '#FFF', border: 0, margin: 0, padding: 0, width: '100%' }}
          >
            <a href={threadsEmbedUrl} target="_blank" rel="noopener noreferrer">Threads 投稿</a>
          </blockquote>
          <Script
            src="https://www.threads.net/embed/iframe.js"
            strategy="lazyOnload"
          />
        </div>
      )}
    </div>
  );
}
