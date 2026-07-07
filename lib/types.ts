import { Timestamp } from "firebase/firestore";

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number; // 0-based index into options
  createdAt: Timestamp;
  createdBy: string;
  timesAnswered: number;
  ratings: number[];
  avgRating: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  createdAt: Timestamp;
  totalAnswered: number;
  totalCorrect: number;
  totalQuestionsAdded: number;
  admin?: boolean;
}

export interface UserAnswer {
  questionId: string;
  userAnswer: number; // 0-based index into options
  isCorrect: boolean;
  startTime: Timestamp;
  submitTime: Timestamp;
  rating?: number; // 1-5
}

export type TestMode = "batch" | "practice";

export interface TestSession {
  questions: Question[];
  answers: (UserAnswerLocal | null)[];
  currentIndex: number;
  mode: TestMode;
  state: "loading" | "testing" | "feedback" | "review";
}

export interface UserAnswerLocal {
  questionId: string;
  userAnswer: number;
  isCorrect: boolean;
  startTime: Date;
  submitTime: Date;
  rating?: number;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  totalAnswered: number;
}

export const MAX_NOTE_LENGTH = 500;

export interface QuestionNote {
  id: string; // same as createdBy uid
  questionId: string;
  text: string;
  createdBy: string;
  displayName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  score: number;
  upvotes: number;
  downvotes: number;
}

export type NoteVoteValue = 1 | -1;

export interface UserNoteWithQuestion {
  note: QuestionNote;
  questionText: string;
}
