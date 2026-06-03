'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CLIENT_API_BASE } from '@/lib/client-api-base';

const BASE = CLIENT_API_BASE;

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('無効なリンクです');
      return;
    }
    fetch(`${BASE}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json() as { message?: string };
        if (res.ok) {
          setStatus('success');
          setMessage(data.message ?? 'メールアドレスを確認しました');
        } else {
          setStatus('error');
          setMessage(data.message ?? '確認に失敗しました');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('エラーが発生しました');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-[#06C755] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-2xl">🎉</span>
        </div>

        {status === 'loading' && (
          <p className="text-gray-500 text-sm">確認中...</p>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06C755" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">確認完了</h1>
            <p className="text-sm text-gray-500">{message}</p>
            <Link href="/admin" className="inline-block bg-[#06C755] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#05a847] transition-colors">
              管理画面へ
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">確認できませんでした</h1>
            <p className="text-sm text-gray-500">{message}</p>
            <Link href="/admin" className="inline-block text-[#06C755] text-sm hover:underline">
              管理画面へ戻る
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-400">読み込み中...</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
