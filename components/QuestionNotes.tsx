"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeQuestionNotes,
  addNote,
  getUserNoteForQuestion,
  getUserVotesForNotes,
  voteOnNote,
} from "@/lib/notes";
import { MAX_NOTE_LENGTH } from "@/lib/types";
import type { QuestionNote } from "@/lib/types";

interface QuestionNotesProps {
  questionId: string;
}

function VoteButtons({
  note,
  userVote,
  onVote,
  disabled,
}: {
  note: QuestionNote;
  userVote: 1 | -1 | null;
  onVote: (noteAuthorId: string, vote: 1 | -1) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0 w-8">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote(note.id, 1)}
        className={`text-sm leading-none p-1 transition-colors disabled:opacity-40
          ${userVote === 1 ? "text-brutal-red" : "text-brutal-grey hover:text-brutal-black"}`}
        aria-label="הצבעה בעד"
      >
        ▲
      </button>
      <span
        className={`font-black text-sm tabular-nums ${
          note.score > 0
            ? "text-brutal-red"
            : note.score < 0
            ? "text-blue-600"
            : "text-brutal-grey"
        }`}
      >
        {note.score}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote(note.id, -1)}
        className={`text-sm leading-none p-1 transition-colors disabled:opacity-40
          ${userVote === -1 ? "text-blue-600" : "text-brutal-grey hover:text-brutal-black"}`}
        aria-label="הצבעה נגד"
      >
        ▼
      </button>
    </div>
  );
}

function NoteItem({
  note,
  userVote,
  isOwn,
  onVote,
  voting,
}: {
  note: QuestionNote;
  userVote: 1 | -1 | null;
  isOwn: boolean;
  onVote: (noteAuthorId: string, vote: 1 | -1) => void;
  voting: boolean;
}) {
  return (
    <div className="flex gap-3 p-3 bg-white border-2 border-brutal-black/15">
      <VoteButtons
        note={note}
        userVote={userVote}
        onVote={onVote}
        disabled={isOwn || voting}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-xs">{note.displayName}</span>
          {isOwn && (
            <span className="text-[10px] bg-brutal-black/10 px-1.5 py-0.5 font-bold">
              שלך
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {note.text}
        </p>
      </div>
    </div>
  );
}

export default function QuestionNotes({ questionId }: QuestionNotesProps) {
  const { user, profile } = useAuth();
  const [notes, setNotes] = useState<QuestionNote[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});
  const [hasOwnNote, setHasOwnNote] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    getUserNoteForQuestion(questionId, user.uid).then((note) => {
      setHasOwnNote(!!note);
    });
  }, [questionId, user]);

  useEffect(() => {
    const unsub = subscribeQuestionNotes(questionId, (fetched) => {
      setNotes(fetched);
      if (user) {
        const authorIds = fetched.map((n) => n.id);
        getUserVotesForNotes(questionId, authorIds, user.uid).then(
          setUserVotes
        );
        setHasOwnNote(fetched.some((n) => n.id === user.uid));
      }
    });
    return unsub;
  }, [questionId, user]);

  const handleSubmit = async () => {
    if (!user || !profile || submitting) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError("");
    try {
      await addNote(questionId, user.uid, profile.displayName, trimmed);
      setText("");
      setHasOwnNote(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (noteAuthorId: string, vote: 1 | -1) => {
    if (!user || voting || noteAuthorId === user.uid) return;

    setVoting(true);
    const prevVote = userVotes[noteAuthorId] ?? null;
    const optimistic =
      prevVote === vote ? null : vote;

    setUserVotes((prev) => {
      const next = { ...prev };
      if (optimistic === null) delete next[noteAuthorId];
      else next[noteAuthorId] = optimistic;
      return next;
    });

    try {
      await voteOnNote(questionId, noteAuthorId, user.uid, vote);
      const authorIds = notes.map((n) => n.id);
      const fresh = await getUserVotesForNotes(
        questionId,
        authorIds,
        user.uid
      );
      setUserVotes(fresh);
    } catch {
      setUserVotes((prev) => {
        const next = { ...prev };
        if (prevVote) next[noteAuthorId] = prevVote;
        else delete next[noteAuthorId];
        return next;
      });
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="p-4 border-t-2 border-brutal-black/10 bg-brutal-paper/30 space-y-4">
      <h4 className="font-display text-sm">תעזרי לסחבק הבא להבין</h4>

      {!hasOwnNote ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_NOTE_LENGTH))}
            placeholder="למה התשובה נכונה? מה עוזר לזכור את זה?"
            rows={3}
            className="w-full p-3 brutal-border bg-white text-sm
                       focus:border-brutal-red focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-brutal-grey tabular-nums">
              {text.length}/{MAX_NOTE_LENGTH}
            </span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !text.trim()}
              className="brutal-btn text-xs px-4 py-2 disabled:opacity-40"
            >
              {submitting ? "שומר..." : "פרסמי הסבר"}
            </button>
          </div>
          {error && (
            <p className="text-xs text-brutal-red font-bold">{error}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-brutal-grey">
          כבר הוספת הסבר לשאלה זו.{" "}
          <Link href="/notes" className="text-brutal-red font-bold underline">
            ערכי בדף ההסברים שלך
          </Link>
        </p>
      )}

      <div className="space-y-2">
        {notes.length === 0 ? (
          <p className="text-xs text-brutal-grey text-center py-3 border-2 border-dashed border-brutal-black/20">
            עדיין אין הסברים — תהי/י הראשון/ה לעזור לסחבק הבא!
          </p>
        ) : (
          notes.map((note, i) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <NoteItem
                note={note}
                userVote={userVotes[note.id] ?? null}
                isOwn={user?.uid === note.id}
                onVote={handleVote}
                voting={voting}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
