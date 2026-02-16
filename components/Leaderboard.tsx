"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { subscribeLeaderboard } from "@/lib/questions";
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

/* ---------- Leaderboard ---------- */

export default function Leaderboard({ onVisibilityChange }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedUids, setUpdatedUids] = useState<Set<string>>(new Set());
  const [particles, setParticles] = useState<Particle[]>([]);
  const prevEntriesRef = useRef<Map<string, number>>(new Map());
  const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const isFirstSnapshot = useRef(true);

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

  useEffect(() => {
    const unsubscribe = subscribeLeaderboard((newEntries) => {
      if (isFirstSnapshot.current) {
        isFirstSnapshot.current = false;
        const map = new Map<string, number>();
        newEntries.forEach((e) => map.set(e.uid, e.totalAnswered));
        prevEntriesRef.current = map;
        setEntries(newEntries);
        setLoading(false);
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
    });

    return unsubscribe;
  }, [spawnSparkles]);

  const visible = !loading && entries.length >= MIN_ENTRIES;

  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [visible, onVisibilityChange]);

  if (!visible) return null;

  return (
    <>
      <SparkleParticles particles={particles} />

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
