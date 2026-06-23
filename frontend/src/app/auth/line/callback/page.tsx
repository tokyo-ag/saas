'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setLiffToken } from '@/lib/api';
import { storeLineSession } from '@/lib/lineLogin';
import { CLIENT_API_BASE } from '@/lib/client-api-base';

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const lineError = searchParams.get('error');

    if (lineError) { setError('LINEログインがキャンセルされました'); return; }
    if (!code || !state) { setError('認証パラメータが不正です'); return; }

    let returnPath = '/';
    try {
      const decoded = JSON.parse(atob(state)) as { returnPath?: string };
      returnPath = decoded.returnPath ?? '/';
    } catch { /* use default */ }

    const redirectUri = `${window.location.origin}/auth/line/callback`;

    fetch(`${CLIENT_API_BASE}/auth/line-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('認証失敗')))
      .then((data: { idToken: string; userId: string; displayName: string; pictureUrl?: string }) => {
        setLiffToken(data.idToken);
        storeLineSession(data.idToken, {
          userId: data.userId,
          displayName: data.displayName,
          pictureUrl: data.pictureUrl,
        });
        router.replace(returnPath);
      })
      .catch(() => setError('LINEログインに失敗しました。もう一度お試しください。'));
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-gray-600">{error}</p>
        <button onClick={() => router.back()} className="rounded-full bg-[#06C755] px-6 py-3 text-sm font-bold text-white">
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#06C755]" />
      <p className="text-sm text-gray-500">ログイン中...</p>
    </div>
  );
}

export default function LineCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#06C755]" />
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
