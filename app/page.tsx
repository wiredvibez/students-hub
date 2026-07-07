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
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    getQuestionCount().then(setQuestionCount).catch(() => setQuestionCount(0));
  }, []);

  const correctPct =
    profile && profile.totalAnswered > 0
      ? Math.round((profile.totalCorrect / profile.totalAnswered) * 100)
      : null;

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 px-2 py-2 md:p-4 border-b-3 border-brutal-black bg-white">
        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
          <button
            onClick={() => router.push("/add")}
            className="brutal-btn text-xs px-2 py-1 md:text-sm md:px-4 md:py-2 whitespace-nowrap"
          >
            + הוסף שאלה
          </button>
          <button
            onClick={() => router.push("/notes")}
            className="brutal-btn text-xs px-2 py-1 md:text-sm md:px-4 md:py-2 whitespace-nowrap"
          >
            ההסברים שלי
          </button>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-brutal-grey shrink-0">
          <span className="truncate max-w-[4.5rem] md:max-w-none">
            {profile?.displayName}
          </span>
          <span className="hidden sm:inline">|</span>
          <button
            onClick={signOut}
            className="hover:text-brutal-red transition-colors whitespace-nowrap"
          >
            התנתקות
          </button>
        </div>
      </div>

      {/* User Stats */}
      {profile && profile.totalAnswered > 0 && (
        <div className="flex items-center justify-center gap-6 px-4 py-2.5 bg-brutal-black/[0.03] border-b-3 border-brutal-black">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-black text-lg tabular-nums">
              {profile.totalAnswered}
            </span>
            <span className="text-brutal-grey">שאלות נענו</span>
          </div>
          {correctPct !== null && (
            <>
              <div className="w-[2px] h-4 bg-brutal-black/20" />
              <div className="flex items-center gap-1.5 text-sm">
                <span
                  className={`font-black text-lg tabular-nums ${
                    correctPct >= 75
                      ? "text-green-600"
                      : correctPct >= 50
                      ? "text-yellow-600"
                      : "text-brutal-red"
                  }`}
                >
                  {correctPct}%
                </span>
                <span className="text-brutal-grey">הצלחה</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col items-center px-4 py-12 gap-8 ${
          showLeaderboard
            ? "md:flex-row md:items-start md:gap-12 md:px-12 lg:px-20"
            : "justify-center"
        }`}
      >
        {/* Hero — sticks to top on desktop when leaderboard is visible */}
        <div
          className={`flex flex-col items-center ${
            showLeaderboard
              ? "md:flex-1 md:sticky md:top-8 md:pt-4"
              : "justify-center"
          }`}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-5xl md:text-7xl leading-[1.1] mb-2">
              מבוא למדעי הנתונים
            </h1>
            <div className="relative inline-block">
              <h2 className="font-display text-4xl md:text-6xl text-brutal-red">
                לניהול
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

          <div className="flex flex-col items-center gap-4 w-full max-w-md">
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/test")}
              className="brutal-btn-red text-2xl md:text-3xl font-display
                         w-full px-12 py-6 md:px-16 md:py-8
                         shadow-brutal-lg
                         hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
            >
              לטחון שאלות
            </motion.button>

            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/test?mode=practice")}
              className="brutal-btn text-lg md:text-xl font-display
                         w-full px-8 py-4 md:px-12 md:py-5
                         shadow-brutal
                         hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              תרגול שאלה שאלה
            </motion.button>

            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/add")}
              className="brutal-btn text-base md:text-lg font-display
                         w-full px-8 py-3 md:px-12 md:py-4
                         shadow-brutal-sm
                         hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              + הוסף שאלה
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="text-xs text-brutal-grey text-center leading-relaxed"
            >
              מצב מבחן: 10 שאלות, סיכום בסוף · מצב תרגול: משוב מיידי אחרי כל תשובה
            </motion.p>
          </div>
        </div>

        {/* Decorative line - mobile only */}
        {showLeaderboard && (
          <div className="w-full max-w-md flex items-center gap-4 md:hidden">
            <div className="flex-1 h-[3px] bg-brutal-black" />
            <span className="font-display text-sm text-brutal-grey">
              לוח תוצאות
            </span>
            <div className="flex-1 h-[3px] bg-brutal-black" />
          </div>
        )}

        {/* Vertical divider - desktop only */}
        {showLeaderboard && (
          <div className="hidden md:block w-[3px] bg-brutal-black self-stretch" />
        )}

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: showLeaderboard ? 1 : 0,
            y: showLeaderboard ? 0 : 20,
          }}
          transition={{ delay: showLeaderboard ? 0.4 : 0, duration: 0.5 }}
          className={
            showLeaderboard
              ? "w-full max-w-md md:flex-1 md:max-w-none"
              : "hidden"
          }
        >
          <Leaderboard onVisibilityChange={setShowLeaderboard} />
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
