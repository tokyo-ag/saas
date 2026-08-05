'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { api, Tenant, TenantInput } from '@/lib/api';
import { SaveToast } from '@/components/ui/SaveToast';

const tabs = [
  { label: '団体情報', href: '/admin/settings', active: true },
  { label: 'LINE連携', href: '/admin/settings/line' },
  { label: 'Stripe決済', href: '/admin/settings/stripe' },
  { label: 'プラン', href: '/admin/settings/plan' },
];

const TENANT_TYPE_TAGS = ['インカレサークル', '学生団体', 'イベント団体', '社会人サークル'] as const;
const TENANT_ACTIVITY_TAGS = ['交流会', 'バドミントン', 'フットサル', 'バスケ', 'バレー'] as const;

function filterKnownTags(tags: string[] | undefined, allowedTags: readonly string[]) {
  return (tags ?? []).filter((tag) => allowedTags.includes(tag));
}

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

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve) => { image.onload = () => resolve(); });
  const canvas = document.createElement('canvas');
  const size = Math.min(pixelCrop.width, pixelCrop.height, 512);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, size, size);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('crop failed')), 'image/jpeg', 0.9);
  });
}

async function uploadIconBlob(blob: Blob): Promise<string> {
  const filename = `icon-${Date.now()}.jpg`;
  const res = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
    method: 'POST',
    body: blob,
    headers: { 'content-type': 'image/jpeg' },
  });
  const data = await res.json() as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? '画像のアップロードに失敗しました');
  return data.url!;
}

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState<Pick<TenantInput, 'name' | 'description' | 'iconUrl' | 'tags' | 'typeTags' | 'activityTags'>>({
    name: '',
    description: '',
    iconUrl: '',
    tags: [],
    typeTags: [],
    activityTags: [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // crop modal state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleCropConfirm() {
    if (!cropSrc || !croppedAreaPixels) return;
    setUploading(true);
    setError('');
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
      const url = await uploadIconBlob(blob);
      setForm((prev) => ({ ...prev, iconUrl: url }));
      setCropSrc(null);
    } catch (err: any) {
      setError(err.message ?? '画像のアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    api.tenant.get().then((tenantData) => {
      setTenant(tenantData);
      setForm({
        name: tenantData.name,
        description: tenantData.description ?? '',
        iconUrl: tenantData.iconUrl ?? '',
        tags: filterKnownTags(tenantData.tags, TENANT_ACTIVITY_TAGS),
        typeTags: filterKnownTags(tenantData.typeTags, TENANT_TYPE_TAGS),
        activityTags: filterKnownTags(tenantData.activityTags ?? tenantData.tags, TENANT_ACTIVITY_TAGS),
      });
    });
  }, []);

  function toggleTag(field: 'typeTags' | 'activityTags', tag: string) {
    setForm((prev) => {
      const tags = prev[field] ?? [];
      return {
        ...prev,
        [field]: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
      };
    });
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await api.tenant.update({
        name: form.name,
        description: form.description,
        iconUrl: form.iconUrl,
        typeTags: form.typeTags ?? [],
        activityTags: form.activityTags ?? [],
        tags: form.activityTags ?? [],
      });
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

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">団体アイコン</label>
            <p className="mb-2 text-xs text-gray-500">画像をクリックして選択・トリミングできます</p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-[#06C755] hover:bg-green-50 disabled:opacity-60"
              >
                {(form.iconUrl || tenant.linePictureUrl) ? (
                  <NextImage src={form.iconUrl || tenant.linePictureUrl!} alt="アイコン" fill sizes="80px" className="object-cover" unoptimized />
                ) : (
                  <span className="text-3xl font-bold text-gray-300">{form.name?.[0] ?? '?'}</span>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#06C755] border-t-transparent" />
                  </div>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
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
            {tenant.lineConfigured && (
              <button
                type="button"
                disabled={syncing}
                onClick={async () => {
                  setSyncing(true);
                  setError('');
                  try {
                    const updated = await api.tenant.syncLineProfile();
                    setTenant(updated);
                    setForm((prev) => ({
                      ...prev,
                      iconUrl: updated.linePictureUrl ?? updated.iconUrl ?? prev.iconUrl,
                      name: updated.lineDisplayName ?? prev.name,
                    }));
                  } catch {
                    setError('LINEアイコンの取得に失敗しました');
                  } finally {
                    setSyncing(false);
                  }
                }}
                className="mt-3 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {syncing ? '取得中...' : 'LINEアイコン・名前を同期'}
              </button>
            )}
            {tenant.lineConfigured && (
              <button
                type="button"
                disabled={syncing}
                onClick={async () => {
                  setSyncing(true);
                  setError('');
                  try {
                    const result = await api.members.syncLineProfiles();
                    alert(`${result.updated}人の参加者プロフィールを更新しました`);
                  } catch {
                    setError('参加者プロフィールの同期に失敗しました');
                  } finally {
                    setSyncing(false);
                  }
                }}
                className="mt-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {syncing ? '同期中...' : '参加者のLINEプロフィールを一括更新'}
              </button>
            )}
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

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">団体タグ</label>
                <p className="mt-1 text-xs text-gray-500">記事やLPから団体を紹介するときに使う分類です。</p>
              </div>
              {((form.typeTags?.length ?? 0) + (form.activityTags?.length ?? 0)) > 0 && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-500">
                  {(form.typeTags?.length ?? 0) + (form.activityTags?.length ?? 0)}個
                </span>
              )}
            </div>
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div>
                <p className="mb-1.5 text-xs font-bold text-gray-500">団体種別タグ</p>
                <div className="flex flex-wrap gap-2">
                  {TENANT_TYPE_TAGS.map((tag) => {
                    const selected = form.typeTags?.includes(tag) ?? false;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag('typeTags', tag)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                          selected
                            ? 'border-[#06C755] bg-[#06C755] text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-[#06C755]/60'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-bold text-gray-500">活動タグ</p>
                <div className="flex flex-wrap gap-2">
                  {TENANT_ACTIVITY_TAGS.map((tag) => {
                    const selected = form.activityTags?.includes(tag) ?? false;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag('activityTags', tag)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                          selected
                            ? 'border-[#06C755] bg-[#06C755] text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-[#06C755]/60'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
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

      {/* crop modal */}
      {cropSrc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
          <div className="relative flex-1">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="bg-white px-6 py-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-12 shrink-0">ズーム</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-[#06C755]"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCropSrc(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                disabled={uploading}
                className="flex-1 rounded-lg bg-[#06C755] py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {uploading ? 'アップロード中...' : '確定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
