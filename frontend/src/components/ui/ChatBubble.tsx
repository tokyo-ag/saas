'use client';

import type { ReactNode, FormEvent } from 'react';

interface ChatBubbleProps {
  content: string;
  time: string;
  isMine: boolean;
  avatar?: ReactNode;
}

export function ChatBubble({ content, time, isMine, avatar }: ChatBubbleProps) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isMine && avatar && <div className="shrink-0 mt-1">{avatar}</div>}
      <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isMine
            ? 'bg-[#06C755] text-white rounded-br-sm'
            : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-sm'
        }`}>
          {content}
        </div>
        <span className="text-xs text-gray-400 px-1">{time}</span>
      </div>
    </div>
  );
}

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  sending?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({ value, onChange, onSubmit, sending, placeholder = 'メッセージを入力...', className }: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className={`bg-white border-t border-gray-200 px-4 py-3 flex gap-2 ${className ?? ''}`}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755] bg-gray-50"
      />
      <button
        type="submit"
        disabled={!value.trim() || sending}
        className="w-10 h-10 bg-[#06C755] rounded-full flex items-center justify-center disabled:opacity-40 active:bg-[#05a847] shrink-0 text-white text-lg leading-none"
      >
        ↑
      </button>
    </form>
  );
}
