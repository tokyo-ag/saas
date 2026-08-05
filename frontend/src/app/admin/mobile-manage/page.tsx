'use client';

import { useEffect, useState } from 'react';
import { api, MobileManageSettings } from '@/lib/api';

export default function AdminMobileManagePage() {
  const [settings, setSettings] = useState<MobileManageSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.mobileManage.getSettings()
      .then(setSettings)
      .catch((err: any) => setError(err?.message ?? '読み込みに失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  async function handleIssue() {
    setBusy(true);
    setError('');
    try {
      const { linkUrl } = await api.mobileManage.issueLink();
      setSettings((prev) => (prev ? { ...prev, linkUrl } : prev));
    } catch (err: any) {
      setError(err?.message ?? 'リンクの発行に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    if (!confirm('リンクを無効化しますか？発行済みのリンクは使えなくなります。')) return;
    setBusy(true);
    setError('');
    try {
      await api.mobileManage.revokeLink();
      setSettings((prev) => (prev ? { ...prev, linkUrl: null } : prev));
    } catch (err: any) {
      setError(err?.message ?? '無効化に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!settings?.linkUrl) return;
    await navigator.clipboard.writeText(settings.linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function updateSetting(patch: Partial<Omit<MobileManageSettings, 'linkUrl'>>) {
    if (!settings) return;
    setSettings({ ...settings, ...patch });
    setBusy(true);
    setError('');
    try {
      const updated = await api.mobileManage.updateSettings(patch);
      setSettings(updated);
    } catch (err: any) {
      setError(err?.message ?? '更新に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">超簡単モバイル管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          スマホからパスワード不要で予約ページだけを管理できる、専用のリンクを発行できます。主催者本人がスマホのホーム画面に保存しておく用途を想定しています。
        </p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800">専用リンク</h2>
        {settings?.linkUrl ? (
          <>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-gray-600">{settings.linkUrl}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                {copied ? 'コピー済み' : 'コピー'}
              </button>
            </div>
            <p className="text-xs text-gray-400">このリンクを知っている人は誰でも予約ページを操作できます。他人に見せないでください。</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleIssue}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                リンクを再発行（旧リンクは無効化）
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleRevoke}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 disabled:opacity-50"
              >
                無効化する
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">まだリンクが発行されていません。</p>
            <button
              type="button"
              disabled={busy}
              onClick={handleIssue}
              className="rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
            >
              リンクを発行する
            </button>
          </>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800">超簡単モバイル管理での表示設定</h2>

        <div>
          <p className="mb-1.5 text-xs font-bold text-gray-500">予約の管理方法</p>
          <div className="flex gap-1.5">
            {([
              { value: 'comiu' as const, label: '名簿管理' },
              { value: 'line' as const, label: 'LINEで管理' },
            ]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                disabled={busy}
                onClick={() => updateSetting({ reserveActionStyle: value })}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                  settings?.reserveActionStyle === value ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-400">公開サイトの予約形式と共通の設定です。名簿管理はCOMIU上で予約を受け付け、LINEで管理はLINE上でのやり取りを基本にします。</p>
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={!settings?.hideLevel}
            disabled={busy}
            onChange={(e) => updateSetting({ hideLevel: !e.target.checked })}
            className="mt-0.5 accent-[#06C755]"
          />
          <span>
            イベント作成時に「予約時のレベルを確認する」項目を表示する
            <span className="block text-xs text-gray-400">超簡単モバイル管理経由でのイベント作成のみに適用されます。</span>
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={!settings?.hideLineNotify}
            disabled={busy}
            onChange={(e) => updateSetting({ hideLineNotify: !e.target.checked })}
            className="mt-0.5 accent-[#06C755]"
          />
          <span>
            イベント作成時に「LINE通知」項目を表示する
            <span className="block text-xs text-gray-400">超簡単モバイル管理経由でのイベント作成のみに適用されます。</span>
          </span>
        </label>
      </section>
    </div>
  );
}
