import type { Metadata } from 'next';
import Link from 'next/link';

import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description: 'COMIU（コミュ）のプライバシーポリシーです。個人情報の取り扱いについて説明します。',
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    title: 'プライバシーポリシー | COMIU',
    description: 'COMIU（コミュ）のプライバシーポリシーです。',
    url: `${SITE_URL}/privacy`,
    locale: 'ja_JP',
    type: 'website',
  },
};

const SECTIONS = [
  {
    title: '1. 取得する情報',
    body: '当社は以下の情報を取得することがあります。（1）主催者登録時に入力されたメールアドレス・団体名・パスワード（ハッシュ化済み）。（2）LINEログイン・LIFF経由で取得するLINEユーザーID・表示名・プロフィール画像。（3）イベントへの参加申込情報（氏名・参加日時・性別等）。（4）本サービスの利用状況に関するアクセスログ。',
  },
  {
    title: '2. 利用目的',
    body: '取得した情報は以下の目的で利用します。（1）本サービスの提供・運営・改善。（2）主催者へのサービス通知・サポート対応。（3）不正利用の防止および安全管理。（4）利用状況の分析・統計処理（個人を特定しない形式）。',
  },
  {
    title: '3. 第三者提供',
    body: '当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。（1）ユーザーの同意がある場合。（2）法令に基づく場合。（3）本サービスの運営に必要な業務委託先（クラウドサーバー事業者等）への提供（業務委託契約に基づき適切に管理します）。なお、本サービスはLINE株式会社のAPIを利用しており、LINEプラットフォームを経由する情報はLINEのプライバシーポリシーの適用を受けます。',
  },
  {
    title: '4. Cookieおよびアクセス解析',
    body: '本サービスはGoogle Analyticsを使用してアクセス状況を把握しています。Google Analyticsはデータ収集のためCookieを使用しますが、個人を特定する情報は含まれません。Google Analyticsの利用に関してはGoogleのプライバシーポリシーをご参照ください。',
  },
  {
    title: '5. 安全管理',
    body: '当社は個人情報の漏洩・滅失・毀損の防止のため、適切なセキュリティ対策を講じます。パスワードはハッシュ化して保存し、平文での保持は行いません。',
  },
  {
    title: '6. 保存期間',
    body: '個人情報は利用目的達成のために必要な期間保存します。退会後は法令上の保存義務がある場合を除き、合理的な期間内に削除します。',
  },
  {
    title: '7. 開示・訂正・削除',
    body: 'ユーザーは自己の個人情報の開示・訂正・削除を請求できます。ご希望の場合は下記お問い合わせ先までご連絡ください。本人確認の上、法令の範囲内で対応します。',
  },
  {
    title: '8. プライバシーポリシーの変更',
    body: '当社は必要に応じて本ポリシーを変更することがあります。変更後のポリシーはこのページに掲載した時点から効力を生じます。',
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-[#06C755] hover:underline">← ホームへ</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">プライバシーポリシー</h1>
          <p className="text-sm text-gray-500 mt-1">最終更新日：2026年5月27日</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-sm font-bold text-gray-900 mb-1.5">{s.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          個人情報に関するお問い合わせ：{' '}
          <a href="mailto:support@comiu.jp" className="text-[#06C755] hover:underline">support@comiu.jp</a>
        </p>
      </div>
    </div>
  );
}
