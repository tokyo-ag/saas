import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { API_URL, SITE_URL } from '@/lib/config';

export const revalidate = 60;

type PublicTenant = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  linePictureUrl: string | null;
  memberCount: number;
  eventCount: number;
  accessCount: number;
};

async function fetchTenants(): Promise<PublicTenant[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/tenants`, {
      next: { revalidate },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: 'コミュニティを探す | COMIU',
  description:
    '専門学校生・短大生・通信大学生・社会人でも参加できるスポーツ・交流コミュニティを探せます。大学のサークルがなくても大丈夫。COMIUで運営されているオープンなコミュニティ一覧です。',
  alternates: { canonical: `${SITE_URL}/find` },
  openGraph: {
    title: 'コミュニティを探す | COMIU',
    description:
      '専門学校生・短大生・通信大学生・社会人でも参加できるスポーツ・交流コミュニティを探せます。',
    url: `${SITE_URL}/find`,
    type: 'website',
    locale: 'ja_JP',
  },
};

function excerpt(text: string | null, len = 80): string {
  if (!text) return '';
  const clean = text.replace(/\n+/g, ' ').trim();
  return clean.length > len ? clean.slice(0, len) + '…' : clean;
}

export default async function FindPage() {
  const tenants = await fetchTenants();
  const listed = tenants.filter((t) => t.name && t.eventCount > 0);

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Image src="/icon.png" alt="" width={32} height={32} className="rounded-lg" />
            COMIU
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-sm font-bold text-gray-500">
            <Link href="/guide" className="hover:text-gray-900">ガイド</Link>
            <Link href="/register" className="rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white hover:opacity-90">
              コミュニティを登録
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
          <p className="text-sm font-bold text-[#06C755]">COMIU FIND</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
            あなたに合うコミュニティを探す
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-500">
            大学のサークルがなくても大丈夫。専門学校生・短大生・通信大学生・社会人でも参加できる、
            オープンなスポーツ・交流コミュニティを掲載しています。
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            {['初心者歓迎', '一人参加OK', '社会人OK', '専門学校生OK', '通信大学生OK'].map((tag) => (
              <span key={tag} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-600">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Community list */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        {listed.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center text-sm text-gray-400">
            現在掲載中のコミュニティはありません。
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listed.map((t) => (
              <Link
                key={t.id}
                href={`/clubs/${t.code}`}
                className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  {t.linePictureUrl ? (
                    <img
                      src={t.linePictureUrl}
                      alt={t.name}
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#06C755]/10 text-lg font-bold text-[#06C755]">
                      {t.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">
                      イベント {t.eventCount}件
                    </p>
                  </div>
                </div>

                {/* Description */}
                {t.description && (
                  <p className="mt-3 line-clamp-3 flex-1 text-sm leading-7 text-gray-500">
                    {excerpt(t.description, 120)}
                  </p>
                )}

                <p className="mt-4 text-xs font-bold text-[#06C755] group-hover:underline">
                  詳細を見る →
                </p>
              </Link>
            ))}
          </div>
        )}

        {/* CTA for organizers */}
        <div className="mt-10 rounded-xl border border-[#06C755]/20 bg-[#06C755]/5 px-6 py-8 text-center">
          <p className="text-lg font-bold text-gray-900">
            コミュニティを運営していますか？
          </p>
          <p className="mt-2 text-sm leading-7 text-gray-600">
            COMIUでコミュニティを管理すると、このページに掲載されて参加者が見つけやすくなります。
            予約受付・LINEリマインド・参加費管理もまとめて無料で始められます。
          </p>
          <Link
            href="/register"
            className="mt-5 inline-flex rounded-lg bg-[#06C755] px-6 py-3 text-sm font-bold text-white hover:opacity-90"
          >
            無料でコミュニティを登録する
          </Link>
        </div>
      </section>

      {/* Guide link */}
      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <p className="text-sm font-bold text-gray-700">関連ガイド</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/guide/daigaku-circle-tsukurikata" className="text-[#06C755] hover:underline">
              サークルの立ち上げ方
            </Link>
            <Link href="/guide/shakaijin-circle-kanri" className="text-[#06C755] hover:underline">
              社会人サークルの管理方法
            </Link>
            <Link href="/guide/event-shukyaku-jidouka" className="text-[#06C755] hover:underline">
              集客を自動化する方法
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
