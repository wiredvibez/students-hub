/**
 * Reset all question statistics and clear the leaderboard.
 *
 * What it does:
 *  1. Resets every user's totalAnswered & totalCorrect to 0
 *  2. Deletes every document in each user's "answers" subcollection
 *  3. Resets every question's timesAnswered to 0, ratings to [], avgRating to 5
 *
 * Usage:
 *  1. Download a service-account key from Firebase Console:
 *     Project Settings > Service accounts > Generate new private key
 *  2. Save it as  scripts/serviceAccountKey.json  (git-ignored)
 *  3. Run:  node scripts/reset-stats.mjs
 */

import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const KEY_PATH = new URL("./serviceAccountKey.json", import.meta.url);

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(KEY_PATH, "utf-8"));
} catch {
  console.error(
    "❌  Could not find scripts/serviceAccountKey.json\n" +
      "   Download it from Firebase Console → Project Settings → Service accounts → Generate new private key\n"
  );
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const BATCH_LIMIT = 500;

/**
 * Commit a Firestore batch and return a fresh one.
 */
async function flushBatch(batch, count) {
  if (count > 0) await batch.commit();
  return { batch: db.batch(), count: 0 };
}

async function main() {
  console.log("🔄  Starting statistics reset…\n");

  let batch = db.batch();
  let ops = 0;

  // ── 1. Reset user stats & delete their answer docs ────────────────
  const usersSnap = await db.collection("users").get();
  console.log(`   Found ${usersSnap.size} user(s)`);

  for (const userDoc of usersSnap.docs) {
    // Reset counters
    batch.update(userDoc.ref, { totalAnswered: 0, totalCorrect: 0 });
    ops++;

    if (ops >= BATCH_LIMIT) {
      ({ batch, count: ops } = await flushBatch(batch, ops));
    }

    // Delete every answer in the subcollection
    const answersSnap = await userDoc.ref.collection("answers").get();
    for (const ansDoc of answersSnap.docs) {
      batch.delete(ansDoc.ref);
      ops++;

      if (ops >= BATCH_LIMIT) {
        ({ batch, count: ops } = await flushBatch(batch, ops));
      }
    }

    console.log(
      `   ✓ ${userDoc.data().displayName || userDoc.id} — reset stats, deleted ${answersSnap.size} answer(s)`
    );
  }

  // ── 2. Reset question statistics ──────────────────────────────────
  const questionsSnap = await db.collection("questions").get();
  console.log(`\n   Found ${questionsSnap.size} question(s)`);

  for (const qDoc of questionsSnap.docs) {
    batch.update(qDoc.ref, {
      timesAnswered: 0,
      ratings: [],
      avgRating: 5,
    });
    ops++;

    if (ops >= BATCH_LIMIT) {
      ({ batch, count: ops } = await flushBatch(batch, ops));
    }
  }

  // Flush remaining ops
  await flushBatch(batch, ops);

  console.log("\n✅  All statistics reset. Leaderboard is now empty.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
