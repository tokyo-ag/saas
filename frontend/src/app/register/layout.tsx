import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '主催者登録',
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
