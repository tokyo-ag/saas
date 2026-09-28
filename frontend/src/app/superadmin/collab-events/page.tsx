'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, TenantWithStats, CollabGroupAdmin } from '@/lib/api';
import { SITE_URL } from '@/lib/config';

type DraftEvent = { tenantId: string; tenantName: string; eventId: string; eventTitle: string };
type TenantEventOption = { id: string; title: string; heldAt: string };

export default function SuperadminCollabEventsPage() {
  const [tenants, setTenants] = useState<TenantWithStats[]>([]);
  const [groups, setGroups] = useState<CollabGroupAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 新規作成フォーム
  const [draft, setDraft] = useState<DraftEvent[]>([]);
  const [draftLabel, setDraftLabel] = useState('');
  const [pickerTenantId, setPickerTenantId] = useState('');
  const [pickerEvents, setPickerEvents] = useState<TenantEventOption[]>([]);
  const [pickerEventId, setPickerEventId] = useState('');
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([api.superadmin.list(), api.superadmin.collabGroups()])
      .then(([t, g]) => {
        setTenants(t);
        setGroups(g);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!pickerTenantId) {
      setPickerEvents([]);
      setPickerEventId('');
      return;
    }
    api.superadmin.listTenantEventsForCollab(pickerTenantId).then((events) => {
      setPickerEvents(events);
      setPickerEventId('');
    });
  }, [pickerTenantId]);

  function addToDraft() {
    if (!pickerTenantId || !pickerEventId) return;
    if (draft.length >= 4) {
      alert('1グループにつき4件までです');
      return;
    }
    if (draft.some((d) => d.eventId === pickerEventId)) return;
    const tenant = tenants.find((t) => t.id === pickerTenantId);
    const event = pickerEvents.find((e) => e.id === pickerEventId);
    if (!tenant || !event) return;
    setDraft((prev) => [
      ...prev,
      { tenantId: tenant.id, tenantName: tenant.lineDisplayName ?? tenant.name, eventId: event.id, eventTitle: event.title },
    ]);
    setPickerEventId('');
  }

  function removeFromDraft(eventId: string) {
    setDraft((prev) => prev.filter((d) => d.eventId !== eventId));
  }

  async function createGroup() {
    if (draft.length < 2) {
      alert('2件以上のイベントを追加してください');
      return;
    }
    setCreating(true);
    try {
      await api.superadmin.createCollabGroup({ eventIds: draft.map((d) => d.eventId), label: draftLabel || undefined });
      setDraft([]);
      setDraftLabel('');
      setPickerTenantId('');
      load();
    } catch (e: any) {
      alert(e.message ?? '作成に失敗しました');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(group: CollabGroupAdmin) {
    await api.superadmin.updateCollabGroup(group.id, { active: !group.active });
    load();
  }

  async function updateLabel(group: CollabGroupAdmin, label: string) {
    await api.superadmin.updateCollabGroup(group.id, { label });
    load();
  }

  async function removeEvent(group: CollabGroupAdmin, eventId: string) {
    if (!confirm('このイベントをコラボグループから外しますか？')) return;
    await api.superadmin.removeCollabGroupEvent(group.id, eventId);
    load();
  }

  async function deleteGroup(group: CollabGroupAdmin) {
    if (!confirm('このコラボグループを削除しますか？統合閲覧リンクも無効になります。')) return;
    await api.superadmin.deleteCollabGroup(group.id);
    load();
  }

  function copyUrl(group: CollabGroupAdmin) {
    navigator.clipboard.writeText(`${SITE_URL}/collab-roster/${group.viewToken}`).then(() => {
      setCopiedId(group.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">コラボイベント管理</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">合同開催イベントの参加者名簿を統合表示するリンクを発行します</p>
          </div>
          <Link href="/superadmin" className="text-sm text-gray-500 hover:text-gray-700 shrink-0">← 戻る</Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        <p className="text-xs leading-relaxed text-gray-400 bg-white border border-gray-200 rounded-xl p-4">
          対応するコラボ申請は「COMIU サポート」でご確認ください（自動連携はされません。両団体に確認の上、以下でイベントを手動で紐づけてください）。
        </p>

        <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">新しいグループを作成</h2>

          {draft.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {draft.map((d) => (
                <span key={d.eventId} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  {d.tenantName} / {d.eventTitle}
                  <button onClick={() => removeFromDraft(d.eventId)} className="text-gray-400 hover:text-gray-600">×</button>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={pickerTenantId}
              onChange={(e) => setPickerTenantId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">団体を選択</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.lineDisplayName ?? t.name}</option>
              ))}
            </select>
            <select
              value={pickerEventId}
              onChange={(e) => setPickerEventId(e.target.value)}
              disabled={!pickerTenantId}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">イベントを選択</option>
              {pickerEvents.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
            <button
              onClick={addToDraft}
              disabled={!pickerEventId}
              className="shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              追加
            </button>
          </div>

          <input
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            placeholder="グループのラベル（任意・運営内部の識別用）"
            className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />

          <button
            onClick={createGroup}
            disabled={creating || draft.length < 2}
            className="mt-3 rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
          >
            {creating ? '作成中...' : 'グループを作成'}
          </button>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-800 mb-3">既存のグループ</h2>
          {loading ? (
            <p className="text-sm text-gray-400">読み込み中...</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-gray-400">まだコラボグループはありません</p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <input
                      defaultValue={group.label ?? ''}
                      onBlur={(e) => updateLabel(group, e.target.value)}
                      placeholder="ラベル未設定"
                      className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-sm font-semibold text-gray-800 hover:border-gray-200 focus:border-gray-300 focus:outline-none"
                    />
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={group.active}
                        onClick={() => toggleActive(group)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${group.active ? 'bg-[#06C755]' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${group.active ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <button onClick={() => deleteGroup(group)} className="text-xs text-red-500 hover:underline">削除</button>
                    </div>
                  </div>

                  <ul className="mt-2 space-y-1">
                    {group.eventLinks.map((link) => (
                      <li key={link.eventId} className="flex items-center justify-between gap-2 text-sm text-gray-600">
                        <span className="truncate">
                          {link.event.tenant.lineDisplayName ?? link.event.tenant.name} / {link.event.title}
                        </span>
                        <button onClick={() => removeEvent(group, link.eventId)} className="shrink-0 text-xs text-gray-400 hover:text-red-500">外す</button>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      readOnly
                      value={`${SITE_URL}/collab-roster/${group.viewToken}`}
                      onFocus={(e) => e.target.select()}
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
                    />
                    <button
                      onClick={() => copyUrl(group)}
                      className="shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {copiedId === group.id ? 'コピーしました' : 'コピー'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
