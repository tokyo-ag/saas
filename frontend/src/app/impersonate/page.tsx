'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setImpersonationToken } from '@/lib/auth';

export default function ImpersonatePage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setImpersonationToken(token);
      router.replace('/admin');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">読み込み中...</div>;
}
