import {
  collection,
  doc,
  getDocs,
  getDoc,
  getCountFromServer,
  addDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  increment,
  arrayUnion
} from "firebase/firestore";
import { getAppDb } from "./firebase";
import type { Question, UserAnswerLocal, LeaderboardEntry } from "./types";

/**
 * Fetch all valid (non-hidden) questions.
 * Hidden = avgRating <= 3 AND ratings.length > 3
 */
export async function fetchAllQuestions(): Promise<Question[]> {
  const snapshot = await getDocs(collection(getAppDb(), "questions"));
  const questions: Question[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const q: Question = {
      id: docSnap.id,
      question: data.question,
      options: data.options,
      correctAnswerIndex: data.correctAnswerIndex,
      createdAt: data.createdAt,
      createdBy: data.createdBy || "",
      timesAnswered: data.timesAnswered || 0,
      ratings: data.ratings || [],
      avgRating: data.avgRating || 5,
    };

    const isHidden = q.avgRating <= 3 && q.ratings.length > 3;
    if (!isHidden) {
      questions.push(q);
    }
  });

  return questions;
}

/**
 * Get IDs of all questions a user has already answered.
 */
export async function getUserAnsweredIds(uid: string): Promise<Set<string>> {
  const snapshot = await getDocs(
    collection(getAppDb(), "users", uid, "answers")
  );
  const ids = new Set<string>();
  snapshot.forEach((docSnap) => {
    ids.add(docSnap.data().questionId);
  });
  return ids;
}

/**
 * Get the next batch of questions for a user.
 * Priority: unanswered (high rating first), then answered (high rating first).
 */
export async function getNextBatch(
  uid: string,
  batchSize: number = 20
): Promise<Question[]> {
  const [allQuestions, answeredIds] = await Promise.all([
    fetchAllQuestions(),
    getUserAnsweredIds(uid),
  ]);

  const unanswered = allQuestions.filter((q) => !answeredIds.has(q.id));
  const answered = allQuestions.filter((q) => answeredIds.has(q.id));

  unanswered.sort((a, b) => b.avgRating - a.avgRating);
  answered.sort((a, b) => b.avgRating - a.avgRating);

  const combined = [...unanswered, ...answered];
  return combined.slice(0, batchSize);
}

/**
 * Save a batch of answers after review.
 * Updates: user's answers subcollection, question stats, user stats.
 */
export async function saveBatchAnswers(
  uid: string,
  answers: UserAnswerLocal[]
): Promise<void> {
  const db = getAppDb();
  const batch = writeBatch(db);

  let correctCount = 0;

  for (const answer of answers) {
    const answerRef = doc(collection(db, "users", uid, "answers"));
    batch.set(answerRef, {
      questionId: answer.questionId,
      userAnswer: answer.userAnswer,
      isCorrect: answer.isCorrect,
      startTime: Timestamp.fromDate(answer.startTime),
      submitTime: Timestamp.fromDate(answer.submitTime),
      rating: answer.rating || null,
    });

    const qRef = doc(db, "questions", answer.questionId);
    batch.update(qRef, { timesAnswered: increment(1) });

    if (answer.isCorrect) correctCount++;
  }

  const userRef = doc(db, "users", uid);
  batch.update(userRef, {
    totalAnswered: increment(answers.length),
    totalCorrect: increment(correctCount),
  });

  await batch.commit();
}

/**
 * Rate a question immediately (fire-and-forget from the UI).
 * Appends the rating and recalculates the average.
 */
export async function rateQuestion(
  questionId: string,
  rating: number
): Promise<void> {
  const db = getAppDb();
  const qRef = doc(db, "questions", questionId);
  await updateDoc(qRef, { ratings: arrayUnion(rating) });
  await recalcAvgRating(questionId);
}

/**
 * Recalculate avgRating for a question from its ratings array.
 */
async function recalcAvgRating(questionId: string): Promise<void> {
  const db = getAppDb();
  const qRef = doc(db, "questions", questionId);
  const qSnap = await getDoc(qRef);
  if (!qSnap.exists()) return;

  const data = qSnap.data();
  const ratings: number[] = data.ratings || [];
  if (ratings.length === 0) return;

  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  await updateDoc(qRef, { avgRating: Math.round(avg * 10) / 10 });
}

/**
 * Add a new question to the database.
 */
export async function addQuestion(
  question: string,
  options: string[],
  correctAnswerIndex: number,
  createdBy: string
): Promise<string> {
  const docRef = await addDoc(collection(getAppDb(), "questions"), {
    question,
    options,
    correctAnswerIndex,
    createdAt: serverTimestamp(),
    createdBy,
    timesAnswered: 0,
    ratings: [],
    avgRating: 5,
  });
  return docRef.id;
}

/**
 * Add multiple questions in a single batch write.
 */
export async function addQuestionsBatch(
  questions: { question: string; options: string[]; correctAnswerIndex: number }[],
  createdBy: string
): Promise<number> {
  const db = getAppDb();
  const batch = writeBatch(db);

  for (const q of questions) {
    const ref = doc(collection(db, "questions"));
    batch.set(ref, {
      question: q.question,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      createdAt: serverTimestamp(),
      createdBy,
      timesAnswered: 0,
      ratings: [],
      avgRating: 5,
    });
  }

  await batch.commit();
  return questions.length;
}

/**
 * Get the total number of questions in the platform (server-side count, no document downloads).
 */
export async function getQuestionCount(): Promise<number> {
  const snapshot = await getCountFromServer(collection(getAppDb(), "questions"));
  return snapshot.data().count;
}

/**
 * Fetch leaderboard data (all users sorted by totalAnswered).
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const snapshot = await getDocs(collection(getAppDb(), "users"));
  const entries: LeaderboardEntry[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.totalAnswered > 0) {
      entries.push({
        uid: docSnap.id,
        displayName: data.displayName || "???",
        totalAnswered: data.totalAnswered || 0,
      });
    }
  });

  entries.sort((a, b) => b.totalAnswered - a.totalAnswered);
  return entries;
}
