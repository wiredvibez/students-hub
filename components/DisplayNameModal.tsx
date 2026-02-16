"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/lib/auth-context";

export default function DisplayNameModal() {
  const { needsDisplayName, setDisplayName } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await setDisplayName(name.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {needsDisplayName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-brutal-black/80 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 30 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="brutal-card bg-brutal-white p-8 w-full max-w-sm"
          >
            <h2 className="font-display text-2xl mb-2 text-center">
              !ברוכים הבאים
            </h2>
            <p className="text-brutal-grey text-center mb-6 text-sm">
              בחרו שם תצוגה שיוצג בלוח התוצאות
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="השם שלך..."
                maxLength={20}
                className="w-full p-3 brutal-border bg-white font-body text-lg
                           focus:outline-none focus:border-brutal-red
                           placeholder:text-brutal-grey/50"
                autoFocus
              />
              <button
                type="submit"
                disabled={!name.trim() || saving}
                className="brutal-btn-red w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "..." : "יאללה"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
