"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/AuthGuard";
import { addQuestionsBatch } from "@/lib/questions";
import { getAppAuth } from "@/lib/firebase";

const LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח"];

interface QuestionDraft {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

async function generateWithAI(prompt: string): Promise<QuestionDraft[]> {
  const token = await getAppAuth().currentUser?.getIdToken();
  if (!token) throw new Error("יש להתחבר מחדש");

  const res = await fetch("/api/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("שגיאה ביצירת השאלות");
  const data = await res.json();

  let content: string = data.choices[0].message.content;
  const match = content.match(/```json([\s\S]*?)```/);
  if (match) content = match[1];

  try {
    const parsed = JSON.parse(content.trim());
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.filter(
      (q: QuestionDraft) =>
        q.question &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        q.options.every((o) => typeof o === "string" && o.trim().length > 0) &&
        typeof q.correctAnswerIndex === "number" &&
        Number.isInteger(q.correctAnswerIndex) &&
        q.correctAnswerIndex >= 0 &&
        q.correctAnswerIndex < q.options.length
    );
  } catch {
    throw new Error("לא הצלחנו לפרסר את תשובת ה-AI");
  }
}

/* ── Single draft card (extracted for readability) ── */
function DraftCard({
  draft,
  index,
  total,
  onUpdate,
  onRemove,
}: {
  draft: QuestionDraft;
  index: number;
  total: number;
  onUpdate: (updated: QuestionDraft) => void;
  onRemove: () => void;
}) {
  const handleOptionChange = (optIdx: number, value: string) => {
    const newOptions = [...draft.options];
    newOptions[optIdx] = value;
    onUpdate({ ...draft, options: newOptions });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ delay: index * 0.03 }}
      className="brutal-card overflow-hidden"
    >
      {/* Card header */}
      <div className="bg-brutal-black text-white px-4 py-2 flex items-center justify-between">
        <span className="font-bold text-sm">
          שאלה {index + 1} / {total}
        </span>
        <button
          onClick={onRemove}
          className="text-white/60 hover:text-brutal-red transition-colors text-lg font-bold leading-none px-1"
          title="הסר שאלה"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Question text */}
        <textarea
          value={draft.question}
          onChange={(e) => onUpdate({ ...draft, question: e.target.value })}
          rows={2}
          className="w-full p-3 brutal-border bg-white font-body text-sm
                     resize-none focus:outline-none focus:border-brutal-red"
        />

        {/* Options */}
        <div className="space-y-2">
          {draft.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdate({ ...draft, correctAnswerIndex: i })}
                className={`w-7 h-7 flex items-center justify-center border-2 font-bold text-xs shrink-0 transition-all duration-75
                  ${
                    draft.correctAnswerIndex === i
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-brutal-black bg-white hover:bg-brutal-paper"
                  }`}
                title={
                  draft.correctAnswerIndex === i
                    ? "תשובה נכונה"
                    : "סמן כנכונה"
                }
              >
                {LETTERS[i]}
              </button>
              <input
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(i, e.target.value)}
                className="flex-1 p-2 text-sm brutal-border bg-white focus:outline-none focus:border-brutal-red"
              />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main page ── */
function AddQuestionPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [freeText, setFreeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<QuestionDraft[]>([]);
  const [aiNote, setAiNote] = useState("");
  const [saveResult, setSaveResult] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!freeText.trim()) return;
    setLoading(true);
    setError("");
    setDrafts([]);
    setAiNote("");
    setSaveResult(null);

    try {
      const results = await generateWithAI(freeText);
      if (results.length === 0) {
        setError("ה-AI לא הצליח לזהות שאלות מהטקסט — נסו לנסח אחרת");
        return;
      }
      setDrafts(results);
      setAiNote(`זוהו ${results.length} שאלות מהטקסט`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת שאלות");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDraft = (index: number, updated: QuestionDraft) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? updated : d)));
  };

  const handleRemoveDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (!user || drafts.length === 0) return;
    setLoading(true);
    setError("");

    try {
      const count = await addQuestionsBatch(drafts, user.uid);
      setSaveResult(count);
      setDrafts([]);
      setFreeText("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setDrafts([]);
    setFreeText("");
    setError("");
    setAiNote("");
    setSaveResult(null);
  };

  return (
    <div className="min-h-dvh bg-brutal-paper flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-3 border-brutal-black bg-white">
        <button
          onClick={() => router.push("/")}
          className="brutal-btn text-sm px-4 py-2"
        >
          ← חזור
        </button>
        <h1 className="font-display text-lg">הוספת שאלות</h1>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4 pb-32">
        <AnimatePresence mode="wait">
          {/* ── INPUT STATE ── */}
          {drafts.length === 0 && saveResult === null && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="brutal-card p-4">
                <p className="text-sm text-brutal-grey mb-1">
                  הדביקו טקסט חופשי עם שאלות — ה-AI יזהה ויסדר את כולן
                </p>
                <p className="text-xs text-brutal-grey/60">
                  אפשר שאלה אחת או עשרים, בכל פורמט, והוא יסדר הכל
                </p>
              </div>

              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="הדביקו כאן שאלות..."
                rows={10}
                className="w-full p-4 brutal-border bg-white font-body text-base
                           resize-none focus:outline-none focus:border-brutal-red
                           placeholder:text-brutal-grey/40"
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="brutal-border border-brutal-red bg-red-50 p-3 text-sm text-brutal-red"
                >
                  {error}
                </motion.div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading || !freeText.trim()}
                className="brutal-btn-red w-full text-lg font-display py-4
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    מעבד...
                  </span>
                ) : (
                  "צור שאלות עם AI"
                )}
              </button>
            </motion.div>
          )}

          {/* ── REVIEW STATE ── */}
          {drafts.length > 0 && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Status bar */}
              <div className="brutal-card p-4 bg-green-50 border-green-600 flex items-center justify-between">
                <p className="text-sm font-bold text-green-800">{aiNote}</p>
                <span className="text-xs text-green-700">
                  {drafts.length} לשמירה
                </span>
              </div>

              {error && (
                <div className="brutal-border border-brutal-red bg-red-50 p-3 text-sm text-brutal-red">
                  {error}
                </div>
              )}

              {/* Cards */}
              <div className="space-y-4">
                <AnimatePresence>
                  {drafts.map((draft, i) => (
                    <DraftCard
                      key={`${i}-${draft.question.slice(0, 20)}`}
                      draft={draft}
                      index={i}
                      total={drafts.length}
                      onUpdate={(updated) => handleUpdateDraft(i, updated)}
                      onRemove={() => handleRemoveDraft(i)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── SUCCESS STATE ── */}
          {saveResult !== null && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-12"
            >
              <div className="brutal-card p-8 bg-green-50 border-green-600 inline-block">
                <span className="text-5xl">✓</span>
              </div>
              <p className="font-display text-xl">
                {saveResult} שאלות נשמרו בהצלחה!
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={reset}
                  className="brutal-btn-red text-base font-display px-8 py-3"
                >
                  הוסף עוד שאלות
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="brutal-btn text-sm"
                >
                  חזור לדף הראשי
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Sticky bottom bar (visible during review) ── */}
      {drafts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-3 border-brutal-black p-4 z-10">
          <div className="max-w-lg mx-auto flex gap-3">
            <button
              onClick={reset}
              className="brutal-btn text-sm px-4"
            >
              התחל מחדש
            </button>
            <button
              onClick={handleSaveAll}
              disabled={loading || drafts.length === 0}
              className="brutal-btn-red flex-1 text-base font-display py-3
                         disabled:opacity-50"
            >
              {loading
                ? "שומר..."
                : `שמור ${drafts.length} שאלות`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <AddQuestionPage />
    </AuthGuard>
  );
}
