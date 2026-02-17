"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import {
  fetchAllQuestionsAdmin,
  deleteQuestion,
  getUserDisplayNames,
} from "@/lib/questions";
import type { Question } from "@/lib/types";

export default function AdminQuestionsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fetch questions and user names
  useEffect(() => {
    async function loadData() {
      try {
        const allQuestions = await fetchAllQuestionsAdmin();
        setQuestions(allQuestions);

        // Get unique creator UIDs and fetch their display names
        const creatorUids = allQuestions.map((q) => q.createdBy);
        const names = await getUserDisplayNames(creatorUids);
        setUserNames(names);
      } catch (error) {
        console.error("Failed to load questions:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter questions based on search query
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;

    const query = searchQuery.toLowerCase();
    return questions.filter((q) => {
      // Search in question text
      if (q.question.toLowerCase().includes(query)) return true;
      // Search in options
      if (q.options.some((opt) => opt.toLowerCase().includes(query)))
        return true;
      return false;
    });
  }, [questions, searchQuery]);

  // Handle delete
  const handleDelete = async (questionId: string) => {
    setDeleting(questionId);
    try {
      await deleteQuestion(questionId);
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete question:", error);
      alert("שגיאה במחיקת השאלה");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-brutal-paper">
        <motion.div
          animate={{ rotate: [0, 90, 180, 270, 360] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-3 border-brutal-black border-t-brutal-red"
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-brutal-paper">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b-3 border-brutal-black">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="brutal-btn px-3 py-2 text-sm"
            >
              ← חזרה
            </button>
            <div>
              <h1 className="font-display text-xl md:text-2xl">ניהול שאלות</h1>
              <p className="text-sm text-brutal-grey">
                {questions.length} שאלות בסה״כ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-brutal-grey">
            <span className="hidden sm:inline">{profile?.displayName}</span>
            <span className="px-2 py-1 bg-brutal-red text-white text-xs font-bold">
              ADMIN
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="חיפוש לפי טקסט שאלה או תשובות..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-3 border-brutal-black px-4 py-3 pr-12 bg-white
                         focus:outline-none focus:ring-2 focus:ring-brutal-red focus:ring-offset-2
                         placeholder:text-brutal-grey/60"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brutal-grey"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-brutal-grey">
              נמצאו {filteredQuestions.length} תוצאות
            </p>
          )}
        </div>
      </header>

      {/* Table */}
      <main className="flex-1 p-4 overflow-x-auto">
        <div className="brutal-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brutal-black text-white">
                <th className="px-4 py-3 text-right font-display">#</th>
                <th className="px-4 py-3 text-right font-display min-w-[300px]">
                  שאלה
                </th>
                <th className="px-4 py-3 text-right font-display">נענתה</th>
                <th className="px-4 py-3 text-right font-display">דירוג</th>
                <th className="px-4 py-3 text-right font-display">הוסיף</th>
                <th className="px-4 py-3 text-center font-display">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="text-brutal-grey">
                      {searchQuery
                        ? "לא נמצאו שאלות התואמות לחיפוש"
                        : "אין שאלות במערכת"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((question, index) => {
                  const isHidden =
                    question.avgRating <= 3 && question.ratings.length >= 3;
                  return (
                    <motion.tr
                      key={question.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className={`border-b-2 border-brutal-lightGrey last:border-b-0 
                                  hover:bg-brutal-lightGrey/30 transition-colors
                                  ${isHidden ? "bg-brutal-red/5" : ""}`}
                    >
                      <td className="px-4 py-3 text-brutal-grey tabular-nums">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-md">
                          <p className="font-medium line-clamp-2">
                            {question.question}
                          </p>
                          <p className="text-xs text-brutal-grey mt-1 line-clamp-1">
                            {question.options.join(" | ")}
                          </p>
                          {isHidden && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-brutal-red/10 text-brutal-red text-xs font-bold">
                              מוסתרת (דירוג נמוך)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {question.timesAnswered}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="tabular-nums">
                            {question.avgRating.toFixed(1)}
                          </span>
                          <span className="text-brutal-grey text-xs">
                            ({question.ratings.length})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-brutal-grey">
                        {userNames[question.createdBy] || "???"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteConfirm(question.id)}
                            disabled={deleting === question.id}
                            className="p-2 border-2 border-brutal-black bg-white hover:bg-brutal-red 
                                       hover:text-white hover:border-brutal-red transition-colors
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                            title="מחיקת שאלה"
                          >
                            {deleting === question.id ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                              />
                            ) : (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brutal-black/50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="brutal-card p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 border-3 border-brutal-red bg-brutal-red/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-brutal-red"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <h2 className="font-display text-xl mb-2">מחיקת שאלה</h2>
                <p className="text-brutal-grey mb-6">
                  האם אתה בטוח שברצונך למחוק שאלה זו?
                  <br />
                  <span className="text-brutal-red font-bold">
                    פעולה זו אינה ניתנת לביטול.
                  </span>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="brutal-btn flex-1"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    disabled={deleting !== null}
                    className="brutal-btn-red flex-1 disabled:opacity-50"
                  >
                    {deleting ? "מוחק..." : "מחק"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
