"use client";

import { ReactNode } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import DisplayNameModal from "./DisplayNameModal";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading, signInWithGoogle } = useAuth();

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

  if (!user) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-brutal-paper p-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-8"
        >
          <div>
            <h1 className="font-display text-4xl md:text-5xl leading-tight mb-3">
              התנהגות ארגונית
            </h1>
            <h2 className="font-display text-3xl md:text-4xl text-brutal-red">
              מיקרו
            </h2>
          </div>

          <div className="brutal-card p-6 max-w-xs mx-auto">
            <p className="text-sm text-brutal-grey mb-4">
              התחברו כדי להתחיל לטחון שאלות
            </p>
            <button
              onClick={signInWithGoogle}
              className="brutal-btn-black w-full flex items-center justify-center gap-3 text-base"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              התחברות עם Google
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-brutal-grey text-xs">
            <div className="w-8 h-[3px] bg-brutal-black" />
            <span>פרויקט סטודנטים</span>
            <div className="w-8 h-[3px] bg-brutal-black" />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return <DisplayNameModal />;
  }

  return <>{children}</>;
}
