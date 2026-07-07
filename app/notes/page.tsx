"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/AuthGuard";
import { fetchUserNotes, updateNote, deleteNote } from "@/lib/notes";
import { MAX_NOTE_LENGTH } from "@/lib/types";
import type { UserNoteWithQuestion } from "@/lib/types";

function NoteEditor({
  item,
  onSaved,
  onDeleted,
}: {
  item: UserNoteWithQuestion;
  onSaved: (questionId: string, text: string) => void;
  onDeleted: (questionId: string) => void;
}) {
  const [text, setText] = useState(item.note.text);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const isDirty = text.trim() !== item.note.text;

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setError("");
    try {
      await updateNote(item.note.questionId, item.note.createdBy, trimmed);
      onSaved(item.note.questionId, trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteNote(item.note.questionId, item.note.createdBy);
      onDeleted(item.note.questionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה במחיקה");
      setDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="brutal-card overflow-hidden"
    >
      <div className="p-4 border-b-2 border-brutal-black/10 bg-brutal-paper/50">
        <p className="font-bold text-sm leading-relaxed">{item.questionText}</p>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-brutal-grey">ההסבר שלך</span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-brutal-grey">ניקוד:</span>
            <span
              className={`font-black tabular-nums ${
                item.note.score > 0
                  ? "text-brutal-red"
                  : item.note.score < 0
                  ? "text-blue-600"
                  : "text-brutal-grey"
              }`}
            >
              {item.note.score > 0 ? "+" : ""}
              {item.note.score}
            </span>
            <span className="text-brutal-grey">
              (▲{item.note.upvotes} ▼{item.note.downvotes})
            </span>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_NOTE_LENGTH))}
          rows={4}
          className="w-full p-3 brutal-border bg-white text-sm
                     focus:border-brutal-red focus:outline-none resize-none"
        />

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-brutal-grey tabular-nums">
            {text.length}/{MAX_NOTE_LENGTH}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1 text-brutal-red hover:opacity-70 transition-opacity"
              aria-label="מחק הסבר"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty || !text.trim()}
              className="brutal-btn text-xs px-4 py-2 disabled:opacity-40"
            >
              {saving ? "שומר..." : "שמרי שינויים"}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-brutal-red font-bold">{error}</p>}
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-t-2 border-brutal-red bg-red-50 p-4"
          >
            <p className="text-sm font-bold mb-3">למחוק את ההסבר הזה?</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="brutal-btn text-xs px-4 py-2"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="brutal-btn-red text-xs px-4 py-2 disabled:opacity-40"
              >
                {deleting ? "מוחק..." : "כן, מחקי"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function NotesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<UserNoteWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const notes = await fetchUserNotes(user.uid);
      setItems(notes);
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSaved = (questionId: string, text: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.note.questionId === questionId
          ? { ...item, note: { ...item.note, text } }
          : item
      )
    );
  };

  const handleDeleted = (questionId: string) => {
    setItems((prev) => prev.filter((item) => item.note.questionId !== questionId));
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex items-center justify-between p-4 border-b-3 border-brutal-black bg-white">
        <button
          onClick={() => router.push("/")}
          className="brutal-btn text-sm px-4 py-2"
        >
          → חזרה
        </button>
        <h1 className="font-display text-lg">ההסברים שלי</h1>
        <div className="w-20" />
      </div>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-brutal-grey animate-pulse">טוען הסברים...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-brutal-grey">עדיין לא הוספת הסברים.</p>
            <p className="text-sm text-brutal-grey">
              אחרי שתעני על שאלה ותראי את התשובה, תוכלי להוסיף הסבר שיעזור לסחבק הבא.
            </p>
            <button
              onClick={() => router.push("/test?mode=practice")}
              className="brutal-btn-red text-sm px-6 py-3"
            >
              לתרגל שאלות
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-brutal-grey text-center mb-2">
              {items.length} הסברים
            </p>
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <NoteEditor
                  key={item.note.questionId}
                  item={item}
                  onSaved={handleSaved}
                  onDeleted={handleDeleted}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <NotesPage />
    </AuthGuard>
  );
}
