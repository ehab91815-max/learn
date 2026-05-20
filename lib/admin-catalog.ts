/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/admin-catalog.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";

import { db } from "./firebase.client";
import type { Author, Branch, Book, Lesson } from "./catalog";

type CreateAuthorInput = Omit<Author, "id">;
type CreateBranchInput = Omit<Branch, "id">;
type CreateBookInput = Omit<Book, "id">;
type CreateLessonInput = Omit<Lesson, "id">;

function mapDocs<T>(snap: any): T[] {
  return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })) as T[];
}

function byOrder<T extends { order?: number }>(items: T[]) {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const copy: Record<string, any> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) copy[key] = value;
  });
  return copy as T;
}

async function deleteRefsInBatches(refs: DocumentReference[]) {
  const chunkSize = 450;

  for (let i = 0; i < refs.length; i += chunkSize) {
    const batch = writeBatch(db);
    refs.slice(i, i + chunkSize).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

// ---------- refs ----------
function authorRef(authorId: string) {
  return doc(db, "authors", authorId);
}

function branchesCol(authorId: string) {
  return collection(db, "authors", authorId, "branches");
}

function branchRef(authorId: string, branchId: string) {
  return doc(db, "authors", authorId, "branches", branchId);
}

function booksCol(authorId: string, branchId: string) {
  return collection(db, "authors", authorId, "branches", branchId, "books");
}

function bookRef(authorId: string, branchId: string, bookId: string) {
  return doc(db, "authors", authorId, "branches", branchId, "books", bookId);
}

function lessonsCol(authorId: string, branchId: string, bookId: string) {
  return collection(
    db,
    "authors",
    authorId,
    "branches",
    branchId,
    "books",
    bookId,
    "lessons",
  );
}

function lessonRef(
  authorId: string,
  branchId: string,
  bookId: string,
  lessonId: string,
) {
  return doc(
    db,
    "authors",
    authorId,
    "branches",
    branchId,
    "books",
    bookId,
    "lessons",
    lessonId,
  );
}

// ---------- Authors ----------
export async function listAdminAuthors(): Promise<Author[]> {
  const snap = await getDocs(collection(db, "authors"));
  return byOrder(mapDocs<Author>(snap));
}

export async function createAuthor(
  data: CreateAuthorInput,
  customAuthorId?: string,
) {
  const payload = {
    ...cleanUndefined(data as any),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const authorId = customAuthorId?.trim();

  if (!authorId) {
    return addDoc(collection(db, "authors"), payload);
  }

  const ref = authorRef(authorId);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    throw new Error(`Author ID موجود بالفعل: ${authorId}`);
  }

  await setDoc(ref, payload);

  return ref;
}

export async function updateAuthor(
  authorId: string,
  patch: Partial<CreateAuthorInput>,
) {
  await updateDoc(authorRef(authorId), {
    ...cleanUndefined(patch as any),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAuthorDeep(authorId: string) {
  const refs: DocumentReference[] = [];

  const branchesSnap = await getDocs(branchesCol(authorId));

  for (const branchDoc of branchesSnap.docs) {
    const branchId = branchDoc.id;
    const booksSnap = await getDocs(booksCol(authorId, branchId));

    for (const bookDoc of booksSnap.docs) {
      const bookId = bookDoc.id;
      const lessonsSnap = await getDocs(lessonsCol(authorId, branchId, bookId));

      lessonsSnap.docs.forEach((lessonDoc) => refs.push(lessonDoc.ref));
      refs.push(bookDoc.ref);
    }

    refs.push(branchDoc.ref);
  }

  refs.push(authorRef(authorId));
  await deleteRefsInBatches(refs);
}

// ---------- Branches ----------
export async function listAdminBranches(authorId: string): Promise<Branch[]> {
  const snap = await getDocs(branchesCol(authorId));
  return byOrder(mapDocs<Branch>(snap));
}

export async function createBranch(
  authorId: string,
  data: CreateBranchInput,
  customBranchId?: string,
) {
  const payload = {
    ...cleanUndefined(data as any),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const branchId = customBranchId?.trim();

  if (!branchId) {
    return addDoc(branchesCol(authorId), payload);
  }

  const ref = branchRef(authorId, branchId);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    throw new Error(`Branch ID موجود بالفعل: ${branchId}`);
  }

  await setDoc(ref, payload);

  return ref;
}

export async function updateBranch(
  authorId: string,
  branchId: string,
  patch: Partial<CreateBranchInput>,
) {
  await updateDoc(branchRef(authorId, branchId), {
    ...cleanUndefined(patch as any),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBranchDeep(authorId: string, branchId: string) {
  const refs: DocumentReference[] = [];

  const booksSnap = await getDocs(booksCol(authorId, branchId));

  for (const bookDoc of booksSnap.docs) {
    const bookId = bookDoc.id;
    const lessonsSnap = await getDocs(lessonsCol(authorId, branchId, bookId));

    lessonsSnap.docs.forEach((lessonDoc) => refs.push(lessonDoc.ref));
    refs.push(bookDoc.ref);
  }

  refs.push(branchRef(authorId, branchId));
  await deleteRefsInBatches(refs);
}

// ---------- Books ----------
export async function listAdminBooks(
  authorId: string,
  branchId: string,
): Promise<Book[]> {
  const snap = await getDocs(booksCol(authorId, branchId));
  return byOrder(mapDocs<Book>(snap));
}

export async function createBook(
  authorId: string,
  branchId: string,
  data: CreateBookInput,
  customBookId?: string,
) {
  const payload = {
    ...cleanUndefined(data as any),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const bookId = customBookId?.trim();

  if (!bookId) {
    return addDoc(booksCol(authorId, branchId), payload);
  }

  const ref = bookRef(authorId, branchId, bookId);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    throw new Error(`Book ID موجود بالفعل: ${bookId}`);
  }

  await setDoc(ref, payload);

  return ref;
}

export async function updateBook(
  authorId: string,
  branchId: string,
  bookId: string,
  patch: Partial<CreateBookInput>,
) {
  await updateDoc(bookRef(authorId, branchId, bookId), {
    ...cleanUndefined(patch as any),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBookDeep(
  authorId: string,
  branchId: string,
  bookId: string,
) {
  const refs: DocumentReference[] = [];

  const lessonsSnap = await getDocs(lessonsCol(authorId, branchId, bookId));
  lessonsSnap.docs.forEach((lessonDoc) => refs.push(lessonDoc.ref));

  refs.push(bookRef(authorId, branchId, bookId));
  await deleteRefsInBatches(refs);
}

// ---------- Lessons ----------
export async function listAdminLessons(
  authorId: string,
  branchId: string,
  bookId: string,
): Promise<Lesson[]> {
  const snap = await getDocs(lessonsCol(authorId, branchId, bookId));
  return byOrder(mapDocs<Lesson>(snap));
}

export async function createLesson(
  authorId: string,
  branchId: string,
  bookId: string,
  data: CreateLessonInput,
) {
  return addDoc(lessonsCol(authorId, branchId, bookId), {
    ...cleanUndefined(data as any),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateLesson(
  authorId: string,
  branchId: string,
  bookId: string,
  lessonId: string,
  patch: Partial<CreateLessonInput>,
) {
  await updateDoc(lessonRef(authorId, branchId, bookId, lessonId), {
    ...cleanUndefined(patch as any),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLesson(
  authorId: string,
  branchId: string,
  bookId: string,
  lessonId: string,
) {
  await deleteDoc(lessonRef(authorId, branchId, bookId, lessonId));
}

export async function updateLessonOrders(
  authorId: string,
  branchId: string,
  bookId: string,
  orders: { id: string; order: number }[],
) {
  const batch = writeBatch(db);

  orders.forEach((item) => {
    batch.update(lessonRef(authorId, branchId, bookId, item.id), {
      order: item.order,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}
