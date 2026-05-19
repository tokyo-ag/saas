'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken } from '@/lib/auth';

export default function ImpersonatePage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      setToken(token);
    }
    router.replace('/admin');
  }, []);

  return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">読み込み中...</div>;
}
