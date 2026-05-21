'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Tenant, TenantInput } from '@/lib/api';
import { SaveToast } from '@/components/ui/SaveToast';

const tabs = [
  { label: '団体情報', href: '/admin/settings', active: true },
  { label: 'LINE連携', href: '/admin/settings/line' },
  { label: 'Stripe決済', href: '/admin/settings/stripe' },
  { label: 'プラン', href: '/admin/settings/plan' },
];

function SettingsTabs() {
  return (
    <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-gray-200 px-4 md:mx-0 md:px-0">
      {tabs.map((tab) =>
        tab.active ? (
          <span key={tab.href} className="whitespace-nowrap border-b-2 border-[#06C755] px-4 py-2 text-sm font-medium text-[#06C755]">
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.href}
            href={tab.href}
            className="whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            {tab.label}
          </Link>
        ),
      )}
    </nav>
  );
}

async function uploadIconFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `icon-${Date.now()}.${ext}`;
  const res = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
    method: 'POST',
    body: file,
    headers: { 'content-type': file.type },
  });
  const data = await res.json() as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? '画像のアップロードに失敗しました');
  return data.url!;
}

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState<Pick<TenantInput, 'name' | 'description' | 'iconUrl'>>({ name: '', description: '', iconUrl: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'calendar'>('card');
  const [savedViewMode, setSavedViewMode] = useState<'card' | 'calendar'>('card');
  const [savingView, setSavingView] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleIconFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadIconFile(file);
      setForm((prev) => ({ ...prev, iconUrl: url }));
    } catch (err: any) {
      setError(err.message ?? '画像のアップロードに失敗しました');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }
  async function handleSaveViewMode() {
    setSavingView(true);
    try {
      await api.tenant.update({ liffEventView: viewMode });
      setSavedViewMode(viewMode);
    } catch {
      setError('表示設定の保存に失敗しました');
    } finally {
      setSavingView(false);
    }
  }

  function copyInviteLink(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  useEffect(() => {
    api.tenant.get().then((tenantData) => {
      setTenant(tenantData);
      setForm({ name: tenantData.name, description: tenantData.description ?? '', iconUrl: tenantData.iconUrl ?? '' });
      const v = tenantData.liffEventView === 'calendar' ? 'calendar' : 'card';
      setViewMode(v);
      setSavedViewMode(v);
    });
  }, []);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await api.tenant.update({ name: form.name, description: form.description, iconUrl: form.iconUrl });
      setTenant(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }


  if (!tenant) {
    return <div className="px-4 py-12 text-center text-sm text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-5 text-2xl font-bold text-gray-900">設定</h1>
        <SettingsTabs />

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <SaveToast show={saved} />


        <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="mb-1 text-sm font-medium text-gray-700">ユーザー画面レイアウト</p>
          <p className="mb-3 text-xs text-gray-500">参加者がイベントを見るときの表示形式を選択します。</p>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-gray-200 text-sm font-medium">
              <button
                onClick={() => setViewMode('card')}
                className={`px-4 py-2 transition-colors ${viewMode === 'card' ? 'bg-[#06C755] text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                イベントカード
              </button>
              <div className="w-px bg-gray-200" />
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 transition-colors ${viewMode === 'calendar' ? 'bg-[#06C755] text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                カレンダー
              </button>
            </div>
            <button
              onClick={handleSaveViewMode}
              disabled={savingView || viewMode === savedViewMode}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-default"
            >
              {savingView ? '保存中...' : viewMode === savedViewMode ? '保存済み ✓' : '保存'}
            </button>
          </div>
        </section>

        <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <p className="mb-2 text-sm font-medium text-gray-700">ユーザー画面の確認用URL</p>
          <p className="mb-3 text-xs text-gray-500">参加者がイベント一覧を見たり予約するページのURLです。</p>
          {tenant.id && (
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs font-mono text-gray-600">
                {typeof window !== 'undefined' ? `${window.location.origin}/liff/${tenant.id}` : `https://comiu.vercel.app/liff/${tenant.id}`}
              </span>
              <button
                type="button"
                onClick={() => copyInviteLink(typeof window !== 'undefined' ? `${window.location.origin}/liff/${tenant.id}` : '')}
                className="shrink-0 rounded-lg bg-[#06C755] px-4 py-2 text-xs font-bold text-white hover:bg-[#05a847]"
              >
                {copied ? 'コピー済み ✓' : 'コピー'}
              </button>
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">団体アイコン</label>
            <p className="mb-2 text-xs text-gray-500">画像をクリックして変更できます（JPG・PNG・GIF）</p>
            <div className="flex items-center gap-4">
              <label className={`relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-[#06C755] hover:bg-green-50 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                {form.iconUrl ? (
                  <img src={form.iconUrl} alt="アイコン" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-gray-300">{form.name?.[0] ?? '?'}</span>
                )}
                {uploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#06C755] border-t-transparent" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors hover:bg-black/20">
                    <span className="text-xs font-medium text-white opacity-0 group-hover:opacity-100">変更</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleIconFileChange} disabled={uploading} />
              </label>
              <div className="text-sm text-gray-500">
                {uploading ? 'アップロード中...' : (
                  <>
                    <p>クリックして画像を選択</p>
                    {form.iconUrl && (
                      <button type="button" onClick={() => setForm((prev) => ({ ...prev, iconUrl: '' }))} className="mt-1 text-xs text-red-400 hover:text-red-600">
                        削除
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">団体名 <span className="text-red-500">*</span></label>
            <input
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">団体説明</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="ユーザー画面や公開ページに表示する説明文"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-500">プラン</p>
            <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${tenant.plan === 'standard' ? 'bg-[#06C755]/10 text-[#06C755]' : 'bg-gray-100 text-gray-600'}`}>
              {tenant.plan === 'standard' ? 'スタンダード' : tenant.plan === 'pro' ? 'プロ' : 'フリー'}
            </span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-[#06C755] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#05a847] disabled:opacity-50 sm:w-auto"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </form>
      </div>
    </div>
  );
}
