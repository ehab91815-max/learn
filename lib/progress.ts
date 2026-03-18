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

export type LessonProgress = {
  lastPositionSec: number;
  completed: boolean;
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
  const progressRef = doc(db, "users", uid, "attempts", attemptId, "progress", lessonId);
  const attemptRef = doc(db, "users", uid, "attempts", attemptId);
  const userRef = doc(db, "users", uid);

  const lastPositionSec =
    typeof patch.lastPositionSec === "number" ? Math.max(0, Math.floor(patch.lastPositionSec)) : undefined;

  await runTransaction(db, async (tx) => {
    const prevSnap = await tx.get(progressRef);
    const prev = prevSnap.exists() ? (prevSnap.data() as any) : null;

    const wasCompleted = !!prev?.completed;
    const nowCompleted = patch.completed === true;

    // 1) حفظ progress
    tx.set(
      progressRef,
      { ...patch, updatedAt: serverTimestamp() },
      { merge: true }
    );

    // 2) تحديث attempt (لزر تابع)
    const updatePayload: Record<string, any> = {
      lastActivityAt: serverTimestamp(),
      lastLessonId: lessonId,
    };
    if (lastPositionSec !== undefined) updatePayload.lastPositionSec = lastPositionSec;
    if (nowCompleted) updatePayload.lastCompletedLessonId = lessonId;

    tx.update(attemptRef, updatePayload);

    // 3) ✅ XP: +10 فقط أول مرة يتحول فيها الدرس إلى completed
    if (nowCompleted && !wasCompleted) {
      tx.set(
        userRef,
        { xpTotal: increment(10), updatedAt: serverTimestamp() },
        { merge: true }
      );
    }
  });
}