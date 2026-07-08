/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/progress.ts
import {
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase.client";

export type LessonProgressKind = "time" | "page";

export type LessonProgress = {
  lastPositionSec?: number;
  lastPageNumber?: number;
  lastProgressKind?: LessonProgressKind;
  completed?: boolean;
  updatedAt?: any;
};

export async function getLessonProgress(
  uid: string,
  attemptId: string,
  lessonId: string
): Promise<LessonProgress | null> {
  const ref = doc(db, "users", uid, "attempts", attemptId, "progress", lessonId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as LessonProgress;
}

export async function saveLessonProgress(
  uid: string,
  attemptId: string,
  lessonId: string,
  patch: Partial<LessonProgress>
): Promise<void> {
  const progressRef = doc(
    db,
    "users",
    uid,
    "attempts",
    attemptId,
    "progress",
    lessonId
  );

  const attemptRef = doc(db, "users", uid, "attempts", attemptId);
  const userRef = doc(db, "users", uid);

  const lastPositionSec =
    typeof patch.lastPositionSec === "number"
      ? Math.max(0, Math.floor(patch.lastPositionSec))
      : undefined;

  const lastPageNumber =
    typeof patch.lastPageNumber === "number"
      ? Math.max(1, Math.floor(patch.lastPageNumber))
      : undefined;

  const lastProgressKind: LessonProgressKind | undefined =
    patch.lastProgressKind ??
    (lastPageNumber !== undefined
      ? "page"
      : lastPositionSec !== undefined
        ? "time"
        : undefined);

  const cleanPatch: Partial<LessonProgress> = {
    ...patch,
  };

  if (lastPositionSec !== undefined) {
    cleanPatch.lastPositionSec = lastPositionSec;
  }

  if (lastPageNumber !== undefined) {
    cleanPatch.lastPageNumber = lastPageNumber;
  }

  if (lastProgressKind) {
    cleanPatch.lastProgressKind = lastProgressKind;
  }

  await runTransaction(db, async (tx) => {
    const prevSnap = await tx.get(progressRef);
    const prev = prevSnap.exists() ? (prevSnap.data() as any) : null;

    const wasCompleted = !!prev?.completed;
    const nowCompleted = patch.completed === true;

    tx.set(
      progressRef,
      {
        ...cleanPatch,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const updatePayload: Record<string, any> = {
      lastActivityAt: serverTimestamp(),
      lastLessonId: lessonId,
    };

    if (lastPositionSec !== undefined) {
      updatePayload.lastPositionSec = lastPositionSec;
      updatePayload.lastProgressKind = "time";
    }

    if (lastPageNumber !== undefined) {
      updatePayload.lastPageNumber = lastPageNumber;
      updatePayload.lastProgressKind = "page";
    }

    if (nowCompleted) {
      updatePayload.lastCompletedLessonId = lessonId;
    }

    tx.update(attemptRef, updatePayload);

    if (nowCompleted && !wasCompleted) {
      tx.set(
        userRef,
        {
          xpTotal: increment(10),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  });
}