'use client';

import { useEffect, useState } from 'react';
import { api, CustomProfileQuestion } from '@/lib/api';

type FieldKey = 'requireName' | 'requireGrade' | 'requireGender' | 'showLevel' | 'showComment';

const FIXED_FIELDS: { key: FieldKey; label: string; help: string }[] = [
  { key: 'requireName', label: '名前', help: 'ONだと初回予約時に必須になります。' },
  { key: 'requireGrade', label: '学年', help: 'ONだと初回予約時に必須になります。' },
  { key: 'requireGender', label: '性別', help: 'ONだと初回予約時に必須になります。集合時間の性別別案内を使っているイベントがある場合はOFFにできません。' },
  { key: 'showLevel', label: 'スポーツレベル', help: '項目自体の表示/非表示です（任意項目のまま）。レベルを必須にしているイベントがある場合はOFFにできません。' },
  { key: 'showComment', label: '一言コメント', help: '項目自体の表示/非表示です（任意項目のまま）。' },
];

type FieldState = Record<FieldKey, boolean>;

export default function ProfileFormPage() {
  const [fields, setFields] = useState<FieldState | null>(null);
  const [questions, setQuestions] = useState<CustomProfileQuestion[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newPlaceholder, setNewPlaceholder] = useState('');
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.tenant.get().then((t) => {
      setFields({
        requireName: t.requireName !== false,
        requireGrade: t.requireGrade !== false,
        requireGender: t.requireGender !== false,
        showLevel: t.showLevel !== false,
        showComment: t.showComment !== false,
      });
      setQuestions(t.customProfileQuestions ?? []);
    }).catch(() => {});
  }, []);

  async function toggleField(key: FieldKey) {
    if (!fields) return;
    const next = { ...fields, [key]: !fields[key] };
    setFields(next);
    setError('');
    try {
      await api.tenant.update({ [key]: next[key] });
    } catch (err: any) {
      setFields(fields);
      setError(err?.message ?? '設定の更新に失敗しました');
    }
  }

  async function saveQuestions(nextQuestions: CustomProfileQuestion[]) {
    setSavingQuestions(true);
    setError('');
    try {
      await api.tenant.update({ customProfileQuestions: nextQuestions });
      setQuestions(nextQuestions);
    } catch (err: any) {
      setError(err?.message ?? '質問の更新に失敗しました');
    } finally {
      setSavingQuestions(false);
    }
  }

  function addQuestion() {
    const label = newLabel.trim();
    if (!label) return;
    if (questions.length >= 10) {
      setError('カスタム質問は10個まで追加できます');
      return;
    }
    const question: CustomProfileQuestion = {
      id: `q${Date.now()}`,
      label,
      ...(newPlaceholder.trim() && { placeholder: newPlaceholder.trim() }),
    };
    saveQuestions([...questions, question]);
    setNewLabel('');
    setNewPlaceholder('');
  }

  function removeQuestion(id: string) {
    saveQuestions(questions.filter((q) => q.id !== id));
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">参加者フォーム</h1>
          <p className="mt-1 text-sm text-gray-500">初回予約時にどんなプロフィール情報を求めるかを設定します。</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!fields ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : (
          <>
            <div className="mb-6 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
              {FIXED_FIELDS.map(({ key, label, help }) => (
                <div key={key} className="flex items-center justify-between gap-3 px-4 py-3.5 md:px-6">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{help}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleField(key)}
                    className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      fields[key]
                        ? 'border-[#06C755] bg-[#06C755]/8 text-[#06C755]'
                        : 'border-gray-200 bg-gray-50 text-gray-400'
                    }`}
                  >
                    {fields[key] ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
              <p className="mb-1 text-sm font-medium text-gray-700">カスタム質問（自由記述）</p>
              <p className="mb-4 text-xs leading-relaxed text-gray-500">
                上の項目に加えて、自由記述の質問を追加できます。初回予約時のフォームの一番下に表示されます（任意項目）。
              </p>

              {questions.length > 0 && (
                <div className="mb-4 space-y-2">
                  {questions.map((q) => (
                    <div key={q.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-700">{q.label}</p>
                        {q.placeholder && <p className="truncate text-xs text-gray-400">例：{q.placeholder}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        disabled={savingQuestions}
                        className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 disabled:opacity-50"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {questions.length < 10 && (
                <div className="space-y-2 rounded-lg border border-dashed border-gray-200 p-3">
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    maxLength={100}
                    placeholder="質問（例：得意なスポーツはありますか？）"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#06C755] focus:outline-none"
                  />
                  <input
                    value={newPlaceholder}
                    onChange={(e) => setNewPlaceholder(e.target.value)}
                    maxLength={100}
                    placeholder="入力例（任意・プレースホルダーとして表示）"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#06C755] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addQuestion}
                    disabled={savingQuestions || !newLabel.trim()}
                    className="w-full rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
                  >
                    {savingQuestions ? '追加中...' : '質問を追加'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
