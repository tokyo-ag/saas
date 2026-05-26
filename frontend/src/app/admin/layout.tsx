import type { Metadata } from 'next';
import { Suspense } from 'react';
import Sidebar from '@/components/admin/Sidebar';
import EmailVerificationBanner from '@/components/admin/EmailVerificationBanner';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto pt-14 md:pt-0">
        <Suspense fallback={null}>
          <EmailVerificationBanner />
        </Suspense>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
