"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { fetchLeaderboard } from "@/lib/questions";
import type { LeaderboardEntry } from "@/lib/types";

const MIN_ENTRIES = 3;
const SPARKLE_COUNT = 12;

interface LeaderboardProps {
  onVisibilityChange?: (visible: boolean) => void;
}

/* ---------- Sparkle particle ---------- */

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

const EMOJIS = ["✨", "⭐", "💫", "🌟"];
let particleId = 0;

function SparkleParticles({ particles }: { particles: Particle[] }) {
  return (
    <AnimatePresence>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{
            opacity: 1,
            x: p.x,
            y: p.y,
            scale: 0.5,
          }}
          animate={{
            opacity: 0,
            y: p.y + 120 + Math.random() * 80,
            x: p.x + (Math.random() - 0.5) * 100,
            scale: 0.2 + Math.random() * 0.5,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 1.2 + Math.random() * 0.6,
            ease: "easeOut",
          }}
          className="pointer-events-none fixed z-50 text-lg select-none"
          style={{ left: 0, top: 0 }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </AnimatePresence>
  );
}

/* ---------- Format time as HH:MM ---------- */

function formatTime(date: Date): string {
  return date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/* ---------- Leaderboard ---------- */

export default function Leaderboard({ onVisibilityChange }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [updatedUids, setUpdatedUids] = useState<Set<string>>(new Set());
  const [particles, setParticles] = useState<Particle[]>([]);
  const prevEntriesRef = useRef<Map<string, number>>(new Map());
  const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const isFirstFetch = useRef(true);

  const spawnSparkles = useCallback((el: HTMLDivElement) => {
    const rect = el.getBoundingClientRect();
    const newParticles: Particle[] = [];

    for (let i = 0; i < SPARKLE_COUNT; i++) {
      newParticles.push({
        id: ++particleId,
        x: rect.left + Math.random() * rect.width,
        y: rect.top + Math.random() * rect.height * 0.5 - 20,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !newParticles.some((np) => np.id === p.id))
      );
    }, 2200);
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const newEntries = await fetchLeaderboard();

      if (isFirstFetch.current) {
        isFirstFetch.current = false;
        const map = new Map<string, number>();
        newEntries.forEach((e) => map.set(e.uid, e.totalAnswered));
        prevEntriesRef.current = map;
        setEntries(newEntries);
        setLoading(false);
        setLastUpdated(new Date());
        return;
      }

      const changed = new Set<string>();
      const prevMap = prevEntriesRef.current;

      newEntries.forEach((e) => {
        const prev = prevMap.get(e.uid);
        if (prev !== undefined && e.totalAnswered > prev) {
          changed.add(e.uid);
        }
      });

      const nextMap = new Map<string, number>();
      newEntries.forEach((e) => nextMap.set(e.uid, e.totalAnswered));
      prevEntriesRef.current = nextMap;

      setEntries(newEntries);
      setLastUpdated(new Date());

      if (changed.size > 0) {
        setUpdatedUids(changed);

        requestAnimationFrame(() => {
          changed.forEach((uid) => {
            const el = rowRefs.current.get(uid);
            if (el) spawnSparkles(el);
          });
        });

        setTimeout(() => setUpdatedUids(new Set()), 1500);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    }
  }, [spawnSparkles]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  }, [refreshing, loadLeaderboard]);

  // Initial fetch on mount
  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const visible = !loading && entries.length >= MIN_ENTRIES;

  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [visible, onVisibilityChange]);

  if (!visible) return null;

  return (
    <>
      <SparkleParticles particles={particles} />

      <div className="brutal-card overflow-hidden">
        {/* Refresh bar */}
        <div className="bg-brutal-white border-b-2 border-brutal-black px-4 py-2 flex items-center justify-between">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-brutal-grey hover:text-brutal-black transition-colors disabled:opacity-50"
            aria-label="רענן נתונים"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0v2.43l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389 5.5 5.5 0 0 1 9.202-2.466l.311.311H11.77a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.22Z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs font-medium">רענן</span>
          </button>

          {lastUpdated && (
            <span className="text-xs text-brutal-grey">
              עודכן בשעה {formatTime(lastUpdated)}
            </span>
          )}
        </div>

        {/* Header */}
        <div className="bg-brutal-black text-brutal-white px-4 py-3 flex items-center justify-between">
          <h3 className="font-display text-lg">לוח תוצאות</h3>
          <span className="text-xs text-brutal-white/60">
            {entries.length} משתתפים
          </span>
        </div>

        {/* Table */}
        <div className="divide-y-2 divide-brutal-black">
          {entries.map((entry, i) => {
            const isUpdated = updatedUids.has(entry.uid);

            return (
              <motion.div
                key={entry.uid}
                ref={(el) => {
                  rowRefs.current.set(entry.uid, el);
                }}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  backgroundColor: isUpdated
                    ? [
                        "rgba(255,220,100,0.35)",
                        i === 0
                          ? "rgba(255,0,0,0.05)"
                          : "rgba(255,255,255,1)",
                      ]
                    : undefined,
                }}
                transition={{
                  layout: { type: "spring", stiffness: 400, damping: 30 },
                  backgroundColor: { duration: 1.2 },
                  delay: i * 0.03,
                }}
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
                  <motion.span
                    key={entry.totalAnswered}
                    initial={isUpdated ? { scale: 1.4 } : false}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className="font-black text-lg tabular-nums"
                  >
                    {entry.totalAnswered}
                  </motion.span>
                  <span className="text-xs text-brutal-grey">שאלות</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </>
  );
}
