'use client';

import { useEffect, useState } from 'react';
import { api, TenantWithStats, BannedUser } from '@/lib/api';

export default function SuperadminPage() {
  const [tab, setTab] = useState<'tenants' | 'users'>('tenants');
  const [tenants, setTenants] = useState<TenantWithStats[]>([]);
  const [banned, setBanned] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<TenantWithStats | null>(null);
  const [showBanUserForm, setShowBanUserForm] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.superadmin.list(), api.superadmin.listBannedUsers()])
      .then(([t, b]) => { setTenants(t); setBanned(b); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handleDeactivate(id: string, name: string) {
    if (!confirm(`「${name}」を無効化しますか？\nデータは保持されます。後から復元できます。`)) return;
    await api.superadmin.deactivate(id);
    load();
  }

  async function handleRestore(id: string) {
    try {
      await api.superadmin.restore(id);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleBanTenant(id: string, name: string) {
    if (!confirm(`「${name}」を永久BANしますか？\n復元できません。データは保持されますが、この団体のサービス利用を永久に停止します。`)) return;
    await api.superadmin.ban(id);
    load();
  }

  async function handlePurge(id: string, name: string) {
    if (!confirm(`「${name}」を完全削除しますか？\nイベント・参加者・予約データがすべて消えます。この操作は取り消せません。`)) return;
    await api.superadmin.purge(id);
    load();
  }

  async function handleUnbanUser(lineUserId: string) {
    if (!confirm(`このユーザーのBANを解除しますか？`)) return;
    await api.superadmin.unbanUser(lineUserId);
    load();
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">COMIU 管理</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">団体・ユーザーの管理</p>
          </div>
          <div className="flex items-center gap-3">
          <a href="/superadmin/support" className="text-sm text-gray-500 hover:text-gray-700 shrink-0">COMIU サポート</a>
          {tab === 'tenants' ? (
            <button
              onClick={() => setShowCreate(true)}
              className="bg-[#06C755] text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#05a847] transition-colors shrink-0"
            >
              ＋ 団体を追加
            </button>
          ) : (
            <button
              onClick={() => setShowBanUserForm(true)}
              className="bg-red-500 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors shrink-0"
            >
              🚫 ユーザーをBAN
            </button>
          )}
          </div>
        </div>
      </div>

      {/* タブ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('tenants')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'tenants' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            団体一覧
          </button>
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            BANユーザー {banned.length > 0 && <span className="ml-1 text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">{banned.length}</span>}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
        {loading ? (
          <p className="text-gray-400 text-sm">読み込み中...</p>
        ) : tab === 'tenants' ? (
          <div className="space-y-3">
            {tenants.map((t) => {
              const isBanned = !!t.bannedAt;
              const isDeactivated = !!t.deletedAt && !isBanned;
              return (
                <div key={t.id} className={`bg-white rounded-xl border shadow-sm p-4 sm:p-5 ${isBanned ? 'border-red-300 opacity-70' : isDeactivated ? 'border-orange-200 opacity-70' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3 sm:gap-4">
                    {t.linePictureUrl ? (
                      <img src={t.linePictureUrl} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-gray-200 shrink-0" alt="" />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#06C755]/10 flex items-center justify-center shrink-0 text-lg font-bold text-[#06C755]">
                        {(t.lineDisplayName ?? t.name).slice(0, 1)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{t.lineDisplayName ?? t.name}</p>
                        {t.lineDisplayName && t.lineDisplayName !== t.name && (
                          <span className="text-xs text-gray-400 hidden sm:inline">({t.name})</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.plan === 'standard' ? 'bg-[#06C755]/10 text-[#06C755]' : t.plan === 'pro' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                          {t.plan === 'standard' ? 'スタンダード' : t.plan === 'pro' ? 'プロ' : 'フリー'}
                        </span>
                        {isBanned && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">🚫 永久BAN</span>
                        )}
                        {isDeactivated && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">無効</span>
                        )}
                      </div>
                      {t.description && <p className="text-xs sm:text-sm text-gray-500 truncate">{t.description}</p>}
                      {t.organizerEmail && <p className="text-xs text-gray-400 truncate mt-0.5">{t.organizerEmail}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        参加者 {t.memberCount}人 · {new Date(t.createdAt).toLocaleDateString('ja-JP')}登録
                        {isBanned && ` · BAN: ${new Date(t.bannedAt!).toLocaleDateString('ja-JP')}`}
                        {isDeactivated && ` · 無効化: ${new Date(t.deletedAt!).toLocaleDateString('ja-JP')}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap">
                    {!t.deletedAt && (
                      <button
                        onClick={async () => {
                          try {
                            const { token } = await api.superadmin.impersonate(t.id);
                            window.open(`/impersonate?token=${encodeURIComponent(token)}`, '_blank');
                          } catch (e: any) {
                            alert(e.message ?? '管理画面を開けませんでした');
                          }
                        }}
                        className="text-sm text-[#06C755] hover:underline"
                      >管理画面 →</button>
                    )}
                    {!isBanned && <button onClick={() => setEditTarget(t)} className="text-sm text-gray-600 hover:underline">編集</button>}
                    {isBanned ? (
                      <button onClick={() => handlePurge(t.id, t.name)} className="text-sm text-red-500 hover:underline">完全削除</button>
                    ) : isDeactivated ? (
                      <>
                        <button onClick={() => handleRestore(t.id)} className="text-sm text-[#06C755] hover:underline">復元</button>
                        <button onClick={() => handleBanTenant(t.id, t.name)} className="text-sm text-red-600 font-medium hover:underline">🚫 永久BAN</button>
                        <button onClick={() => handlePurge(t.id, t.name)} className="text-sm text-red-400 hover:underline">完全削除</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleDeactivate(t.id, t.name)} className="text-sm text-orange-500 hover:underline">無効化</button>
                        <button onClick={() => handleBanTenant(t.id, t.name)} className="text-sm text-red-600 font-medium hover:underline">🚫 永久BAN</button>
                      </>
                    )}
                    <span className="text-xs text-gray-300 hidden sm:inline ml-auto">ID: {t.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* BANユーザー一覧 */
          <div>
            {banned.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                BANされたユーザーはいません
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-3 text-left">LINE User ID</th>
                      <th className="px-5 py-3 text-left">理由</th>
                      <th className="px-5 py-3 text-left">BAN日時</th>
                      <th className="px-5 py-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {banned.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4 font-mono text-xs text-gray-700">{u.lineUserId}</td>
                        <td className="px-5 py-4 text-gray-600">{u.reason ?? '-'}</td>
                        <td className="px-5 py-4 text-gray-500">{new Date(u.bannedAt).toLocaleDateString('ja-JP')}</td>
                        <td className="px-5 py-4">
                          <button onClick={() => handleUnbanUser(u.lineUserId)} className="text-xs text-[#06C755] hover:underline">
                            BAN解除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {(showCreate || editTarget) && (
        <TenantModal
          initial={editTarget ?? undefined}
          onClose={() => { setShowCreate(false); setEditTarget(null); }}
          onSaved={() => { setShowCreate(false); setEditTarget(null); load(); }}
        />
      )}

      {showBanUserForm && (
        <BanUserModal
          onClose={() => setShowBanUserForm(false)}
          onSaved={() => { setShowBanUserForm(false); load(); }}
        />
      )}
    </div>
  );
}

function TenantModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: TenantWithStats;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [plan, setPlan] = useState<'free' | 'standard' | 'pro'>((initial?.plan ?? 'free') as 'free' | 'standard' | 'pro');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (initial) {
        await api.superadmin.update(initial.id, { name, description, plan });
      } else {
        await api.superadmin.create({ name, description, plan, email, password });
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">
          {initial ? '団体を編集' : '新しい団体を追加'}
        </h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">団体名 <span className="text-red-500">*</span></label>
            <input
              required maxLength={100}
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              placeholder="例: 〇〇サークル"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
            <textarea
              rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              placeholder="団体の説明"
            />
          </div>
          {!initial && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス <span className="text-red-500">*</span></label>
                <input
                  required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">パスワード <span className="text-red-500">*</span></label>
                <input
                  required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  placeholder="8文字以上"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">プラン</label>
            <div className="flex gap-3">
              {(['free', 'standard', 'pro'] as const).map((p) => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="plan" value={p} checked={plan === p} onChange={() => setPlan(p)} className="accent-[#06C755]" />
                  <span className="text-sm text-gray-700">{p === 'standard' ? 'スタンダード' : p === 'pro' ? 'プロ' : 'フリー'}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit" disabled={saving}
              className="flex-1 bg-[#06C755] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#05a847] disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BanUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [lineUserId, setLineUserId] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lineUserId.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.superadmin.banUser(lineUserId.trim(), reason.trim() || undefined);
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">ユーザーを永久BAN</h2>
        <p className="text-xs text-gray-500 mb-5">指定したLINEユーザーIDをすべての団体から追放します</p>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LINE User ID <span className="text-red-500">*</span></label>
            <input
              required
              value={lineUserId} onChange={(e) => setLineUserId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">理由（任意）</label>
            <input
              value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="例: 迷惑行為・利用規約違反"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit" disabled={saving}
              className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {saving ? '処理中...' : '🚫 永久BAN'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
