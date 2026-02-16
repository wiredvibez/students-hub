"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { fetchLeaderboard } from "@/lib/questions";
import type { LeaderboardEntry } from "@/lib/types";

const MIN_ENTRIES = 3;

interface LeaderboardProps {
  onVisibilityChange?: (visible: boolean) => void;
}

export default function Leaderboard({ onVisibilityChange }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  const visible = !loading && entries.length >= MIN_ENTRIES;

  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [visible, onVisibilityChange]);

  if (!visible) return null;

  return (
    <div className="brutal-card overflow-hidden">
      {/* Header */}
      <div className="bg-brutal-black text-brutal-white px-4 py-3 flex items-center justify-between">
        <h3 className="font-display text-lg">לוח תוצאות</h3>
        <span className="text-xs text-brutal-white/60">
          {entries.length} משתתפים
        </span>
      </div>

      {/* Table */}
      <div className="divide-y-2 divide-brutal-black">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.uid}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center px-4 py-3 gap-3 ${
              i === 0 ? "bg-brutal-red/5" : "bg-white"
            }`}
          >
            {/* Rank */}
            <span
              className={`font-body font-black text-xl w-8 text-center ${
                i === 0
                  ? "text-brutal-red"
                  : i === 1
                  ? "text-brutal-black"
                  : "text-brutal-grey"
              }`}
            >
              {i + 1}
            </span>

            {/* Name */}
            <span className="font-bold flex-1 truncate">
              {entry.displayName}
            </span>

            {/* Count */}
            <div className="flex items-center gap-1">
              <span className="font-black text-lg tabular-nums">
                {entry.totalAnswered}
              </span>
              <span className="text-xs text-brutal-grey">שאלות</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
