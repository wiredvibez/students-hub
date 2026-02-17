"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useAuth } from "@/lib/auth-context";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

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

  if (!user || !profile) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-brutal-paper p-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-6"
        >
          <div className="brutal-card p-8 max-w-sm mx-auto">
            <h1 className="font-display text-2xl mb-4">גישה נדחתה</h1>
            <p className="text-brutal-grey mb-6">
              יש להתחבר כדי לגשת לעמוד זה
            </p>
            <button
              onClick={() => router.push("/")}
              className="brutal-btn w-full"
            >
              חזרה לדף הבית
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!profile.admin) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-brutal-paper p-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-6"
        >
          <div className="brutal-card p-8 max-w-sm mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 border-3 border-brutal-red bg-brutal-red/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-brutal-red"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="font-display text-2xl mb-2">גישה נדחתה</h1>
            <p className="text-brutal-grey mb-6">
              אין לך הרשאות מנהל לצפות בעמוד זה
            </p>
            <button
              onClick={() => router.push("/")}
              className="brutal-btn w-full"
            >
              חזרה לדף הבית
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
