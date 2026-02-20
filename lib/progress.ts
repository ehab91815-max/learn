/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/progress.ts
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
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
  // 1) احفظ Progress
  const progressRef = doc(db, "users", uid, "attempts", attemptId, "progress", lessonId);
  await setDoc(progressRef, { ...patch, updatedAt: serverTimestamp() }, { merge: true });

  // 2) حدّث Attempt (ليعمل زر "تابع" في صفحة المؤلف)
  const attemptRef = doc(db, "users", uid, "attempts", attemptId);

  const lastPositionSec =
    typeof patch.lastPositionSec === "number" ? Math.max(0, Math.floor(patch.lastPositionSec)) : undefined;

  const updatePayload: Record<string, any> = {
    lastActivityAt: serverTimestamp(),
    lastLessonId: lessonId,
  };

  if (lastPositionSec !== undefined) updatePayload.lastPositionSec = lastPositionSec;
  if (patch.completed === true) updatePayload.lastCompletedLessonId = lessonId;

  await updateDoc(attemptRef, updatePayload);
}