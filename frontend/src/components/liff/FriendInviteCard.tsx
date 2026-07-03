'use client';

import { useMemo, useState } from 'react';
import { formatDate } from '@/lib/api';
import { initLiff, liff } from '@/lib/liff';
import { SITE_URL, buildLiffUrl } from '@/lib/config';

type FriendInviteCardProps = {
  tenantId: string;
  eventId: string;
  title: string;
  heldAt: string;
  location: string;
};

function buildEventUrl(tenantId: string, eventId: string) {
  const path = `/liff/${tenantId}/events/${eventId}`;
  return buildLiffUrl(path) ?? `${SITE_URL}${path}`;
}

export function FriendInviteCard({ tenantId, eventId, title, heldAt, location }: FriendInviteCardProps) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const inviteText = useMemo(() => {
    const url = buildEventUrl(tenantId, eventId);
    return [
      '今度このイベント行く予定なんだけど、一緒にどう？',
      '',
      title,
      formatDate(heldAt),
      location,
      url,
    ].join('\n');
  }, [tenantId, eventId, title, heldAt, location]);

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function sendToLine() {
    setSending(true);
    try {
      const initialized = await initLiff();
      if (initialized && liff.isInClient() && liff.isApiAvailable('shareTargetPicker')) {
        await liff.shareTargetPicker([{ type: 'text', text: inviteText }]);
        return;
      }
      if (navigator.share) {
        await navigator.share({ text: inviteText });
        return;
      }
      await copyInvite();
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#06C755]/10 text-[#06C755] flex items-center justify-center shrink-0">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8a3 3 0 1 0-2.83-4" />
            <path d="M6 8a3 3 0 1 1 2.83-4" />
            <path d="M8 14a4 4 0 0 0-4 4v2" />
            <path d="M16 14a4 4 0 0 1 4 4v2" />
            <circle cx="12" cy="10" r="3" />
            <path d="M12 13a5 5 0 0 0-5 5v2h10v-2a5 5 0 0 0-5-5Z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-gray-900">友達を誘う</h2>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            そのまま送れる文面を用意しました。気になる友達に一言添えて送れます。
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
        {inviteText}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={sendToLine}
          disabled={sending}
          className="min-h-11 rounded-xl bg-[#06C755] px-3 text-sm font-bold text-white active:bg-[#05a847] disabled:opacity-60"
        >
          {sending ? '準備中...' : 'LINEで送る'}
        </button>
        <button
          type="button"
          onClick={copyInvite}
          className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 active:bg-gray-50"
        >
          {copied ? 'コピー済み' : '文面をコピー'}
        </button>
      </div>
    </section>
  );
}
