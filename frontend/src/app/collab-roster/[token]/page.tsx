'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, CollabRoster, CollabRosterParticipant } from '@/lib/api';
import { ReservationBadge } from '@/components/ui/StatusBadge';

const POLL_INTERVAL_MS = 15000;

function summarize(participants: CollabRosterParticipant[]) {
  const active = participants.filter((p) => p.status !== 'waitlisted');
  return {
    total: active.length,
    male: active.filter((p) => p.gender === '男性').length,
    female: active.filter((p) => p.gender === '女性').length,
    waitlisted: participants.length - active.length,
  };
}

function groupByTenant(participants: CollabRosterParticipant[]) {
  const groups = new Map<string, { tenantName: string; participants: CollabRosterParticipant[] }>();
  for (const p of participants) {
    if (!groups.has(p.tenantId)) groups.set(p.tenantId, { tenantName: p.tenantName, participants: [] });
    groups.get(p.tenantId)!.participants.push(p);
  }
  return Array.from(groups.entries()).sort(([, a], [, b]) => a.tenantName.localeCompare(b.tenantName, 'ja'));
}

function SummaryBar({ stats }: { stats: ReturnType<typeof summarize> }) {
  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-3">
      <div className="rounded-lg bg-gray-50 p-2 text-center">
        <p className="text-[10px] text-gray-400">合計</p>
        <p className="text-base font-bold text-gray-900">{stats.total}</p>
      </div>
      <div className="rounded-lg bg-gray-50 p-2 text-center">
        <p className="text-[10px] text-gray-400">男性</p>
        <p className="text-base font-bold text-blue-600">{stats.male}</p>
      </div>
      <div className="rounded-lg bg-gray-50 p-2 text-center">
        <p className="text-[10px] text-gray-400">女性</p>
        <p className="text-base font-bold text-pink-500">{stats.female}</p>
      </div>
      <div className="rounded-lg bg-gray-50 p-2 text-center">
        <p className="text-[10px] text-gray-400">未確定</p>
        <p className="text-base font-bold text-amber-600">{stats.waitlisted}</p>
      </div>
    </div>
  );
}

function DuplicateBadge({
  participant,
  token,
  onChanged,
}: {
  participant: CollabRosterParticipant;
  token: string;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function cycle() {
    setSaving(true);
    try {
      if (participant.isDuplicateOverride === null) {
        // 自動判定中 → 手動で反転させる
        await api.public.setCollabDuplicate(token, participant.id, !participant.isDuplicateAuto);
      } else {
        // 手動設定済み → 自動判定に戻す
        await api.public.clearCollabDuplicate(token, participant.id);
      }
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  const label =
    participant.isDuplicateOverride === true
      ? '重複（手動）'
      : participant.isDuplicateOverride === false
        ? '重複なし（手動）'
        : participant.isDuplicateAuto
          ? '重複（自動）'
          : null;

  if (!label) {
    return (
      <button onClick={cycle} disabled={saving} className="text-[10px] text-gray-300 underline disabled:opacity-50">
        重複なし
      </button>
    );
  }
  return (
    <button
      onClick={cycle}
      disabled={saving}
      className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 disabled:opacity-50"
    >
      {label}
    </button>
  );
}

export default function CollabRosterPage() {
  const { token } = useParams<{ token: string }>();
  const [roster, setRoster] = useState<CollabRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    function load() {
      api.public
        .collabRoster(token)
        .then((data) => {
          if (!cancelled) setRoster(data);
        })
        .catch(() => {
          if (!cancelled) setNotFound(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  function reload() {
    api.public.collabRoster(token).then(setRoster).catch(() => {});
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#06C755] text-sm">読み込み中...</div>
      </div>
    );
  }

  if (notFound || !roster) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-lg font-bold text-gray-900">このリンクは無効です</p>
        <p className="text-sm text-gray-500">連携が停止されたか、リンクが正しくない可能性があります。</p>
      </div>
    );
  }

  const { tenants, participants } = roster;
  const filtered =
    tab === 'all' ? participants : tab === 'dup' ? participants.filter((p) => p.isDuplicate) : participants.filter((p) => p.tenantId === tab);
  const overallStats = summarize(filtered);
  const tenantGroups = groupByTenant(filtered);

  const tabs = [
    { key: 'all', label: '全体' },
    ...tenants.map((t) => ({ key: t.tenantId, label: t.tenantName })),
    { key: 'dup', label: '重複' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-[#06C755] text-white px-4 py-5">
        <p className="text-xs opacity-80">合同開催 参加者名簿</p>
        <h1 className="text-base font-bold mt-1">{roster.group.label || tenants.map((t) => t.tenantName).join(' × ')}</h1>
      </div>

      <div className="px-4 pt-4">
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === t.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-5">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">参加者一覧 ({filtered.length}件)</h2>
          </div>
          {filtered.length > 0 && <SummaryBar stats={overallStats} />}

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">該当する参加者はいません</div>
          ) : (
            <>
              {/* モバイル：団体グループごとに見出し＋カード */}
              <div className="md:hidden">
                {tenantGroups.map(([tenantId, group]) => {
                  const groupStats = summarize(group.participants);
                  return (
                    <div key={tenantId} className="border-t border-gray-100">
                      <div className="flex items-center justify-between gap-2 bg-gray-50 px-4 py-2">
                        <span className="text-xs font-bold text-gray-700">{group.tenantName}</span>
                        <span className="text-[11px] text-gray-500">
                          {groupStats.total}人（男{groupStats.male}・女{groupStats.female}）
                          {groupStats.waitlisted > 0 && ` ・未確定${groupStats.waitlisted}`}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {group.participants.map((p) => (
                          <div key={p.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2">
                                {p.linePictureUrl ? (
                                  <img src={p.linePictureUrl} alt="" className="mt-0.5 h-6 w-6 shrink-0 rounded-full object-cover" />
                                ) : (
                                  <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-gray-200" />
                                )}
                                <div>
                                  <p className="text-sm font-bold text-gray-900">{p.name ?? '未入力'}</p>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                                    <span>{p.grade ?? '-'}</span>
                                    <span>{p.gender ?? '-'}</span>
                                  </div>
                                </div>
                              </div>
                              <ReservationBadge status={p.status} />
                            </div>
                            <div className="mt-2 pl-8">
                              <DuplicateBadge participant={p} token={token} onChanged={reload} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* デスクトップ：1つの表の中で団体グループごとにtbodyを分ける */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left">名前</th>
                      <th className="px-6 py-3 text-left">年齢</th>
                      <th className="px-6 py-3 text-left">性別</th>
                      <th className="px-6 py-3 text-left">ステータス</th>
                      <th className="px-6 py-3 text-left">重複</th>
                    </tr>
                  </thead>
                  {tenantGroups.map(([tenantId, group]) => {
                    const groupStats = summarize(group.participants);
                    return (
                      <tbody key={tenantId} className="divide-y divide-gray-100">
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-6 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-gray-700">{group.tenantName}</span>
                              <span className="text-[11px] text-gray-500">
                                {groupStats.total}人（男{groupStats.male}・女{groupStats.female}）
                                {groupStats.waitlisted > 0 && ` ・未確定${groupStats.waitlisted}`}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {group.participants.map((p) => (
                          <tr key={p.id}>
                            <td className="px-6 py-4 font-medium text-gray-900">
                              <div className="flex items-center gap-2">
                                {p.linePictureUrl ? (
                                  <img src={p.linePictureUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                                ) : (
                                  <span className="h-6 w-6 shrink-0 rounded-full bg-gray-200" />
                                )}
                                {p.name ?? '未入力'}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{p.grade ?? '-'}</td>
                            <td className="px-6 py-4 text-gray-600">{p.gender ?? '-'}</td>
                            <td className="px-6 py-4">
                              <ReservationBadge status={p.status} />
                            </td>
                            <td className="px-6 py-4">
                              <DuplicateBadge participant={p} token={token} onChanged={reload} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    );
                  })}
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
