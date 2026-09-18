'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { isLightHexColor } from '@/lib/color';

type ActivityItem = { id: string; type: 'login' | 'reservation'; at: string; name: string; pictureUrl: string | null };

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function formatActivity(item: ActivityItem): string {
  const d = new Date(item.at);
  const stamp = `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return item.type === 'login' ? `${stamp}ログイン！（NEW）` : `${stamp}に予約！`;
}

export function ActivityTicker({ tenantId, accentColor }: { tenantId: string; accentColor: string }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef(60);
  const pointerRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    startTime: number;
    wasPaused: boolean;
    dragging: boolean;
  } | null>(null);

  useEffect(() => {
    api.liff.activity(tenantId).then(setItems).catch(() => setItems([]));
  }, [tenantId]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !items?.length) return;

    // 固定秒数だと項目数が多いほど1秒あたりの移動量が増えてしまうため、
    // 実際の横幅から約24px/秒になるよう計算する。短い場合も45秒以上かける。
    const updateDuration = () => {
      const loopDistance = track.scrollWidth / 2;
      const durationSeconds = Math.min(180, Math.max(45, loopDistance / 24));
      durationRef.current = durationSeconds;
      track.style.setProperty('--ticker-duration', `${durationSeconds.toFixed(1)}s`);
    };

    updateDuration();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateDuration);
    observer.observe(track);
    return () => observer.disconnect();
  }, [items]);

  function getAnimation(): Animation | undefined {
    return trackRef.current?.getAnimations()[0];
  }

  function pauseTicker() {
    const track = trackRef.current;
    track?.style.setProperty('animation-play-state', 'paused');
    getAnimation()?.pause();
    setIsPaused(true);
  }

  function playTicker() {
    const track = trackRef.current;
    track?.style.setProperty('animation-play-state', 'running');
    getAnimation()?.play();
    setIsPaused(false);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const animation = getAnimation();
    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: Number(animation?.currentTime ?? 0),
      wasPaused: isPaused,
      dragging: false,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const pointer = pointerRef.current;
    const track = trackRef.current;
    const animation = getAnimation();
    if (!pointer || pointer.id !== event.pointerId || !track || !animation) return;

    const deltaX = event.clientX - pointer.startX;
    const deltaY = event.clientY - pointer.startY;
    if (!pointer.dragging) {
      if (Math.abs(deltaX) < 6 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      pointer.dragging = true;
      pointer.startX = event.clientX;
      pointer.startTime = Number(animation.currentTime ?? 0);
      event.currentTarget.setPointerCapture(event.pointerId);
      pauseTicker();
      return;
    }

    const loopDistance = track.scrollWidth / 2;
    if (loopDistance <= 0) return;
    const durationMs = durationRef.current * 1000;
    const dragDelta = event.clientX - pointer.startX;
    const rawTime = pointer.startTime - (dragDelta / loopDistance) * durationMs;
    animation.currentTime = ((rawTime % durationMs) + durationMs) % durationMs;
    event.preventDefault();
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    pointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (pointer.dragging) return;
    if (pointer.wasPaused) playTicker();
    else pauseTicker();
  }

  function handlePointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerRef.current?.id === event.pointerId) pointerRef.current = null;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (isPaused) playTicker();
    else pauseTicker();
  }

  if (!items || items.length === 0) return null;

  const loop = [...items, ...items];
  // ticker背景が白固定のため、accentColorが白に近い（例:ボタン専用の白文字色）場合は
  // 読めなくなってしまう。その場合だけ読みやすい濃い色にフォールバックする。
  const textColor = isLightHexColor(accentColor) ? '#111827' : accentColor;

  return (
    <div
      className="relative cursor-grab select-none overflow-hidden border-b border-gray-100 bg-white py-2 [touch-action:pan-y] active:cursor-grabbing"
      role="button"
      tabIndex={0}
      aria-pressed={isPaused}
      aria-label={isPaused ? 'ライブフィードを再開。左右にスワイプできます' : 'ライブフィードを停止'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
    >
      <div ref={trackRef} className="flex w-max animate-ticker gap-6 px-4">
        {loop.map((item, i) => (
          <span key={`${item.id}-${i}`} className="flex shrink-0 items-center gap-1.5 text-xs font-medium whitespace-nowrap" style={{ color: textColor }}>
            {item.pictureUrl ? (
              <Image src={item.pictureUrl} width={16} height={16} className="w-4 h-4 rounded-full object-cover shrink-0" alt="" unoptimized />
            ) : (
              <span className="w-4 h-4 rounded-full bg-gray-200 shrink-0" />
            )}
            <span className="truncate max-w-[90px]">{item.name}</span>
            <span>{formatActivity(item)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
