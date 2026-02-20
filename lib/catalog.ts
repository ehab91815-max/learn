/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/catalog.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase.client";

export type Author = {
  id: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  order: number;
  isPublished: boolean;
};

export type Branch = {
  id: string;
  title: string;
  description?: string;
  order: number;
  isPublished: boolean;
};

export type Book = {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  order: number;
  isPublished: boolean;
  hasBookQuiz?: boolean;
};

// lib/catalog.ts  (تعديل النوع فقط)
// غيّر Lesson.media ليشمل youtube

export type Lesson = {
  id: string;
  title: string;
  summary?: string;
  order: number;
  isPublished: boolean;
  media:
    | {
        type: "audio";
        r2Key: string;
        durationSec?: number;
      }
    | {
        type: "youtube";
        videoId: string;
        startAtSec?: number;
      };
};

function mapDocs<T>(snap: any): T[] {
  return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })) as T[];
}

// ---------- Authors ----------
export async function listAuthors(): Promise<Author[]> {
  const q = query(
    collection(db, "authors"),
    where("isPublished", "==", true),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return mapDocs<Author>(snap);
}

export async function getAuthor(authorId: string): Promise<Author | null> {
  const ref = doc(db, "authors", authorId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Author;
}

// ---------- Branches (inside Author) ----------
export async function listBranches(authorId: string): Promise<Branch[]> {
  const q = query(
    collection(db, "authors", authorId, "branches"),
    where("isPublished", "==", true),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return mapDocs<Branch>(snap);
}

export async function getBranch(
  authorId: string,
  branchId: string
): Promise<Branch | null> {
  const ref = doc(db, "authors", authorId, "branches", branchId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Branch;
}

// ---------- Books (inside Branch) ----------
export async function listBooks(
  authorId: string,
  branchId: string
): Promise<Book[]> {
  const q = query(
    collection(db, "authors", authorId, "branches", branchId, "books"),
    where("isPublished", "==", true),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return mapDocs<Book>(snap);
}

export async function getBook(
  authorId: string,
  branchId: string,
  bookId: string
): Promise<Book | null> {
  const ref = doc(db, "authors", authorId, "branches", branchId, "books", bookId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Book;
}

// ---------- Lessons (inside Book) ----------
export async function listLessons(
  authorId: string,
  branchId: string,
  bookId: string
): Promise<Lesson[]> {
  const q = query(
    collection(
      db,
      "authors",
      authorId,
      "branches",
      branchId,
      "books",
      bookId,
      "lessons"
    ),
    where("isPublished", "==", true),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return mapDocs<Lesson>(snap);
}

export async function getLesson(
  authorId: string,
  branchId: string,
  bookId: string,
  lessonId: string
): Promise<Lesson | null> {
  const ref = doc(
    db,
    "authors",
    authorId,
    "branches",
    branchId,
    "books",
    bookId,
    "lessons",
    lessonId
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Lesson;
}