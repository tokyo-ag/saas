'use client';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

export function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export function RadioGroup({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map(([optionValue, label]) => (
        <label key={optionValue} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
          <input type="radio" checked={value === optionValue} onChange={() => onChange(optionValue)} className="accent-[#06C755]" />
          {label}
        </label>
      ))}
    </div>
  );
}

export function Check({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={`mb-1.5 flex cursor-pointer items-center gap-2 text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="rounded" />
      {label}
    </label>
  );
}

export function UploadButton({ uploading, onUpload, setUploading, setError }: {
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
  setUploading: (uploading: boolean) => void;
  setError: (error: string) => void;
}) {
  return (
    <label className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-xs hover:border-[#06C755] ${uploading ? 'opacity-50' : ''}`}>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            await onUpload(file);
          } catch {
            setError('画像のアップロードに失敗しました');
          } finally {
            setUploading(false);
          }
        }}
      />
      {uploading ? 'アップロード中...' : '画像を選択'}
    </label>
  );
}
