'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, CollabRoster, CollabRosterParticipant } from '@/lib/api';
import { ReservationBadge } from '@/components/ui/StatusBadge';

const POLL_INTERVAL_MS = 15000;
type EditableField = 'referrer' | 'staffNote';

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
  for (const group of groups.values()) {
    group.participants.sort((a, b) => {
      const aReferrer = a.referrer?.trim() ?? '';
      const bReferrer = b.referrer?.trim() ?? '';
      if (aReferrer && !bReferrer) return -1;
      if (!aReferrer && bReferrer) return 1;
      const byReferrer = aReferrer.localeCompare(bReferrer, 'ja');
      if (byReferrer !== 0) return byReferrer;
      return (a.name ?? '').localeCompare(b.name ?? '', 'ja');
    });
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

function DuplicateBadge({ participant, token, onChanged }: { participant: CollabRosterParticipant; token: string; onChanged: () => void }) {
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

  const label = participant.isDuplicateOverride === true ? '重複（手動）' : participant.isDuplicateOverride === false ? '重複なし（手動）' : participant.isDuplicateAuto ? '重複（自動）' : null;

  if (!label) {
    return (
      <button onClick={cycle} disabled={saving} className="text-[10px] text-gray-300 underline disabled:opacity-50">
        重複なし
      </button>
    );
  }
  return (
    <button onClick={cycle} disabled={saving} className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 disabled:opacity-50">
      {label}
    </button>
  );
}

function DuplicateAssignment({ participant, tenants, token, onChanged }: { participant: CollabRosterParticipant; tenants: CollabRoster['tenants']; token: string; onChanged: () => Promise<void> }) {
  const [tenantId, setTenantId] = useState('');
  const [saving, setSaving] = useState(false);

  async function assign() {
    if (!tenantId) return;
    setSaving(true);
    try {
      await api.public.assignCollabRosterTenant(token, participant.id, tenantId);
      await onChanged();
    } catch {
      alert('団体への振り分けに失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <DuplicateBadge participant={participant} token={token} onChanged={onChanged} />
      <div className="flex min-w-48 items-center gap-1.5">
        <select
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
          disabled={saving}
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#06C755] disabled:bg-gray-50"
        >
          <option value="">団体を選択</option>
          {tenants.map((tenant) => (
            <option key={tenant.tenantId} value={tenant.tenantId}>
              {tenant.tenantName}
            </option>
          ))}
        </select>
        <button type="button" onClick={assign} disabled={!tenantId || saving} className="shrink-0 rounded-lg bg-[#06C755] px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-40">
          振り分け
        </button>
      </div>
    </div>
  );
}

export default function CollabRosterPage() {
  const { token } = useParams<{ token: string }>();
  const [roster, setRoster] = useState<CollabRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<string>('all');
  const [edits, setEdits] = useState<Record<string, Partial<Record<EditableField, string>>>>({});
  const [savingAll, setSavingAll] = useState(false);
  const editsRef = useRef(edits);

  useEffect(() => {
    editsRef.current = edits;
  }, [edits]);

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

  useEffect(() => {
    function flushPendingEdits() {
      Object.entries(editsRef.current).forEach(([id, fields]) => {
        Object.entries(fields).forEach(([field, value]) => {
          if (value === undefined) return;
          api.public.updateCollabRosterReservation(token, id, { [field]: value }, { keepalive: true }).catch(() => {});
        });
      });
    }
    window.addEventListener('pagehide', flushPendingEdits);
    window.addEventListener('beforeunload', flushPendingEdits);
    return () => {
      window.removeEventListener('pagehide', flushPendingEdits);
      window.removeEventListener('beforeunload', flushPendingEdits);
    };
  }, [token]);

  async function reload() {
    try {
      setRoster(await api.public.collabRoster(token));
    } catch {
      // Keep the currently displayed roster when a background refresh fails.
    }
  }

  function fieldValue(participant: CollabRosterParticipant, field: EditableField) {
    return edits[participant.id]?.[field] ?? participant[field] ?? '';
  }

  function handleFieldChange(id: string, field: EditableField, value: string) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function saveAll() {
    const pending = Object.entries(edits).filter(([, fields]) => Object.keys(fields).length > 0);
    if (pending.length === 0 || savingAll) return;

    setSavingAll(true);
    const results = await Promise.allSettled(pending.map(([id, fields]) => api.public.updateCollabRosterReservation(token, id, fields)));
    const succeeded = new Map<string, Partial<Record<EditableField, string>>>();
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') succeeded.set(pending[index][0], pending[index][1]);
    });

    if (succeeded.size > 0) {
      setRoster((prev) =>
        prev
          ? {
              ...prev,
              participants: prev.participants.map((participant) => {
                const fields = succeeded.get(participant.id);
                if (!fields) return participant;
                return {
                  ...participant,
                  ...(fields.referrer !== undefined && {
                    referrer: fields.referrer.trim() || null,
                  }),
                  ...(fields.staffNote !== undefined && {
                    staffNote: fields.staffNote.trim() || null,
                  }),
                };
              }),
            }
          : prev,
      );
      setEdits((prev) => {
        const next = { ...prev };
        succeeded.forEach((_, id) => delete next[id]);
        return next;
      });
    }

    if (succeeded.size !== pending.length) {
      alert('一部の保存に失敗しました。未保存の内容は画面に残しています。');
    }
    setSavingAll(false);
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
  const filtered = tab === 'all' ? participants : tab === 'dup' ? participants.filter((p) => p.isDuplicate) : participants.filter((p) => p.tenantId === tab);
  const overallStats = summarize(filtered);
  const tenantGroups = groupByTenant(filtered);

  const tabs = [{ key: 'all', label: '全体' }, ...tenants.map((t) => ({ key: t.tenantId, label: t.tenantName })), { key: 'dup', label: '重複' }];

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="flex items-center justify-between gap-4 bg-[#06C755] px-4 py-5 text-white">
        <div className="min-w-0">
          <p className="text-xs opacity-80">合同開催 参加者名簿</p>
          <h1 className="mt-1 truncate text-base font-bold">{roster.group.label || tenants.map((t) => t.tenantName).join(' × ')}</h1>
        </div>
        <button type="button" onClick={saveAll} disabled={Object.keys(edits).length === 0 || savingAll} className="shrink-0 rounded-lg bg-white px-4 py-2 text-xs font-bold text-[#06C755] disabled:opacity-50">
          {savingAll ? '保存中...' : '保存'}
        </button>
      </div>

      <div className="px-4 pt-4">
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${tab === t.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
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
                          {groupStats.total}人（男{groupStats.male}・女
                          {groupStats.female}）{groupStats.waitlisted > 0 && ` ・未確定${groupStats.waitlisted}`}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {group.participants.map((p) => (
                          <div key={p.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2">
                                {p.linePictureUrl ? <img src={p.linePictureUrl} alt="" className="mt-0.5 h-6 w-6 shrink-0 rounded-full object-cover" /> : <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-gray-200" />}
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
                            <div className="mt-2 pl-8">{tab === 'dup' ? <DuplicateAssignment participant={p} tenants={tenants} token={token} onChanged={reload} /> : <DuplicateBadge participant={p} token={token} onChanged={reload} />}</div>
                            <div className="mt-3 grid gap-2 pl-8">
                              <label className="block">
                                <span className="text-[10px] font-semibold text-gray-400">紹介者</span>
                                <input
                                  value={fieldValue(p, 'referrer')}
                                  onChange={(e) => handleFieldChange(p.id, 'referrer', e.target.value)}
                                  disabled={savingAll}
                                  maxLength={100}
                                  placeholder="例：〇〇の紹介"
                                  className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#06C755] disabled:bg-gray-50"
                                />
                              </label>
                              <label className="block">
                                <span className="text-[10px] font-semibold text-gray-400">コメント</span>
                                <textarea
                                  value={fieldValue(p, 'staffNote')}
                                  onChange={(e) => handleFieldChange(p.id, 'staffNote', e.target.value)}
                                  disabled={savingAll}
                                  maxLength={1000}
                                  rows={2}
                                  placeholder="運営用のコメントを自由に入力"
                                  className="mt-0.5 w-full resize-y rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#06C755] disabled:bg-gray-50"
                                />
                              </label>
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
                      <th className="px-6 py-3 text-left">紹介者</th>
                      <th className="px-6 py-3 text-left">コメント</th>
                      <th className="px-6 py-3 text-left">重複</th>
                    </tr>
                  </thead>
                  {tenantGroups.map(([tenantId, group]) => {
                    const groupStats = summarize(group.participants);
                    return (
                      <tbody key={tenantId} className="divide-y divide-gray-100">
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-6 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-gray-700">{group.tenantName}</span>
                              <span className="text-[11px] text-gray-500">
                                {groupStats.total}人（男{groupStats.male}・女
                                {groupStats.female}）{groupStats.waitlisted > 0 && ` ・未確定${groupStats.waitlisted}`}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {group.participants.map((p) => (
                          <tr key={p.id}>
                            <td className="px-6 py-4 font-medium text-gray-900">
                              <div className="flex items-center gap-2">
                                {p.linePictureUrl ? <img src={p.linePictureUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" /> : <span className="h-6 w-6 shrink-0 rounded-full bg-gray-200" />}
                                {p.name ?? '未入力'}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{p.grade ?? '-'}</td>
                            <td className="px-6 py-4 text-gray-600">{p.gender ?? '-'}</td>
                            <td className="px-6 py-4">
                              <ReservationBadge status={p.status} />
                            </td>
                            <td className="px-6 py-4 align-top">
                              <input
                                value={fieldValue(p, 'referrer')}
                                onChange={(e) => handleFieldChange(p.id, 'referrer', e.target.value)}
                                disabled={savingAll}
                                maxLength={100}
                                placeholder="例：〇〇の紹介"
                                className="w-36 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#06C755] disabled:bg-gray-50"
                              />
                            </td>
                            <td className="px-6 py-4 align-top">
                              <textarea
                                value={fieldValue(p, 'staffNote')}
                                onChange={(e) => handleFieldChange(p.id, 'staffNote', e.target.value)}
                                disabled={savingAll}
                                maxLength={1000}
                                rows={2}
                                placeholder="運営用コメント"
                                className="w-52 resize-y rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#06C755] disabled:bg-gray-50"
                              />
                            </td>
                            <td className="px-6 py-4">{tab === 'dup' ? <DuplicateAssignment participant={p} tenants={tenants} token={token} onChanged={reload} /> : <DuplicateBadge participant={p} token={token} onChanged={reload} />}</td>
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
