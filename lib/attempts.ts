/* eslint-disable @typescript-eslint/no-explicit-any */
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where, doc } from "firebase/firestore";
import { db } from "./firebase.client";

export type Attempt = {
  id: string;
  authorId: string;
  branchId: string;
  bookId: string;
  bookPath: string;
  attemptNo: number;
  status: "active" | "completed";
};

export async function getOrCreateActiveAttempt(uid: string, authorId: string, branchId: string, bookId: string) {
  const bookPath = `authors/${authorId}/branches/${branchId}/books/${bookId}`;

  const attemptsCol = collection(db, "users", uid, "attempts");
  const q = query(
    attemptsCol,
    where("bookPath", "==", bookPath),
    where("status", "==", "active"),
    orderBy("startedAt", "desc"),
    limit(1)
  );

  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as any) } as Attempt;
  }

  // find max attemptNo for this bookPath
  const qAll = query(attemptsCol, where("bookPath", "==", bookPath), orderBy("attemptNo", "desc"), limit(1));
  const all = await getDocs(qAll);
  const nextNo = all.empty ? 1 : ((all.docs[0].data() as any).attemptNo ?? 0) + 1;

  const ref = await addDoc(attemptsCol, {
    authorId, branchId, bookId,
    bookPath,
    attemptNo: nextNo,
    status: "active",
    startedAt: serverTimestamp(),
  });

  return { id: ref.id, authorId, branchId, bookId, bookPath, attemptNo: nextNo, status: "active" };
}

export async function startNewAttempt(uid: string, authorId: string, branchId: string, bookId: string) {
  const bookPath = `authors/${authorId}/branches/${branchId}/books/${bookId}`;
  const attemptsCol = collection(db, "users", uid, "attempts");

  // mark existing active as completed (cleaner)
  const qActive = query(attemptsCol, where("bookPath", "==", bookPath), where("status", "==", "active"));
  const active = await getDocs(qActive);
  for (const d of active.docs) {
    await updateDoc(doc(db, "users", uid, "attempts", d.id), { status: "completed", completedAt: serverTimestamp() });
  }

  const qAll = query(attemptsCol, where("bookPath", "==", bookPath), orderBy("attemptNo", "desc"), limit(1));
  const all = await getDocs(qAll);
  const nextNo = all.empty ? 1 : ((all.docs[0].data() as any).attemptNo ?? 0) + 1;

  const ref = await addDoc(attemptsCol, {
    authorId, branchId, bookId,
    bookPath,
    attemptNo: nextNo,
    status: "active",
    startedAt: serverTimestamp(),
  });

  return { attemptId: ref.id, attemptNo: nextNo };
}