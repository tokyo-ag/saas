'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getToken } from '@/lib/auth';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function EmailVerificationBanner() {
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === '1';
  const [showBanner, setShowBanner] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json() as { email?: string; emailVerified?: boolean };
        if (data.email && !data.emailVerified) setShowBanner(true);
      })
      .catch(() => null);
  }, []);

  async function handleResend() {
    const token = getToken();
    if (!token || resending) return;
    setResending(true);
    try {
      await fetch(`${BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setResent(true);
    } catch {
      // silent
    } finally {
      setResending(false);
    }
  }

  if (!showBanner && !justRegistered) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
      <p className="text-xs text-amber-800 leading-relaxed">
        <span className="font-semibold">メールアドレスが未確認です。</span>
        {justRegistered
          ? ' 登録いただいたメールアドレスに確認メールを送信しました。'
          : ' 確認メールのリンクをクリックしてください。'}
      </p>
      {!resent ? (
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-xs text-amber-700 underline whitespace-nowrap disabled:opacity-50"
        >
          {resending ? '送信中...' : '確認メールを再送する'}
        </button>
      ) : (
        <span className="text-xs text-amber-700 whitespace-nowrap">送信しました</span>
      )}
    </div>
  );
}
