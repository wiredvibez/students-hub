"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/AuthGuard";
import ReviewCard from "@/components/ReviewCard";
import { getNextBatch, saveAnswer, rateQuestion } from "@/lib/questions";
import type { Question, UserAnswerLocal } from "@/lib/types";

const LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח"];
const BATCH_SIZE = 20;

type TestState = "loading" | "testing" | "review";

function TestPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(UserAnswerLocal | null)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date());
  const [testState, setTestState] = useState<TestState>("loading");
  const [showSplash, setShowSplash] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadBatch = useCallback(async () => {
    if (!user) return;
    setTestState("loading");
    try {
      const batch = await getNextBatch(user.uid, BATCH_SIZE);
      if (batch.length === 0) {
        router.push("/");
        return;
      }
      setQuestions(batch);
      setAnswers(new Array(batch.length).fill(null));
      setCurrentIndex(0);
      setSelectedOption(null);
      setQuestionStartTime(new Date());
      setSubmitting(false);
      setTestState("testing");
    } catch (err) {
      console.error("Failed to load questions:", err);
      router.push("/");
    }
  }, [user, router]);

  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !user || submitting) return;
    setSubmitting(true);

    const question = questions[currentIndex];
    const now = new Date();

    const answer: UserAnswerLocal = {
      questionId: question.id,
      userAnswer: selectedOption,
      isCorrect: selectedOption === question.correctAnswerIndex,
      startTime: questionStartTime,
      submitTime: now,
    };

    const newAnswers = [...answers];
    newAnswers[currentIndex] = answer;
    setAnswers(newAnswers);

    // Persist immediately — fire-and-forget so the UI stays snappy
    saveAnswer(user.uid, answer).catch(console.error);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setQuestionStartTime(new Date());
      setSubmitting(false);
    } else {
      setTestState("review");
      setShowSplash(true);
    }
  };

  const handleRate = (questionIndex: number, rating: number) => {
    const newAnswers = [...answers];
    const existing = newAnswers[questionIndex];
    if (existing) {
      newAnswers[questionIndex] = { ...existing, rating };
      setAnswers(newAnswers);
      rateQuestion(existing.questionId, rating).catch(console.error);
    }
  };

  const handleContinue = (goHome: boolean) => {
    if (goHome) {
      router.push("/");
    } else {
      loadBatch();
    }
  };

  if (testState === "loading") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-brutal-paper gap-4">
        <motion.div
          animate={{ rotate: [0, 90, 180, 270, 360] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-3 border-brutal-black border-t-brutal-red"
        />
        <p className="font-bold text-brutal-grey">טוען שאלות...</p>
      </div>
    );
  }

  if (testState === "review") {
    const validAnswers = answers.filter(
      (a): a is UserAnswerLocal => a !== null
    );
    const correctCount = validAnswers.filter((a) => a.isCorrect).length;

    return (
      <div className="min-h-dvh bg-brutal-paper">
        {/* Splash Popup */}
        <AnimatePresence>
          {showSplash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="brutal-card bg-white max-w-sm w-full p-5 space-y-4"
              >
                <h3 className="font-display text-lg text-center">סיכום הסבב</h3>
                <ul className="space-y-3 text-sm leading-relaxed">
                  <li className="flex gap-2">
                    <span className="shrink-0 font-bold text-brutal-red">1.</span>
                    <span>בעמוד זה תוכלו לראות את השאלות שעניתם ואת התשובות הנכונות.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 font-bold text-brutal-red">2.</span>
                    <span>
                      דרגו שאלות איכותיות גבוה ושאלות גרועות נמוך —
                      <strong> שאלות מדורגות נמוך יופיעו פחות לסטודנטים אחרים.</strong>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 font-bold text-brutal-red">3.</span>
                    <span>
                      בסיום, תוכלו להמשיך לעוד {BATCH_SIZE} שאלות או לחזור לדף הראשי
                      לצפייה בלידרבורד והוספת שאלות חדשות.
                    </span>
                  </li>
                </ul>
                <button
                  onClick={() => setShowSplash(false)}
                  className="brutal-btn-red w-full text-sm"
                >
                  הבנתי, בואו נתחיל
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Review Header */}
        <div className="sticky top-0 z-10 bg-brutal-black text-white px-3 py-2 border-b-3 border-brutal-red">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <h2 className="font-display text-lg">סיכום סבב</h2>
            <div className="flex items-center gap-1.5">
              <span
                className={`font-black text-xl tabular-nums ${
                  correctCount >= validAnswers.length * 0.75
                    ? "text-green-400"
                    : correctCount >= validAnswers.length * 0.5
                    ? "text-yellow-400"
                    : "text-brutal-red"
                }`}
              >
                {correctCount}
              </span>
              <span className="text-white/60 text-sm">
                / {validAnswers.length}
              </span>
            </div>
          </div>
        </div>

        {/* Review Cards */}
        <div className="max-w-lg mx-auto px-3 py-3 space-y-3 pb-28">
          {questions.map((question, i) => {
            const answer = answers[i];
            if (!answer) return null;
            return (
              <ReviewCard
                key={question.id}
                index={i}
                question={question}
                answer={answer}
                onRate={(rating) => handleRate(i, rating)}
              />
            );
          })}
        </div>

        {/* Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-3 border-brutal-black px-3 py-2">
          <div className="max-w-lg mx-auto flex gap-2">
            <button
              onClick={() => handleContinue(true)}
              className="brutal-btn flex-1 text-sm"
            >
              חזור לדף הראשי
            </button>
            <button
              onClick={() => handleContinue(false)}
              className="brutal-btn-red flex-1 text-sm"
            >
              המשך לעוד {BATCH_SIZE}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Testing state - show single question
  const question = questions[currentIndex];
  if (!question) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-dvh bg-brutal-paper flex flex-col">
      {/* Progress Bar */}
      <div className="h-[6px] bg-brutal-lightGrey">
        <motion.div
          className="h-full bg-brutal-red"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Top info */}
      <div className="relative flex items-center justify-between px-3 py-2 border-b-3 border-brutal-black bg-white">
        <button
          onClick={() => router.push("/")}
          className="text-xs font-bold text-brutal-grey hover:text-brutal-red transition-colors"
        >
          ← יציאה
        </button>

        {question.ratings.length > 0 && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            <span className="text-brutal-red text-base">★</span>
            <span className="font-black text-sm tabular-nums">
              {question.avgRating.toFixed(1)}
            </span>
            <span className="text-[10px] text-brutal-grey">
              ({question.ratings.length})
            </span>
          </div>
        )}

        <span className="font-black text-sm tabular-nums">
          {currentIndex + 1}
          <span className="text-brutal-grey font-normal">
            /{questions.length}
          </span>
        </span>
      </div>

      {/* Question Content */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-3 py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            {/* Question text */}
            <div className="brutal-card p-3 mb-3">
              <p className="font-bold text-base leading-snug">
                {question.question}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2 flex-1">
              {question.options.map((option, i) => {
                const isSelected = selectedOption === i;
                return (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedOption(i)}
                    className={`w-full text-right px-3 py-2.5 border-3 transition-all duration-75 flex items-center gap-2
                      ${
                        isSelected
                          ? "border-brutal-red bg-brutal-red/5 shadow-brutal-red translate-x-[-2px] translate-y-[-2px]"
                          : "border-brutal-black bg-white shadow-brutal-sm hover:shadow-brutal hover:translate-x-[-1px] hover:translate-y-[-1px]"
                      }`}
                  >
                    <span
                      className={`w-7 h-7 flex items-center justify-center border-2 font-bold text-xs shrink-0
                        ${
                          isSelected
                            ? "border-brutal-red bg-brutal-red text-white"
                            : "border-brutal-black bg-white"
                        }`}
                    >
                      {LETTERS[i]}
                    </span>
                    <span className="flex-1 text-sm font-medium">{option}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Submit button */}
        <div className="pt-3 pb-3">
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedOption === null}
            className={`w-full text-base font-display py-3
              ${
                selectedOption !== null
                  ? "brutal-btn-red"
                  : "brutal-border bg-brutal-lightGrey text-brutal-grey cursor-not-allowed"
              }`}
          >
            {currentIndex < questions.length - 1 ? "הבא ←" : "סיום וסיכום"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <TestPage />
    </AuthGuard>
  );
}
