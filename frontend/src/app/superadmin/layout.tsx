import type { Metadata } from 'next';
import SuperadminAuthGuard from '@/components/admin/SuperadminAuthGuard';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return <SuperadminAuthGuard>{children}</SuperadminAuthGuard>;
}
