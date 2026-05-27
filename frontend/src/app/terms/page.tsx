import type { Metadata } from 'next';
import Link from 'next/link';

import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: '利用規約',
  description: 'COMIU（コミュ）の利用規約です。サービスをご利用の前にお読みください。',
  alternates: { canonical: `${SITE_URL}/terms` },
  openGraph: {
    title: '利用規約 | COMIU',
    description: 'COMIU（コミュ）の利用規約です。',
    url: `${SITE_URL}/terms`,
    locale: 'ja_JP',
    type: 'website',
  },
};

const SECTIONS = [
  {
    title: '第1条（適用）',
    body: '本規約は、COMIU（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーは本規約に同意した上で本サービスを利用するものとします。',
  },
  {
    title: '第2条（利用登録）',
    body: '主催者登録を希望する方は、メールアドレスおよびパスワードを入力し、本サービスが定める方法で登録申請を行うものとします。当社が登録を承認した時点で利用契約が成立します。未成年者が利用する場合は、法定代理人の同意が必要です。',
  },
  {
    title: '第3条（アカウント管理）',
    body: 'ユーザーはパスワードを自己の責任で管理するものとし、第三者に開示・譲渡・貸与することはできません。アカウントの不正利用により生じた損害について、当社は一切の責任を負いません。',
  },
  {
    title: '第4条（料金・支払）',
    body: '本サービスには無料プランおよび有料プランがあります。有料プランの利用料金は料金ページに記載のとおりです。支払いが完了しない場合、有料機能の提供を停止することがあります。',
  },
  {
    title: '第5条（禁止事項）',
    body: '以下の行為を禁止します。（1）法令または公序良俗に反する行為。（2）虚偽の情報を登録する行為。（3）本サービスの運営を妨害する行為。（4）他のユーザーへの迷惑行為またはハラスメント。（5）当社の知的財産権を侵害する行為。（6）その他、当社が不適切と判断する行為。',
  },
  {
    title: '第6条（サービスの変更・停止）',
    body: '当社は、ユーザーへの事前通知なく、本サービスの内容を変更または提供を停止することができます。これによりユーザーに生じた損害について、当社は責任を負いません。',
  },
  {
    title: '第7条（免責事項）',
    body: '当社は、本サービスに関して、明示または黙示を問わず、完全性・正確性・有用性等についていかなる保証も行いません。本サービスの利用に起因してユーザーに生じた損害について、当社の故意または重大な過失による場合を除き、責任を負いません。',
  },
  {
    title: '第8条（解約）',
    body: 'ユーザーはいつでも管理画面またはメールによる連絡で本サービスを退会できます。退会後、登録情報は当社のプライバシーポリシーに従って処理されます。',
  },
  {
    title: '第9条（準拠法・管轄）',
    body: '本規約は日本法に基づき解釈されます。本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-[#06C755] hover:underline">← ホームへ</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">利用規約</h1>
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
          ご不明な点は{' '}
          <a href="mailto:support@comiu.jp" className="text-[#06C755] hover:underline">support@comiu.jp</a>
          {' '}までお問い合わせください。
        </p>
      </div>
    </div>
  );
}
