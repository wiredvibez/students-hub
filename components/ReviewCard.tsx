"use client";

import { motion } from "motion/react";
import RatingStars from "./RatingStars";
import type { Question, UserAnswerLocal } from "@/lib/types";

const LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח"];

interface ReviewCardProps {
  index: number;
  question: Question;
  answer: UserAnswerLocal;
  onRate: (rating: number) => void;
}

export default function ReviewCard({
  index,
  question,
  answer,
  onRate,
}: ReviewCardProps) {
  const isCorrect = answer.isCorrect;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`brutal-card overflow-hidden ${
        isCorrect ? "border-green-600" : "border-brutal-red"
      }`}
    >
      {/* Header strip */}
      <div
        className={`px-4 py-2 flex items-center justify-between ${
          isCorrect ? "bg-green-600" : "bg-brutal-red"
        } text-white`}
      >
        <span className="font-bold text-sm">שאלה {index + 1}</span>
        <span className="font-display text-sm">
          {isCorrect ? "✓ נכון" : "✗ שגוי"}
        </span>
      </div>

      {/* Question text */}
      <div className="p-4 border-b-2 border-brutal-black/10">
        <p className="font-bold leading-relaxed">{question.question}</p>
      </div>

      {/* Options */}
      <div className="p-4 space-y-2">
        {question.options.map((option, i) => {
          const isUserChoice = answer.userAnswer === i;
          const isCorrectAnswer = question.correctAnswerIndex === i;

          let bgClass = "bg-white";
          let borderClass = "border-brutal-black/20";
          let textExtra = "";

          if (isCorrectAnswer) {
            bgClass = "bg-green-50";
            borderClass = "border-green-600";
            textExtra = "text-green-800";
          }
          if (isUserChoice && !isCorrectAnswer) {
            bgClass = "bg-red-50";
            borderClass = "border-brutal-red";
            textExtra = "text-red-800 line-through";
          }

          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 border-2 ${bgClass} ${borderClass}`}
            >
              <span
                className={`font-bold text-sm w-6 h-6 flex items-center justify-center
                  border-2 ${borderClass} ${textExtra}`}
              >
                {LETTERS[i]}
              </span>
              <span className={`flex-1 text-sm ${textExtra}`}>{option}</span>
              {isCorrectAnswer && (
                <span className="text-green-600 font-bold text-xs">✓</span>
              )}
              {isUserChoice && !isCorrectAnswer && (
                <span className="text-brutal-red font-bold text-xs">✗</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Rating section */}
      <div className="p-4 border-t-2 border-brutal-black/10 bg-brutal-paper/50">
        <RatingStars
          value={answer.rating || 0}
          onChange={onRate}
          size="sm"
        />
      </div>
    </motion.div>
  );
}
