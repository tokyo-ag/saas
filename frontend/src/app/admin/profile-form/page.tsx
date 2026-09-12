'use client';

import { useEffect, useState } from 'react';
import { api, CustomProfileQuestion, CustomProfileQuestionType } from '@/lib/api';

const QUESTION_TYPE_LABELS: Record<CustomProfileQuestionType, string> = {
  text: '自由記述',
  radio: '単一選択（ラジオ）',
  checkbox: '複数選択（チェックボックス）',
  select: 'プルダウン',
};
const QUESTION_TYPES: CustomProfileQuestionType[] = ['text', 'radio', 'checkbox', 'select'];

type FieldKey = 'requireName' | 'requireGrade' | 'requireGender' | 'showLevel' | 'showComment';

const FIXED_FIELDS: { key: FieldKey; label: string; help: string }[] = [
  { key: 'requireName', label: '名前', help: '非表示にするとフォームから消え、必須項目からも外れます。' },
  { key: 'requireGrade', label: '学年', help: '非表示にするとフォームから消え、必須項目からも外れます。' },
  { key: 'requireGender', label: '性別', help: '表示中は初回予約時に必須になります。男女別価格や集合時間の性別別案内を使っているイベントがある場合は非表示にできません。' },
  { key: 'showLevel', label: 'スポーツレベル', help: '表示しても必須にはなりません（任意項目）。レベルを必須にしているイベントがある場合は非表示にできません。' },
  { key: 'showComment', label: '一言コメント', help: '表示しても必須にはなりません（任意項目）。' },
];

type FieldState = Record<FieldKey, boolean>;

function ProfileFormPreview({
  previewUrl,
  iframeKey,
  onReload,
}: {
  previewUrl: string;
  iframeKey: number;
  onReload: () => void;
}) {
  if (!previewUrl) return null;
  return (
    <aside className="hidden shrink-0 lg:block">
      <div className="sticky top-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-gray-400">👤 ユーザーにはこう見えます</p>
          <button
            type="button"
            onClick={onReload}
            className="text-[10px] text-gray-400 hover:text-gray-600 underline"
          >
            再読込
          </button>
        </div>
        <div className="overflow-hidden rounded-[2.5rem] border-[6px] border-gray-800 bg-white shadow-2xl" style={{ width: '220px' }}>
          <div className="flex items-center justify-center gap-2 bg-gray-800 py-2">
            <div className="h-1.5 w-12 rounded-full bg-gray-600" />
          </div>
          <iframe
            key={iframeKey}
            src={previewUrl}
            width="375"
            height="667"
            style={{ zoom: 0.587, border: 'none', display: 'block' }}
            title="参加者フォームプレビュー"
          />
        </div>
      </div>
    </aside>
  );
}

export default function ProfileFormPage() {
  const [fields, setFields] = useState<FieldState | null>(null);
  const [questions, setQuestions] = useState<CustomProfileQuestion[]>([]);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [error, setError] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftType, setDraftType] = useState<CustomProfileQuestionType>('text');
  const [draftPlaceholder, setDraftPlaceholder] = useState('');
  const [draftOptions, setDraftOptions] = useState<string[]>(['', '']);

  useEffect(() => {
    api.tenant.get().then((t) => {
      setTenantId(t.code ?? t.id);
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
      setIframeKey((k) => k + 1);
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
      setIframeKey((k) => k + 1);
    } catch (err: any) {
      setError(err?.message ?? '質問の更新に失敗しました');
    } finally {
      setSavingQuestions(false);
    }
  }

  function openNewQuestion() {
    setEditingId('new');
    setDraftLabel('');
    setDraftType('text');
    setDraftPlaceholder('');
    setDraftOptions(['', '']);
    setError('');
  }

  function openEditQuestion(q: CustomProfileQuestion) {
    setEditingId(q.id);
    setDraftLabel(q.label);
    setDraftType(q.type ?? 'text');
    setDraftPlaceholder(q.placeholder ?? '');
    setDraftOptions(q.options && q.options.length > 0 ? q.options : ['', '']);
    setError('');
  }

  function closeEditor() {
    setEditingId(null);
  }

  function updateDraftOption(index: number, value: string) {
    setDraftOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addDraftOption() {
    if (draftOptions.length >= 8) return;
    setDraftOptions((prev) => [...prev, '']);
  }

  function removeDraftOption(index: number) {
    setDraftOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveDraft() {
    const label = draftLabel.trim();
    if (!label || editingId === null) return;
    const isChoice = draftType !== 'text';
    const options = draftOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (isChoice && options.length < 2) {
      setError('選択肢は2つ以上入力してください');
      return;
    }
    if (editingId === 'new' && questions.length >= 10) {
      setError('カスタム質問は10個まで追加できます');
      return;
    }
    const question: CustomProfileQuestion = {
      id: editingId === 'new' ? `q${Date.now()}` : editingId,
      label,
      type: draftType,
      ...(draftType === 'text' && draftPlaceholder.trim() && { placeholder: draftPlaceholder.trim() }),
      ...(isChoice && { options }),
    };
    const nextQuestions =
      editingId === 'new'
        ? [...questions, question]
        : questions.map((q) => (q.id === editingId ? question : q));
    await saveQuestions(nextQuestions);
    setEditingId(null);
  }

  function removeQuestion(id: string) {
    if (editingId === id) setEditingId(null);
    saveQuestions(questions.filter((q) => q.id !== id));
  }

  function moveQuestion(id: string, direction: -1 | 1) {
    const index = questions.findIndex((q) => q.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= questions.length) return;
    const next = [...questions];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    saveQuestions(next);
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
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
                    {fields[key] ? '表示' : '非表示'}
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
              <p className="mb-1 text-sm font-medium text-gray-700">カスタム質問</p>
              <p className="mb-4 text-xs leading-relaxed text-gray-500">
                上の項目に加えて、自由記述・選択式の質問を追加できます。初回予約時のフォームの一番下に表示されます（任意項目）。
              </p>

              {questions.length > 0 && (
                <div className="mb-4 space-y-2">
                  {questions.map((q, i) => (
                    <div key={q.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex shrink-0 flex-col leading-none">
                          <button
                            type="button"
                            onClick={() => moveQuestion(q.id, -1)}
                            disabled={i === 0 || savingQuestions}
                            aria-label="上へ移動"
                            className="px-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveQuestion(q.id, 1)}
                            disabled={i === questions.length - 1 || savingQuestions}
                            aria-label="下へ移動"
                            className="px-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-700">{q.label}</p>
                          <p className="truncate text-xs text-gray-400">
                            {QUESTION_TYPE_LABELS[q.type ?? 'text']}
                            {q.placeholder ? `・例：${q.placeholder}` : ''}
                            {q.options && q.options.length > 0 ? `・${q.options.join('／')}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => openEditQuestion(q)}
                          disabled={savingQuestions}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.id)}
                          disabled={savingQuestions}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {editingId !== null ? (
                <div className="space-y-2 rounded-lg border border-dashed border-gray-200 p-3">
                  <input
                    value={draftLabel}
                    onChange={(e) => setDraftLabel(e.target.value)}
                    maxLength={100}
                    placeholder="質問（例：得意なスポーツはありますか？）"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#06C755] focus:outline-none"
                  />
                  <select
                    value={draftType}
                    onChange={(e) => setDraftType(e.target.value as CustomProfileQuestionType)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#06C755] focus:outline-none"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
                    ))}
                  </select>

                  {draftType === 'text' ? (
                    <input
                      value={draftPlaceholder}
                      onChange={(e) => setDraftPlaceholder(e.target.value)}
                      maxLength={100}
                      placeholder="入力例（任意・プレースホルダーとして表示）"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#06C755] focus:outline-none"
                    />
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-500">選択肢（2つ以上）</p>
                      {draftOptions.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            value={opt}
                            onChange={(e) => updateDraftOption(i, e.target.value)}
                            maxLength={50}
                            placeholder={`選択肢${i + 1}`}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#06C755] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeDraftOption(i)}
                            disabled={draftOptions.length <= 2}
                            className="shrink-0 text-xs font-bold text-red-500 disabled:opacity-30"
                          >
                            削除
                          </button>
                        </div>
                      ))}
                      {draftOptions.length < 8 && (
                        <button
                          type="button"
                          onClick={addDraftOption}
                          className="text-xs font-bold text-[#06C755]"
                        >
                          + 選択肢を追加
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closeEditor}
                      className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={saveDraft}
                      disabled={savingQuestions || !draftLabel.trim()}
                      className="flex-1 rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white hover:bg-[#05a847] disabled:opacity-50"
                    >
                      {savingQuestions ? '保存中...' : editingId === 'new' ? '質問を追加' : '保存する'}
                    </button>
                  </div>
                </div>
              ) : (
                questions.length < 10 && (
                  <button
                    type="button"
                    onClick={openNewQuestion}
                    className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50"
                  >
                    + 質問を追加する
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>

      <ProfileFormPreview
        previewUrl={tenantId ? `/liff/${tenantId}/profile?preview=1` : ''}
        iframeKey={iframeKey}
        onReload={() => setIframeKey((k) => k + 1)}
      />
      </div>
    </div>
  );
}
