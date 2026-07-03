'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, LiffEvent, LiffProfile, LiffTenant, setLiffToken, formatDate } from '@/lib/api';
import { buildLiffUrl } from '@/lib/config';
import { getLineToken, getLineUser, startLineLogin } from '@/lib/lineLogin';

const LINE_CHANNEL_ID = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID ?? '';

const GRADES = ['高校1年', '高校2年', '高校3年', '大学1年', '大学2年', '大学3年', '大学4年', '大学院生', '社会人', 'その他'];
const GENDERS = ['男性', '女性', 'その他・回答しない'];

function ReservePageInner() {
  const { tenantCode, eventId } = useParams<{ tenantCode: string; eventId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultStatus = searchParams.get('status');
  const resultOrder = searchParams.get('order');
  const isResultView = resultStatus !== null;
  const isWaitlist = isResultView ? resultStatus === 'waitlisted' : searchParams.get('waitlist') === '1';

  const eventDetailPath = `/clubs/${tenantCode}/events/${eventId}`;
  const reservePath = `/clubs/${tenantCode}/events/${eventId}/reserve${isWaitlist ? '?waitlist=1' : ''}`;
  const liffReservePath = `/liff/${tenantCode}/events/${eventId}/reserve${isWaitlist ? '?waitlist=1' : ''}`;

  const [authChecked, setAuthChecked] = useState(false);
  const [lineUserId, setLineUserId] = useState('');
  const [lineProfile, setLineProfile] = useState<{ displayName: string; pictureUrl?: string } | null>(null);
  const [event, setEvent] = useState<LiffEvent | null>(null);
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getLineToken();
    if (!token) {
      if (!LINE_CHANNEL_ID) {
        window.location.href = buildLiffUrl(liffReservePath, { directInLineBrowser: true }) ?? liffReservePath;
        return;
      }
      startLineLogin(LINE_CHANNEL_ID, reservePath);
      return;
    }
    setLiffToken(token);
    const user = getLineUser();
    if (user) {
      setLineUserId(user.userId);
      setLineProfile({ displayName: user.displayName, pictureUrl: user.pictureUrl });
    }
    setAuthChecked(true);

    api.liff.event(tenantCode, eventId).then(setEvent).catch(() => {});
    if (user) {
      api.liff.profile(tenantCode, user.userId).then(setProfile).catch(() => {});
    }
  }, [tenantCode, eventId, reservePath, liffReservePath]);

  async function submit(overrides?: { name: string; grade: string; gender: string }) {
    if (!lineUserId) return;
    setError('');
    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        eventId,
        ...(lineProfile?.displayName && { lineDisplayName: lineProfile.displayName }),
        ...(lineProfile?.pictureUrl && { linePictureUrl: lineProfile.pictureUrl }),
        ...(overrides ?? {}),
      };
      const result = await api.liff.reserve(tenantCode, body as any);
      if (result.stripeCheckoutUrl) {
        window.location.href = result.stripeCheckoutUrl;
        return;
      }
      router.replace(`/clubs/${tenantCode}/reserve`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '予約に失敗しました';
      const isDuplicate = msg.includes('予約済み') || msg.includes('同じ日');
      if (isDuplicate) {
        alert('既に予約済みです');
        router.push(eventDetailPath);
        return;
      }
      if (msg.includes('Unauthorized') || msg.includes('LINEトークン')) {
        if (!LINE_CHANNEL_ID) {
          window.location.href = buildLiffUrl(liffReservePath, { directInLineBrowser: true }) ?? liffReservePath;
          return;
        }
        startLineLogin(LINE_CHANNEL_ID, reservePath);
        return;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:border-transparent';

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#06C755]" />
      </div>
    );
  }

  if (isResultView) {
    const isWL = resultStatus === 'waitlisted';
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-6 ${isWL ? 'bg-yellow-100' : 'bg-[#06C755]/10'}`}>
          {isWL ? '⏳' : '✓'}
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {isWL ? `キャンセル待ち\n${resultOrder}番目に登録しました` : 'ご予約ありがとうございます！'}
        </h1>
        {!isWL && <p className="text-sm text-gray-500 mb-6">連絡に主催者が詳細を送ります。</p>}
        {event && (
          <div className="w-full max-w-sm mt-2 mb-8 bg-white/85 rounded-2xl border border-gray-100 shadow-sm p-5 text-left space-y-2">
            <p className="font-semibold text-gray-900 text-sm">{event.title}</p>
            <p className="text-xs text-gray-500">📅 {formatDate(event.heldAt)}</p>
            <p className="text-xs text-gray-500">📍 {event.location}</p>
          </div>
        )}
        <button
          onClick={() => router.push(`/clubs/${tenantCode}/reserve`)}
          className="w-full max-w-sm bg-[#06C755] text-white py-4 rounded-2xl font-bold text-base active:bg-[#05a847] transition-colors shadow-sm"
        >
          イベント一覧に戻る
        </button>
      </div>
    );
  }

  if (event && (event.status === 'closed' || new Date(event.heldAt).getTime() < Date.now())) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#06C755]/10 flex items-center justify-center text-3xl">⚠️</div>
        <p className="text-lg font-bold text-gray-900">このイベントは予約できません</p>
        <button onClick={() => router.push(eventDetailPath)}
          className="bg-[#06C755] text-white font-bold px-8 py-3.5 rounded-2xl text-sm">
          イベントページへ戻る
        </button>
      </div>
    );
  }

  const hasProfile = profile?.name && profile?.grade && profile?.gender;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-[#06C755] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push(eventDetailPath)} className="text-white text-xl leading-none">‹</button>
        <h1 className="text-base font-bold">{isWaitlist ? 'キャンセル待ち登録' : '予約確認'}</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        {lineProfile && (
          <div className="bg-white/85 rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            {lineProfile.pictureUrl && (
              <img src={lineProfile.pictureUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
            )}
            <div>
              <p className="text-xs text-gray-400">LINEログイン済み</p>
              <p className="text-sm font-bold text-gray-900">{lineProfile.displayName}</p>
            </div>
          </div>
        )}

        {event && (
          <div className="bg-white/85 rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="font-semibold text-gray-900 text-sm">{event.title}</p>
            <p className="text-xs text-[#06C755] mt-1">{event.location}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {hasProfile ? (
          <>
            <div className="bg-white/85 rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <p className="text-xs font-medium text-gray-500 mb-1">参加者情報</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">お名前</span>
                <span className="font-medium text-gray-900">{profile!.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">学年</span>
                <span className="font-medium text-gray-900">{profile!.grade}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">性別</span>
                <span className="font-medium text-gray-900">{profile!.gender}</span>
              </div>
            </div>
            <button onClick={() => submit()} disabled={submitting}
              className="w-full bg-[#06C755] text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:bg-[#05a847] transition-colors shadow-sm">
              {submitting ? '送信中...' : isWaitlist ? 'キャンセル待ちに登録する' : '予約を確定する'}
            </button>
          </>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); submit({ name, grade, gender }); }} className="space-y-4">
            <p className="text-xs text-gray-500 px-1">初回のみ情報を入力してください。次回以降は省略できます。</p>
            <div className="bg-white/85 rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">お名前 <span className="text-red-400">*</span></label>
                <input required minLength={1} maxLength={50} value={name} onChange={(e) => setName(e.target.value)} placeholder="山田太郎" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">学年 <span className="text-red-400">*</span></label>
                <select required value={grade} onChange={(e) => setGrade(e.target.value)} className={inputClass}>
                  <option value="">選択してください</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">性別 <span className="text-red-400">*</span></label>
                <div className="flex gap-4">
                  {GENDERS.map((g) => (
                    <label key={g} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                      <input type="radio" name="gender" value={g} required checked={gender === g} onChange={() => setGender(g)} className="accent-[#06C755]" />
                      {g}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button type="submit" disabled={submitting}
              className="w-full bg-[#06C755] text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:bg-[#05a847] transition-colors shadow-sm">
              {submitting ? '送信中...' : isWaitlist ? 'キャンセル待ちに登録する' : '予約を確定する'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function PublicReserveFormPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#06C755]" />
      </div>
    }>
      <ReservePageInner />
    </Suspense>
  );
}
