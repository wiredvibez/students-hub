import { NextResponse } from "next/server";
import { verifyAuthHeader, getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: Request) {
  try {
    const uid = await verifyAuthHeader(req.headers.get("Authorization"));
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();
    const notesSnap = await db
      .collectionGroup("notes")
      .where("createdBy", "==", uid)
      .get();

    const results = await Promise.all(
      notesSnap.docs.map(async (noteDoc) => {
        const questionId = noteDoc.ref.parent.parent?.id;
        if (!questionId) return null;

        const questionSnap = await db.collection("questions").doc(questionId).get();
        if (!questionSnap.exists) return null;

        const data = noteDoc.data();
        return {
          note: {
            id: noteDoc.id,
            questionId,
            text: data.text,
            createdBy: data.createdBy,
            displayName: data.displayName || "???",
            createdAt: data.createdAt?.toMillis?.() ?? null,
            updatedAt: data.updatedAt?.toMillis?.() ?? null,
            score: data.score || 0,
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
          },
          questionText: questionSnap.data()!.question as string,
        };
      })
    );

    const items = results.filter(Boolean);
    items.sort((a, b) => (b!.note.updatedAt || 0) - (a!.note.updatedAt || 0));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Fetch notes error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const voterId = await verifyAuthHeader(req.headers.get("Authorization"));
    if (!voterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId, noteAuthorId, vote } = await req.json();

    if (
      !questionId ||
      !noteAuthorId ||
      typeof questionId !== "string" ||
      typeof noteAuthorId !== "string" ||
      (vote !== 1 && vote !== -1)
    ) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (voterId === noteAuthorId) {
      return NextResponse.json({ error: "Cannot vote on own note" }, { status: 400 });
    }

    const db = getAdminDb();
    const noteRef = db
      .collection("questions")
      .doc(questionId)
      .collection("notes")
      .doc(noteAuthorId);
    const voteRef = noteRef.collection("votes").doc(voterId);

    await db.runTransaction(async (tx) => {
      const noteSnap = await tx.get(noteRef);
      const voteSnap = await tx.get(voteRef);
      if (!noteSnap.exists) return;

      const data = noteSnap.data()!;
      let upvotes = data.upvotes || 0;
      let downvotes = data.downvotes || 0;
      let score = data.score || 0;
      const prevVote: number = voteSnap.exists ? voteSnap.data()!.value : 0;

      let newVote: 1 | -1 | 0 = vote;
      if (prevVote === vote) newVote = 0;

      if (prevVote === 1) {
        upvotes--;
        score--;
      } else if (prevVote === -1) {
        downvotes--;
        score++;
      }

      if (newVote === 1) {
        upvotes++;
        score++;
      } else if (newVote === -1) {
        downvotes++;
        score--;
      }

      tx.update(noteRef, { upvotes, downvotes, score });

      if (newVote === 0) {
        if (voteSnap.exists) tx.delete(voteRef);
      } else {
        tx.set(voteRef, { value: newVote });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Vote error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const uid = await verifyAuthHeader(req.headers.get("Authorization"));
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId } = await req.json();
    if (!questionId || typeof questionId !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const db = getAdminDb();
    const noteRef = db
      .collection("questions")
      .doc(questionId)
      .collection("notes")
      .doc(uid);
    const noteSnap = await noteRef.get();
    if (!noteSnap.exists) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const votesSnap = await noteRef.collection("votes").get();
    const batch = db.batch();
    votesSnap.docs.forEach((voteDoc) => batch.delete(voteDoc.ref));
    batch.delete(noteRef);
    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete note error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
