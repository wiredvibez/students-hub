"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import { getQuestionCount } from "@/lib/questions";
import AuthGuard from "@/components/AuthGuard";
import Leaderboard from "@/components/Leaderboard";

function HomePage() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [questionCount, setQuestionCount] = useState<number | null>(null);

  useEffect(() => {
    getQuestionCount().then(setQuestionCount).catch(() => setQuestionCount(0));
  }, []);

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b-3 border-brutal-black bg-white">
        <button
          onClick={() => router.push("/add")}
          className="brutal-btn text-sm px-4 py-2"
        >
          + הוסף שאלה
        </button>
        <div className="flex items-center gap-2 text-sm text-brutal-grey">
          <span>{profile?.displayName}</span>
          <span>|</span>
          <button
            onClick={signOut}
            className="hover:text-brutal-red transition-colors"
          >
            מפה יוצאים
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row items-center md:items-stretch justify-center px-4 py-12 gap-8 md:gap-12 md:px-12 lg:px-20">
        {/* Hero */}
        <div className="flex flex-col items-center justify-center md:flex-1">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-5xl md:text-7xl leading-[1.1] mb-2">
              התנהגות ארגונית
            </h1>
            <div className="relative inline-block">
              <h2 className="font-display text-4xl md:text-6xl text-brutal-red">
                מיקרו
              </h2>
              <div className="absolute -bottom-2 left-0 right-0 h-[3px] bg-brutal-red" />
            </div>
          </motion.div>

          {questionCount !== null && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="font-display text-lg md:text-xl mb-8 text-brutal-grey"
            >
              <span className="text-brutal-black font-bold text-2xl md:text-3xl">
                {questionCount}
              </span>{" "}
              שאלות בפלטפורמה
            </motion.p>
          )}

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/test")}
            className="brutal-btn-red text-2xl md:text-3xl font-display
                       px-12 py-6 md:px-16 md:py-8
                       shadow-brutal-lg
                       hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
          >
            לטחון שאלות
          </motion.button>
        </div>

        {/* Decorative line - mobile only */}
        <div className="w-full max-w-md flex items-center gap-4 md:hidden">
          <div className="flex-1 h-[3px] bg-brutal-black" />
          <span className="font-display text-sm text-brutal-grey">
            לוח תוצאות
          </span>
          <div className="flex-1 h-[3px] bg-brutal-black" />
        </div>

        {/* Vertical divider - desktop only */}
        <div className="hidden md:block w-[3px] bg-brutal-black self-stretch" />

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full max-w-md md:flex-1 md:max-w-none md:flex md:flex-col md:justify-center"
        >
          <Leaderboard />
        </motion.div>
      </div>

      {/* Footer */}
      <div className="border-t-3 border-brutal-black p-3 text-center bg-white">
        <p className="text-xs text-brutal-grey">
          פרויקט סטודנטים — בהצלחה במבחן!
        </p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <HomePage />
    </AuthGuard>
  );
}
