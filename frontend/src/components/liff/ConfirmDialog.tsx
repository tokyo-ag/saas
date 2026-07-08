'use client';

export function ConfirmDialog({
  open,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'キャンセル',
  accentColor,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  accentColor: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-lg">
        <p className="text-sm text-gray-800 text-center mb-5 whitespace-pre-wrap">{message}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 active:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white active:opacity-90"
            style={{ backgroundColor: danger ? '#ef4444' : accentColor }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
