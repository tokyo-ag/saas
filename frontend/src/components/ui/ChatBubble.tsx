'use client';

import type { ReactNode, FormEvent } from 'react';

const URL_RE = /(https?:\/\/[^\s　-鿿！-｠]+)/g;

function renderWithLinks(content: string, isMine: boolean, accentColor: string) {
  const parts = content.split(URL_RE);
  return parts.map((part, i) =>
    URL_RE.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className={`underline break-all ${isMine ? 'text-white/90' : ''}`}
        style={!isMine ? { color: accentColor } : undefined}
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

interface ChatBubbleProps {
  content: string;
  time: string;
  isMine: boolean;
  avatar?: ReactNode;
  accentColor?: string;
}

export function ChatBubble({ content, time, isMine, avatar, accentColor = '#06C755' }: ChatBubbleProps) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isMine && avatar && <div className="shrink-0 mt-1">{avatar}</div>}
      <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isMine ? 'text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-sm'
          }`}
          style={isMine ? { backgroundColor: accentColor } : undefined}
        >
          {renderWithLinks(content, isMine, accentColor)}
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
  accentColor?: string;
}

export function ChatInput({ value, onChange, onSubmit, sending, placeholder = 'メッセージを入力...', className, accentColor = '#06C755' }: ChatInputProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as FormEvent);
    }
  }
  return (
    <form onSubmit={onSubmit} className={`bg-white border-t border-gray-200 px-4 py-3 flex items-end gap-2 ${className ?? ''}`}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        maxLength={10000}
        className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 bg-gray-50 resize-none overflow-hidden"
        style={{ maxHeight: '120px', overflowY: value.split('\n').length > 3 ? 'auto' : 'hidden', outlineColor: accentColor }}
      />
      <button
        type="submit"
        disabled={!value.trim() || sending}
        className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 shrink-0 text-white text-lg leading-none"
        style={{ backgroundColor: accentColor }}
      >
        ↑
      </button>
    </form>
  );
}
