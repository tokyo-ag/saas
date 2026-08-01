'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  api,
  formatDate,
  downloadWithAuth,
  API_URL,
  setMobileManageToken,
  Event,
  Reservation,
  MobileManageDisplayFields,
} from '@/lib/api';
import { buildLiffUrl, SITE_URL } from '@/lib/config';
import { EventStatusBadge, ReservationBadge } from '@/components/ui/StatusBadge';
import EventForm from '@/components/admin/EventForm';

type EventReservation = Reservation & {
  member: { id: string; name?: string | null; grade?: string | null; gender?: string | null; level?: string | null };
};

type Tab = 'upcoming' | 'past' | 'draft';
const tabs: { key: Tab; label: string }[] = [
  { key: 'upcoming', label: '予定' },
  { key: 'past', label: '過去' },
  { key: 'draft', label: '下書き' },
];

const displayFieldOptions: { key: keyof MobileManageDisplayFields; label: string; icon: string }[] = [
  { key: 'location', label: '場所', icon: '📍' },
  { key: 'price', label: '参加費', icon: '💴' },
  { key: 'capacity', label: '定員・残席', icon: '👥' },
  { key: 'description', label: '説明文', icon: '📄' },
];

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: '人数管理ってLINEじゃだめですか？',
    a: '結論から言うとLINEでも大丈夫です。ただLINEだけで管理してしまうと、引き抜きや紹介制でのワンマンパワーでしか新規の参加者を獲得できず、質の高いサークルでもいつか、人数が枯渇し衰退してしまいます。COMIUでは、WEB集客で団体の新規参加者を増やすために作りました。',
  },
  {
    q: '参加者名簿って使わなくてもいいですか？',
    a: '使わなくても大丈夫です。ただSEO（WEBサイトの知ってもらう）為にはGoogleから評価を頂くことが大事です。ユーザーがWEBサイトを行き来しするリピーターがいることは評価の対象になるので、参加者名簿をうまく使うことを推奨しています。',
  },
  {
    q: '公式LINEを使った方がいいですか？',
    a: '無理して使わなくても大丈夫です。使わないメリットとしては、実際に直接紹介制にしたほうが参加率が高いというところにあります。ただ開催する度に、個人LINEやグループLINEでの参加の有無を確認する場合、関係性がない限りストレスになり離脱に繋がります。また参加者が月に50人以上いる場合、団体が大きくなるに連れ主催者側の負担が大きくなります。COMIUでは参加者名簿以外に、自動リマインド機能や参加者一斉送信ができるので、仕組み化するで使わない手はありません。',
  },
];

type Session = {
  tenantCode: string;
  tenantName: string;
  tenantIcon: string | null;
  hideLevel: boolean;
  hideLineNotify: boolean;
};

type Screen = { name: 'list' } | { name: 'create' } | { name: 'edit'; id: string } | { name: 'detail'; id: string };

export default function MobileManagePage() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [verifyError, setVerifyError] = useState('');
  const [screen, setScreen] = useState<Screen>({ name: 'list' });

  useEffect(() => {
    if (!token) return;
    api.mobileManage.verify(token)
      .then((res) => {
        setMobileManageToken(res.accessToken);
        setSession({
          tenantCode: res.tenantCode,
          tenantName: res.tenantName,
          tenantIcon: res.tenantIcon,
          hideLevel: res.hideLevel,
          hideLineNotify: res.hideLineNotify,
        });
      })
      .catch(() => setVerifyError('リンクが無効です。主催者に再発行を依頼してください。'));
    return () => setMobileManageToken(null);
  }, [token]);

  if (verifyError) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-center text-sm text-red-500">{verifyError}</div>;
  }
  if (!session) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center gap-2.5 border-b border-gray-200 bg-white px-4 py-3">
        {session.tenantIcon ? (
          <Image src={session.tenantIcon} width={28} height={28} className="h-7 w-7 shrink-0 rounded-lg object-cover" alt="" unoptimized />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#06C755] text-xs font-bold text-white">
            {session.tenantName.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">{session.tenantName}</p>
          <p className="text-[11px] text-gray-400">超簡単モバイル管理</p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-4">
        {screen.name === 'list' && (
          <EventListScreen
            session={session}
            onCreate={() => setScreen({ name: 'create' })}
            onOpen={(id) => setScreen({ name: 'detail', id })}
            onEdit={(id) => setScreen({ name: 'edit', id })}
          />
        )}
        {screen.name === 'create' && (
          <div>
            <ScreenHeader title="新規作成" onBack={() => setScreen({ name: 'list' })} />
            <EventForm simplified hideLevel={session.hideLevel} hideLineNotify={session.hideLineNotify} onSaved={() => setScreen({ name: 'list' })} />
          </div>
        )}
        {screen.name === 'edit' && (
          <EditScreen eventId={screen.id} session={session} onDone={() => setScreen({ name: 'list' })} />
        )}
        {screen.name === 'detail' && (
          <DetailScreen eventId={screen.id} onBack={() => setScreen({ name: 'list' })} onEdit={() => setScreen({ name: 'edit', id: screen.id })} />
        )}
      </main>
    </div>
  );
}

function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← 戻る</button>
      <h1 className="text-lg font-bold text-gray-900">{title}</h1>
    </div>
  );
}

function EditScreen({ eventId, session, onDone }: { eventId: string; session: Session; onDone: () => void }) {
  const [event, setEvent] = useState<Event | null>(null);
  useEffect(() => { api.events.get(eventId).then(setEvent).catch(() => {}); }, [eventId]);
  return (
    <div>
      <ScreenHeader title="編集" onBack={onDone} />
      {event ? (
        <EventForm initial={event} simplified hideLevel={session.hideLevel} hideLineNotify={session.hideLineNotify} onSaved={onDone} onDeleted={onDone} />
      ) : (
        <p className="text-sm text-gray-400">読み込み中...</p>
      )}
    </div>
  );
}

function EventListScreen({
  session,
  onCreate,
  onOpen,
  onEdit,
}: {
  session: Session;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [displayFields, setDisplayFields] = useState<MobileManageDisplayFields | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.events.list().then(setEvents).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    api.mobileManage.getDisplayFields().then(setDisplayFields).catch(() => {});
  }, [load]);

  async function toggleDisplayField(key: keyof MobileManageDisplayFields) {
    if (!displayFields) return;
    const next = { ...displayFields, [key]: !displayFields[key] };
    setDisplayFields(next);
    try {
      const updated = await api.mobileManage.updateDisplayFields({ [key]: next[key] });
      setDisplayFields(updated);
    } catch { /* silent */ }
  }

  async function handleDuplicate(id: string) {
    try {
      const ev = await api.events.get(id);
      const created = await api.events.create({
        title: ev.title,
        description: ev.description,
        heldAt: ev.heldAt,
        endAt: ev.endAt ?? null,
        location: ev.location,
        locationUrl: ev.locationUrl,
        capacity: ev.capacity ?? null,
        capacityMale: ev.capacityMale ?? null,
        capacityFemale: ev.capacityFemale ?? null,
        status: 'open',
        price: ev.price,
        priceMale: ev.priceMale ?? null,
        priceFemale: ev.priceFemale ?? null,
        paymentRequired: ev.paymentRequired,
        paymentTiming: ev.paymentTiming,
        notifyOnReserve: ev.notifyOnReserve,
        notifyOnReserveApp: true,
        remindEnabled: ev.remindEnabled,
        remindApp: ev.remindApp,
        remindAt: ev.remindAt ?? null,
        imageUrl: ev.imageUrl,
        iconUrl: ev.iconUrl,
        category: ev.category ?? null,
        tags: ev.tags ?? [],
      });
      onEdit(created.id);
    } catch (err: any) {
      alert(err.message ?? '複製に失敗しました');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このイベントを削除しますか？')) return;
    try {
      await api.events.delete(id);
      load();
    } catch {
      alert('削除に失敗しました');
    }
  }

  const scheduleUrl = buildLiffUrl(`/liff/${session.tenantCode}`) ?? `${SITE_URL}/liff/${session.tenantCode}`;

  function copyScheduleUrl() {
    navigator.clipboard.writeText(scheduleUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const now = new Date();
  const filtered = events
    .filter((event) => {
      if (tab === 'upcoming') return new Date(event.heldAt) > now && event.status !== 'draft';
      if (tab === 'past') return new Date(event.heldAt) <= now || event.status === 'closed';
      return event.status === 'draft';
    })
    .sort((a, b) => {
      const diff = new Date(a.heldAt).getTime() - new Date(b.heldAt).getTime();
      return tab === 'past' ? -diff : diff;
    });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-gray-900">予約ページ</h1>
        <button type="button" onClick={onCreate} className="rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white hover:bg-[#05a847]">
          新規作成
        </button>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`shrink-0 border-b-2 -mb-px px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.key ? 'border-[#06C755] text-[#06C755]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">読み込み中...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">イベントがありません</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <EventStatusBadge status={event.status} />
                  <span className="truncate text-sm font-bold text-gray-900">{event.title}</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400">{formatDate(event.heldAt)}</p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                <button type="button" onClick={() => onOpen(event.id)} className="rounded-lg bg-[#06C755]/10 px-2.5 py-1.5 text-xs font-bold text-[#06C755]">詳細</button>
                <button type="button" onClick={() => handleDuplicate(event.id)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600">複製</button>
                <button type="button" onClick={() => handleDelete(event.id)} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-500">削除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="mb-2.5 text-xs font-bold text-gray-500">公開サイトに表示する項目</p>
          <div className="flex flex-wrap gap-2">
            {displayFieldOptions.map(({ key, label, icon }) => {
              const on = displayFields?.[key] ?? false;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDisplayField(key)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                    on ? 'border-[#06C755] bg-[#06C755]/8 text-[#06C755]' : 'border-gray-200 bg-gray-50 text-gray-400 line-through'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[#06C755]/30 bg-[#06C755]/5 p-4">
          <p className="mb-1 text-sm font-bold text-[#06C755]">☆ COMIUの運営ポイント</p>
          <p className="mb-3 text-xs font-medium text-gray-700">イベントスケジュールのURL</p>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex-1 truncate rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-600">{scheduleUrl}</span>
            <button type="button" onClick={copyScheduleUrl} className="shrink-0 rounded-lg bg-[#06C755] px-4 py-2 text-xs font-bold text-white hover:bg-[#05a847]">
              {copied ? 'コピー済み ✓' : 'コピー'}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-gray-500">このURLリンクを共有または公式LINEのチャットに貼ると、団体の活動スケジュールを直接共有できます！</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-bold text-gray-500">よくある質問</p>
          <div className="space-y-1.5">
            {FAQ_ITEMS.map((item, i) => (
              <details key={i} className="group rounded-lg border border-gray-100 px-3 py-2 open:bg-gray-50">
                <summary className="cursor-pointer list-none text-sm font-bold text-gray-800 marker:content-none">
                  <span className="mr-1.5 inline-block text-gray-400 transition-transform group-open:rotate-90">▶</span>
                  {item.q}
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-gray-500">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailScreen({ eventId, onBack, onEdit }: { eventId: string; onBack: () => void; onEdit: () => void }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [reservations, setReservations] = useState<EventReservation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [eventData, reservationList] = await Promise.all([
      api.events.get(eventId),
      api.events.reservations(eventId),
    ]);
    setEvent(eventData);
    setReservations(reservationList as EventReservation[]);
  }, [eventId]);

  useEffect(() => { load().catch(() => {}).finally(() => setLoading(false)); }, [load]);

  async function updateStatus(reservationId: string, status: string) {
    try {
      await api.reservations.updateStatus(reservationId, status);
      const updated = await api.events.reservations(eventId);
      setReservations(updated as EventReservation[]);
    } catch {
      alert('ステータスの更新に失敗しました');
    }
  }

  if (loading) return <p className="text-sm text-gray-400">読み込み中...</p>;
  if (!event) return <p className="text-sm text-red-500">イベントが見つかりません</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <ScreenHeader title={event.title} onBack={onBack} />
        <button type="button" onClick={onEdit} className="shrink-0 rounded-lg bg-[#06C755] px-4 py-2 text-xs font-bold text-white hover:bg-[#05a847]">
          編集
        </button>
      </div>
      <p className="-mt-2 mb-4 text-sm text-gray-500">{formatDate(event.heldAt)} ・ {event.location}</p>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">参加者名簿（{reservations.length}件）</h2>
        </div>
        {reservations.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">まだ予約はありません</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reservations.map((reservation) => (
              <div key={reservation.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {reservation.member.name ?? '未入力'}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                      <span>{reservation.member.grade ?? '-'}</span>
                      <span>{reservation.member.gender ?? '-'}</span>
                      {event.levelEnabled && <span>{reservation.member.level ?? '-'}</span>}
                    </div>
                  </div>
                  <ReservationBadge status={reservation.status} />
                </div>
                <p className="mt-2 text-xs text-gray-500">予約日時: {formatDate(reservation.reservedAt)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {reservation.status === 'reserved' && (
                    <button onClick={() => updateStatus(reservation.id, 'attended')} className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                      参加済みにする
                    </button>
                  )}
                  {['reserved', 'waitlisted', 'attended'].includes(reservation.status) && (
                    <button onClick={() => updateStatus(reservation.id, 'cancelled')} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600">
                      キャンセル
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800">データエクスポート</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-400">参加者一覧・予約状況をCSVファイルでダウンロードできます。</p>
        <button
          onClick={() => downloadWithAuth(`${API_URL}/api/admin/events/${eventId}/export`, `event-${eventId}.csv`).catch(() => alert('ダウンロードに失敗しました'))}
          className="mt-3 flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          CSVダウンロード
        </button>
      </section>
    </div>
  );
}
