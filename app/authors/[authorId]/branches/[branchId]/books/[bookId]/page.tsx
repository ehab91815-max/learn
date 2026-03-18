/* eslint-disable @typescript-eslint/no-explicit-any */
// app/authors/[authorId]/branches/[branchId]/books/[bookId]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  collection,
  getCountFromServer,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase.client";
import {
  getAuthor,
  getBranch,
  getBook,
  listLessons,
  Author,
  Branch,
  Book,
  Lesson,
} from "@/lib/catalog";
import { getOrCreateActiveAttempt, startNewAttempt } from "@/lib/attempts";

import BreadcrumbNav from "@/components/ui/BreadcrumbNav";
import LessonRow from "@/components/ui/LessonRow";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type ProgMap = Record<string, { completed: boolean; lastPositionSec: number }>;

export default function BookPage({
  params,
}: {
  params: Promise<{ authorId: string; branchId: string; bookId: string }>;
}) {
  const { authorId, branchId, bookId } = React.use(params);
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);

  const [author, setAuthor] = useState<Author | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [book, setBook] = useState<Book | null>(null);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [prog, setProg] = useState<ProgMap>({});

  const [attemptId, setAttemptId] = useState<string | null>(null);

  const [completedAttemptsCount, setCompletedAttemptsCount] =
    useState<number>(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    getAuthor(authorId).then(setAuthor);
    getBranch(authorId, branchId).then(setBranch);
    getBook(authorId, branchId, bookId).then(setBook);
    listLessons(authorId, branchId, bookId).then(setLessons);
  }, [authorId, branchId, bookId]);

  // 1) احصل/أنشئ Attempt نشط
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const a = await getOrCreateActiveAttempt(uid, authorId, branchId, bookId);
      setAttemptId(a.id);
    })();
  }, [uid, authorId, branchId, bookId]);

  // 2) Listener فوري على progress داخل الـ attempt
  useEffect(() => {
    if (!uid || !attemptId) return;

    const progressCol = collection(
      db,
      "users",
      uid,
      "attempts",
      attemptId,
      "progress",
    );
    const q = query(progressCol);

    const unsub = onSnapshot(q, (snap) => {
      const m: ProgMap = {};
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        m[d.id] = {
          completed: !!data.completed,
          lastPositionSec: Number(data.lastPositionSec ?? 0),
        };
      });
      setProg(m);
    });

    return () => unsub();
  }, [uid, attemptId]);

  // 3) عداد الختمات المكتملة لهذا الكتاب
  useEffect(() => {
    if (!uid) return;

    (async () => {
      const attemptsCol = collection(db, "users", uid, "attempts");
      const qCompleted = query(
        attemptsCol,
        where("authorId", "==", authorId),
        where("branchId", "==", branchId),
        where("bookId", "==", bookId),
        where("status", "==", "completed"),
      );

      try {
        const agg = await getCountFromServer(qCompleted);
        setCompletedAttemptsCount(agg.data().count);
      } catch {
        const unsub = onSnapshot(qCompleted, (snap) => {
          setCompletedAttemptsCount(snap.size);
        });
        return () => unsub();
      }
    })();
  }, [uid, authorId, branchId, bookId]);

  const continueLesson = useMemo(() => {
    for (const l of lessons) {
      const p = prog[l.id];
      if (!p?.completed) return l;
    }
    return lessons[0] ?? null;
  }, [lessons, prog]);

  const completedLessonsCount = useMemo(() => {
    if (lessons.length === 0) return 0;
    return lessons.reduce(
      (acc, l) => (prog[l.id]?.completed ? acc + 1 : acc),
      0,
    );
  }, [lessons, prog]);

  const progressPercent = useMemo(() => {
    if (lessons.length === 0) return 0;
    return Math.round((completedLessonsCount / lessons.length) * 100);
  }, [completedLessonsCount, lessons.length]);

  const isAttemptCompleted = useMemo(() => {
    if (lessons.length === 0) return false;
    return lessons.every((l) => prog[l.id]?.completed === true);
  }, [lessons, prog]);

  function handleContinue() {
    if (!continueLesson) return;
    router.push(
      `/authors/${authorId}/branches/${branchId}/books/${bookId}/lessons/${continueLesson.id}`,
    );
  }

  async function handleNewAttempt() {
    if (!uid) return;
    if (!isAttemptCompleted) return;
    await startNewAttempt(uid, authorId, branchId, bookId);
    router.push(`/authors/${authorId}/branches/${branchId}/books/${bookId}`);
  }

  const crumbs = useMemo(
    () => [
      { label: "المؤلفون", href: "/authors" },
      { label: author?.name ?? "...", href: `/authors/${authorId}` },
      {
        label: branch?.title ?? "...",
        href: `/authors/${authorId}/branches/${branchId}`,
      },
      { label: book?.title ?? "..." },
    ],
    [author?.name, branch?.title, book?.title, authorId, branchId],
  );

  return (
    <main className="space-y-4">
      <BreadcrumbNav items={crumbs} />

      <Card>
        <CardHeader>
          <CardTitle>{book?.title ?? "..."}</CardTitle>
          <CardDescription>
            الختمات المكتملة: {completedAttemptsCount}
            {" — "}
            {isAttemptCompleted
              ? "الختمة الحالية مكتملة ✅ يمكنك بدء ختمة جديدة."
              : "الختمة الحالية جارية. أكمل كل الدروس لتفعيل (ختمة جديدة)."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* شريط التقدم */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>تقدم الكتاب</span>
              <span>
                {completedLessonsCount} / {lessons.length} ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleContinue} disabled={!continueLesson}>
              تابع
            </Button>

            <Button
              variant="outline"
              onClick={handleNewAttempt}
              disabled={!isAttemptCompleted}
            >
              ختمة جديدة
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الدروس</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          {lessons.map((l) => {
            const p = prog[l.id] ?? { completed: false, lastPositionSec: 0 };
            return (
              <LessonRow
                key={l.id}
                href={`/authors/${authorId}/branches/${branchId}/books/${bookId}/lessons/${l.id}`}
                title={l.title}
                completed={p.completed}
                lastPositionSec={p.lastPositionSec}
              />
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}
