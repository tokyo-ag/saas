import Link from 'next/link';

import { OFFICIAL_LINE_URL, SUPPORT_EMAIL } from '@/lib/config';

const groups = [
  {
    title: 'イベントを探す',
    links: [
      { label: '交流会', href: '/events/meetup' },
      { label: 'バドミントン', href: '/sports/badminton' },
      { label: 'フットサル', href: '/sports/futsal' },
      { label: 'バスケ', href: '/sports/basketball' },
      { label: 'バレー', href: '/sports/volleyball' },
      { label: '卓球', href: '/sports/tabletennis' },
    ],
  },
  {
    title: 'サービス',
    links: [
      { label: '料金プラン', href: '/pricing' },
      { label: '活用事例', href: '/use-cases' },
      { label: '主催者登録', href: '/register' },
      { label: 'ログイン', href: '/login' },
    ],
  },
  {
    title: 'サポート',
    links: [
      { label: 'お問い合わせ', href: '/contact' },
      { label: '利用規約', href: '/terms' },
      { label: 'プライバシーポリシー', href: '/privacy' },
    ],
  },
];

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="text-base font-bold text-gray-900">
              COMIU
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
              東京の20代向けサークル・交流イベントを探して、LINEでかんたんに参加予約できるサービスです。
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-4 inline-block text-sm font-medium text-[#06C755] hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
            <a
              href={OFFICIAL_LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-sm font-medium text-[#06C755] hover:underline"
            >
              公式LINEで問い合わせる
            </a>
            <p className="mt-1 text-xs text-gray-400">
              返信は公式LINEがスムーズで早いです。
            </p>
          </div>

          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {group.title}
              </p>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-[#06C755]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-gray-100 pt-5 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 COMIU</p>
          <p>イベント参加者・主催者のためのコミュニティ管理サービス</p>
        </div>
      </div>
    </footer>
  );
}
