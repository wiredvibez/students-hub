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
}

export interface UserAnswer {
  questionId: string;
  userAnswer: number; // 0-based index into options
  isCorrect: boolean;
  startTime: Timestamp;
  submitTime: Timestamp;
  rating?: number; // 1-5
}

export interface TestSession {
  questions: Question[];
  answers: (UserAnswerLocal | null)[];
  currentIndex: number;
  state: "loading" | "testing" | "review";
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
