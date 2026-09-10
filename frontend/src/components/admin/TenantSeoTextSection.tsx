'use client';

import { useEffect, useState } from 'react';
import { api, TenantInput } from '@/lib/api';

type SeoTextField = Extract<keyof TenantInput, 'reviewsSeoDescription' | 'eventsSeoDescription'>;

export function TenantSeoTextSection({
  field,
  title,
  helpText,
  placeholder,
  initialValue,
  onSaved,
}: {
  field: SeoTextField;
  title: string;
  helpText: string;
  placeholder: string;
  initialValue: string;
  onSaved: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await api.tenant.update({ [field]: value.trim() });
      onSaved(value.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 max-w-3xl rounded-xl border border-gray-200 bg-gray-50 p-4 md:p-5">
      <p className="mb-1 text-xs font-medium text-gray-700">{title}</p>
      <p className="mb-3 text-xs leading-relaxed text-gray-500">{helpText}</p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        maxLength={300}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#06C755] focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] text-gray-400">{value.length}/300</p>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#06C755] px-4 py-2 text-xs font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
          >
            {saving ? '保存中...' : saved ? '保存しました' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  );
}
