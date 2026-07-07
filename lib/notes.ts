import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { getAppAuth, getAppDb } from "./firebase";
import { MAX_NOTE_LENGTH } from "./types";
import type { QuestionNote, UserNoteWithQuestion } from "./types";

function parseNoteDoc(
  questionId: string,
  noteId: string,
  data: Record<string, unknown>
): QuestionNote {
  return {
    id: noteId,
    questionId: (data.questionId as string) || questionId,
    text: data.text as string,
    createdBy: data.createdBy as string,
    displayName: (data.displayName as string) || "???",
    createdAt: data.createdAt as QuestionNote["createdAt"],
    updatedAt: data.updatedAt as QuestionNote["updatedAt"],
    score: (data.score as number) || 0,
    upvotes: (data.upvotes as number) || 0,
    downvotes: (data.downvotes as number) || 0,
  };
}

function sortNotes(notes: QuestionNote[]): QuestionNote[] {
  return [...notes].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

/**
 * Subscribe to all notes for a question, sorted by score then recency.
 */
export function subscribeQuestionNotes(
  questionId: string,
  callback: (notes: QuestionNote[]) => void
): () => void {
  return onSnapshot(
    collection(getAppDb(), "questions", questionId, "notes"),
    (snapshot) => {
      const notes: QuestionNote[] = [];
      snapshot.forEach((docSnap) => {
        notes.push(parseNoteDoc(questionId, docSnap.id, docSnap.data()));
      });
      callback(sortNotes(notes));
    }
  );
}

/**
 * Get the current user's note for a specific question, if any.
 */
export async function getUserNoteForQuestion(
  questionId: string,
  uid: string
): Promise<QuestionNote | null> {
  const snap = await getDoc(
    doc(getAppDb(), "questions", questionId, "notes", uid)
  );
  if (!snap.exists()) return null;
  return parseNoteDoc(questionId, snap.id, snap.data());
}

/**
 * Add a new note (one per user per question — doc id is uid).
 */
export async function addNote(
  questionId: string,
  uid: string,
  displayName: string,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_NOTE_LENGTH) {
    throw new Error("אורך ההסבר לא תקין");
  }

  const noteRef = doc(getAppDb(), "questions", questionId, "notes", uid);
  const existing = await getDoc(noteRef);
  if (existing.exists()) {
    throw new Error("כבר הוספת הסבר לשאלה זו");
  }

  await setDoc(noteRef, {
    text: trimmed,
    createdBy: uid,
    displayName,
    questionId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    score: 0,
    upvotes: 0,
    downvotes: 0,
  });
}

/**
 * Update the current user's note text.
 */
export async function updateNote(
  questionId: string,
  uid: string,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_NOTE_LENGTH) {
    throw new Error("אורך ההסבר לא תקין");
  }

  await updateDoc(doc(getAppDb(), "questions", questionId, "notes", uid), {
    text: trimmed,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete the current user's note and all its votes (via server API).
 */
export async function deleteNote(
  questionId: string,
  uid: string
): Promise<void> {
  const token = await getAppAuth().currentUser?.getIdToken();
  if (!token) throw new Error("יש להתחבר מחדש");

  const res = await fetch("/api/notes", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ questionId }),
  });

  if (!res.ok) {
    throw new Error("שגיאה במחיקה");
  }
}

/**
 * Fetch all notes authored by a user, with question text (via server API).
 */
export async function fetchUserNotes(
  uid: string
): Promise<UserNoteWithQuestion[]> {
  const token = await getAppAuth().currentUser?.getIdToken();
  if (!token) throw new Error("יש להתחבר מחדש");

  const res = await fetch("/api/notes", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("שגיאה בטעינת ההסברים");
  }

  const { items } = (await res.json()) as {
    items: Array<{
      note: Omit<QuestionNote, "createdAt" | "updatedAt"> & {
        createdAt: number | null;
        updatedAt: number | null;
      };
      questionText: string;
    }>;
  };

  return items.map(({ note, questionText }) => ({
    note: {
      ...note,
      createdAt: note.createdAt
        ? Timestamp.fromMillis(note.createdAt)
        : ({} as QuestionNote["createdAt"]),
      updatedAt: note.updatedAt
        ? Timestamp.fromMillis(note.updatedAt)
        : ({} as QuestionNote["updatedAt"]),
    },
    questionText,
  }));
}

/**
 * Get the current user's vote on a note (1, -1, or null).
 */
export async function getUserVoteOnNote(
  questionId: string,
  noteAuthorId: string,
  voterId: string
): Promise<1 | -1 | null> {
  const snap = await getDoc(
    doc(
      getAppDb(),
      "questions",
      questionId,
      "notes",
      noteAuthorId,
      "votes",
      voterId
    )
  );
  if (!snap.exists()) return null;
  const value = snap.data().value;
  return value === 1 || value === -1 ? value : null;
}

/**
 * Fetch votes for multiple notes in parallel (for the current user).
 */
export async function getUserVotesForNotes(
  questionId: string,
  noteAuthorIds: string[],
  voterId: string
): Promise<Record<string, 1 | -1>> {
  const votes: Record<string, 1 | -1> = {};
  await Promise.all(
    noteAuthorIds.map(async (authorId) => {
      const vote = await getUserVoteOnNote(questionId, authorId, voterId);
      if (vote) votes[authorId] = vote;
    })
  );
  return votes;
}

/**
 * Reddit-style vote via server API (prevents counter tampering).
 */
export async function voteOnNote(
  questionId: string,
  noteAuthorId: string,
  voterId: string,
  vote: 1 | -1
): Promise<void> {
  if (voterId === noteAuthorId) return;

  const token = await getAppAuth().currentUser?.getIdToken();
  if (!token) throw new Error("יש להתחבר מחדש");

  const res = await fetch("/api/notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ questionId, noteAuthorId, vote }),
  });

  if (!res.ok) {
    throw new Error("שגיאה בהצבעה");
  }
}
