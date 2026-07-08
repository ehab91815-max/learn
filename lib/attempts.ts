/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase.client";

export type Attempt = {
  id: string;
  authorId: string;
  branchId: string;
  bookId: string;
  bookPath: string;
  attemptNo: number;
  status: "active" | "completed";

  startedAt?: any;
  completedAt?: any;
  lastActivityAt?: any;

  lastLessonId?: string;
  lastCompletedLessonId?: string;

  lastPositionSec?: number;
  lastPageNumber?: number;
  lastProgressKind?: "time" | "page";
};

function toMillis(value: any) {
  if (!value) return 0;

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  if (typeof value === "number") {
    return value;
  }

  return 0;
}

function pickLatestAttempt(attempts: Attempt[]) {
  if (attempts.length === 0) return null;

  return [...attempts].sort((a, b) => {
    const bTime =
      toMillis(b.lastActivityAt) ||
      toMillis(b.startedAt) ||
      Number(b.attemptNo ?? 0);

    const aTime =
      toMillis(a.lastActivityAt) ||
      toMillis(a.startedAt) ||
      Number(a.attemptNo ?? 0);

    return bTime - aTime;
  })[0];
}

export async function getOrCreateActiveAttempt(
  uid: string,
  authorId: string,
  branchId: string,
  bookId: string,
): Promise<Attempt> {
  const bookPath = `authors/${authorId}/branches/${branchId}/books/${bookId}`;
  const attemptsCol = collection(db, "users", uid, "attempts");

  const qActive = query(
    attemptsCol,
    where("bookPath", "==", bookPath),
    where("status", "==", "active"),
  );

  const activeSnap = await getDocs(qActive);

  if (!activeSnap.empty) {
    const activeAttempts = activeSnap.docs.map(
      (d) =>
        ({
          id: d.id,
          ...(d.data() as any),
        }) as Attempt,
    );

    const latest = pickLatestAttempt(activeAttempts);

    if (latest) {
      return latest;
    }
  }

  const qAll = query(
    attemptsCol,
    where("bookPath", "==", bookPath),
    orderBy("attemptNo", "desc"),
    limit(1),
  );

  const all = await getDocs(qAll);

  const nextNo = all.empty
    ? 1
    : Number((all.docs[0].data() as any).attemptNo ?? 0) + 1;

  const newAttempt: Omit<Attempt, "id"> = {
    authorId,
    branchId,
    bookId,
    bookPath,
    attemptNo: nextNo,
    status: "active",
  };

  const ref = await addDoc(attemptsCol, {
    ...newAttempt,
    startedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });

  return {
    id: ref.id,
    ...newAttempt,
  };
}

export async function startNewAttempt(
  uid: string,
  authorId: string,
  branchId: string,
  bookId: string,
): Promise<{ attemptId: string; attemptNo: number }> {
  const bookPath = `authors/${authorId}/branches/${branchId}/books/${bookId}`;
  const attemptsCol = collection(db, "users", uid, "attempts");

  const qActive = query(
    attemptsCol,
    where("bookPath", "==", bookPath),
    where("status", "==", "active"),
  );

  const active = await getDocs(qActive);

  for (const d of active.docs) {
    await updateDoc(doc(db, "users", uid, "attempts", d.id), {
      status: "completed",
      completedAt: serverTimestamp(),
    });
  }

  const qAll = query(
    attemptsCol,
    where("bookPath", "==", bookPath),
    orderBy("attemptNo", "desc"),
    limit(1),
  );

  const all = await getDocs(qAll);

  const nextNo = all.empty
    ? 1
    : Number((all.docs[0].data() as any).attemptNo ?? 0) + 1;

  const ref = await addDoc(attemptsCol, {
    authorId,
    branchId,
    bookId,
    bookPath,
    attemptNo: nextNo,
    status: "active",
    startedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });

  return {
    attemptId: ref.id,
    attemptNo: nextNo,
  };
}