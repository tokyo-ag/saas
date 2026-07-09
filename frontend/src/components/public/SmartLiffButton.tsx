'use client';

import Link from 'next/link';
import { isInLineInAppBrowser } from '@/lib/config';

// LINEアプリ内で既に開いているページからliff.line.meリンクを踏むと、
// LINEが確認を挟んで新しいブラウザ画面を上に重ねて開いてしまう。
// 既にLINEアプリ内ならLIFFの直接パスへ遷移させて二重表示を防ぐ。
export function SmartLiffButton({
  href,
  directHref,
  className,
  children,
}: {
  href: string;
  directHref: string;
  className?: string;
  children: React.ReactNode;
}) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isInLineInAppBrowser()) {
      e.preventDefault();
      window.location.href = directHref;
    }
  }
  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
