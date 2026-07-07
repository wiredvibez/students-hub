# UNI — Future Plans

Backlog of planned features and algorithms. Nothing in this file is implemented yet unless noted elsewhere in the codebase.

---

## 1. Weighted priority question sampling

**Status:** Planned  
**Replaces:** Current two-stack shuffle in `getNextBatch()` (`lib/questions.ts`) — unanswered Fisher–Yates, then answered Fisher–Yates, concat, slice.

### Goal

Build smarter batches for each play session by scoring every question, then sampling **without replacement** using weights. Mix new material, mistakes, and spaced review in one batch instead of a hard unanswered-then-answered split.

### Current baseline (for reference)

- Fetch all non-hidden questions.
- Split into unanswered vs answered (binary, from `users/{uid}/answers`).
- Shuffle each group with Fisher–Yates.
- Return first `QUESTION_BATCH_SIZE` (10).

### Proposed algorithm

1. Load all valid questions (`fetchAllQuestions()`).
2. Build per-question stats from `users/{uid}/answers`:
   - `attemptCount`
   - `lastIsCorrect`
   - `lastAnsweredAt`
   - `lastAnswerDurationMs` (`submitTime - startTime` on latest attempt)
   - `lastRating` (if the user rated after answering)
3. Optionally load note counts per question (`questions/{id}/notes` subcollection size, or a cached `noteCount` field on the question doc).
4. Compute a **weight** for each question (see table below).
5. Apply session multiplier for questions shown in the immediately previous batch (client passes recent IDs, or server tracks in session).
6. **Weighted random sample without replacement** until batch is full.
7. Add **10–20% epsilon-greedy** random picks from the remaining pool so sessions stay unpredictable.

### Weight parameters

| Signal | Weight | Notes |
|--------|--------|-------|
| Never answered | **+100** | Highest priority — unseen content first. |
| Last attempt wrong | **+80** | Mistakes should come back quickly. |
| Last attempt correct, ≥ 7 days ago | **+40** | Spaced review — due for refresh. |
| Last attempt correct, 1–7 days ago | **+15** | Light review cadence. |
| Last attempt correct, < 24h ago | **+2** | Recently mastered — low priority. |
| Answered in previous batch (same session) | **×0.1 multiplier** | Avoid back-to-back repeats within one sitting. |
| Low user rating on the question (1–2 stars) | **+10** | Optional. User flagged question as weak/confusing. |
| Slow answer time (`submitTime - startTime`) | **+5 to +20** | Optional. Scale by duration thresholds, e.g. &lt;15s → +0, 15–45s → +5, 45–90s → +12, &gt;90s → +20. |
| High note / comment count on question | **+5 to +25** | Optional. Questions with more community explanations are often harder or more debated — worth surfacing. Suggested tiers: 0 notes → +0, 1–2 → +5, 3–5 → +12, 6+ → +25. Cap to avoid always picking the same “hot” threads. |

### Implementation notes

- **Phase 1:** Replace `getUserAnsweredIds()` with `getUserQuestionStats()` returning a map keyed by `questionId`. No Firestore schema change required.
- **Phase 2:** Differentiate **batch mode** vs **practice mode** — practice biases harder toward wrong + due-for-review; batch keeps a stronger mix of unseen.
- **Phase 3 (performance):** If scanning all answers becomes slow, cache state in `users/{uid}/questionState/{questionId}` updated inside `saveAnswer()` (`lastResult`, `lastAnsweredAt`, `nextReviewAt`).
- **Note count source:** Prefer a denormalized `noteCount` on the question document (increment/decrement in note create/delete API) to avoid counting subcollection docs on every batch load.

### Open questions

- Exact epsilon-greedy ratio (10% vs 20%).
- Whether slow-answer weight uses only the latest attempt or an average of last 3.
- Whether high note count means “prioritize” (more discussion = harder) or “deprioritize” (already well explained). Current plan: **prioritize** — discussion signals friction worth revisiting.

---

## 2. Threaded replies on notes (Reddit-style)

**Status:** Planned  
**Builds on:** Existing notes system (`questions/{questionId}/notes/{uid}`) — one top-level note per user per question, Reddit-style up/down votes via `/api/notes`.

### Goal

Allow users to reply to existing notes, forming nested threads (like Reddit comments). Keeps top-level “one explanation per user per question” while enabling discussion underneath.

### Proposed behavior

- Top-level notes unchanged: one doc per user per question (`notes/{authorUid}`).
- Replies live in a subcollection, e.g. `questions/{questionId}/notes/{noteAuthorUid}/replies/{replyId}`.
- Replies can be nested to a **max depth** (e.g. 4–6 levels) to limit UI and query complexity.
- Each reply: `text`, `createdBy`, `displayName`, `createdAt`, `updatedAt`, `parentReplyId` (null for direct reply to note), `score`, `upvotes`, `downvotes`.
- Sort: top-level notes by score then recency (current behavior); within a thread, chronological or score-based (TBD).
- Vote on replies via server API (same tamper-resistant pattern as note votes).
- Collapse/expand threads in UI; show reply count on parent note.

### Data model sketch

```
questions/{questionId}/notes/{noteAuthorUid}          # existing top-level note
questions/{questionId}/notes/{noteAuthorUid}/replies/{replyId}
questions/{questionId}/notes/{noteAuthorUid}/replies/{replyId}/votes/{voterId}
```

Optional: `replyCount` denormalized on the parent note for list display without loading all replies.

### UI / UX

- “Reply” button on each note and on each reply.
- Indented thread with visual connector (RTL-aware for Hebrew).
- “Continue thread” / collapse long branches.
- Author can edit/delete own reply; note author does not own replies (moderation TBD).

### Security & rules

- Extend Firestore rules and `/api/notes` (or new `/api/replies`) for create/update/delete/vote on replies.
- Validate `text` length (reuse `MAX_NOTE_LENGTH` or a shorter limit for replies).
- Rate limiting on reply creation to reduce spam.
- Admin delete for abusive threads.

### Open questions

- Max nesting depth (4 vs 6).
- Notifications when someone replies to your note/reply (future).
- Whether replies affect the weighted sampling “note count” signal (count top-level notes only vs total replies + notes).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-07 | Initial plans: weighted priority sampling + threaded note replies. |
