import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-8 text-center gap-5">
      <div className="w-16 h-16 rounded-full bg-[#06C755]/10 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06C755" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <div>
        <p className="text-lg font-bold text-gray-800">現在は招待制です</p>
        <p className="text-sm text-gray-400 mt-1 leading-relaxed">
          COMIUへの参加は招待制となっています。<br />
          ご興味のある方はお問い合わせください。
        </p>
      </div>
      <Link href="/" className="bg-[#06C755] text-white font-bold text-sm px-8 py-3 rounded-full">
        ホームへ戻る
      </Link>
    </div>
  );
}
