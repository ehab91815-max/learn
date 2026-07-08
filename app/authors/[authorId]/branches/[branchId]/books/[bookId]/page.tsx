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
import {
  getOrCreateActiveAttempt,
  startNewAttempt,
  type Attempt,
} from "@/lib/attempts";

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

type ProgressKind = "time" | "page";

type LessonProgressLite = {
  completed: boolean;
  lastPositionSec?: number;
  lastPageNumber?: number;
  lastProgressKind?: ProgressKind;
  updatedAt?: any;
};

type ProgMap = Record<string, LessonProgressLite>;

type ContinueTarget = {
  lessonId: string;
  lastPositionSec?: number;
  lastPageNumber?: number;
  lastProgressKind?: ProgressKind;
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

  return [...attempts].sort((a: any, b: any) => {
    const bTime = toMillis(b.lastActivityAt) || toMillis(b.startedAt);
    const aTime = toMillis(a.lastActivityAt) || toMillis(a.startedAt);

    return bTime - aTime;
  })[0];
}

function formatSeconds(sec: number) {
  const safe = Math.max(0, Math.floor(sec));

  if (safe < 60) {
    return `${safe} ثانية`;
  }

  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  if (seconds === 0) {
    return `${minutes} دقيقة`;
  }

  return `${minutes} دقيقة و ${seconds} ثانية`;
}

function getProgressText(target: ContinueTarget | null) {
  if (!target) return "لا يوجد تقدم محفوظ في هذا الكتاب بعد.";

  if (target.lastProgressKind === "page") {
    const pageNumber =
      typeof target.lastPageNumber === "number"
        ? target.lastPageNumber
        : typeof target.lastPositionSec === "number"
          ? target.lastPositionSec
          : 1;

    return `آخر صفحة ${Math.max(1, Math.floor(pageNumber))}`;
  }

  return `آخر نقطة ${formatSeconds(target.lastPositionSec ?? 0)}`;
}

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

  const [attempt, setAttempt] = useState<Attempt | null>(null);

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
      setAttempt(a);
    })();
  }, [uid, authorId, branchId, bookId]);

  // 2) Listener على الـ active attempt نفسه
  // مهم لزر تابع، لأنه يعتمد على lastLessonId / lastPageNumber
  useEffect(() => {
    if (!uid) return;

    const attemptsCol = collection(db, "users", uid, "attempts");

    const qActive = query(
      attemptsCol,
      where("authorId", "==", authorId),
      where("branchId", "==", branchId),
      where("bookId", "==", bookId),
      where("status", "==", "active"),
    );

    const unsub = onSnapshot(qActive, (snap) => {
      const attempts = snap.docs.map(
        (d) =>
          ({
            id: d.id,
            ...(d.data() as any),
          }) as Attempt,
      );

      setAttempt(pickLatestAttempt(attempts));
    });

    return () => unsub();
  }, [uid, authorId, branchId, bookId]);

  // 3) Listener فوري على progress داخل الـ attempt
  useEffect(() => {
    if (!uid || !attempt?.id) return;

    const progressCol = collection(
      db,
      "users",
      uid,
      "attempts",
      attempt.id,
      "progress",
    );

    const unsub = onSnapshot(query(progressCol), (snap) => {
      const m: ProgMap = {};

      snap.docs.forEach((d) => {
        const data = d.data() as any;

        m[d.id] = {
          completed: !!data.completed,
          lastPositionSec:
            typeof data.lastPositionSec === "number"
              ? Number(data.lastPositionSec)
              : undefined,
          lastPageNumber:
            typeof data.lastPageNumber === "number"
              ? Number(data.lastPageNumber)
              : undefined,
          lastProgressKind: data.lastProgressKind,
          updatedAt: data.updatedAt,
        };
      });

      setProg(m);
    });

    return () => unsub();
  }, [uid, attempt?.id]);

  // 4) عداد الختمات المكتملة لهذا الكتاب
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
        setCompletedAttemptsCount(0);
      }
    })();
  }, [uid, authorId, branchId, bookId]);

  const firstIncompleteLesson = useMemo(() => {
    for (const l of lessons) {
      const p = prog[l.id];

      if (!p?.completed) {
        return l;
      }
    }

    return lessons[0] ?? null;
  }, [lessons, prog]);

  const latestProgressLessonId = useMemo(() => {
    const entries = Object.entries(prog);

    if (entries.length === 0) return null;

    const sorted = entries.sort(([, a], [, b]) => {
      return toMillis(b.updatedAt) - toMillis(a.updatedAt);
    });

    return sorted[0]?.[0] ?? null;
  }, [prog]);

  const continueTarget = useMemo<ContinueTarget | null>(() => {
    const lessonId =
      attempt?.lastLessonId ?? latestProgressLessonId ?? firstIncompleteLesson?.id;

    if (!lessonId) return null;

    const p = prog[lessonId];

    return {
      lessonId,
      lastPositionSec:
        attempt?.lastLessonId === lessonId
          ? attempt.lastPositionSec ?? p?.lastPositionSec
          : p?.lastPositionSec,
      lastPageNumber:
        attempt?.lastLessonId === lessonId
          ? attempt.lastPageNumber ?? p?.lastPageNumber
          : p?.lastPageNumber,
      lastProgressKind:
        attempt?.lastLessonId === lessonId
          ? attempt.lastProgressKind ?? p?.lastProgressKind
          : p?.lastProgressKind,
    };
  }, [attempt, latestProgressLessonId, firstIncompleteLesson, prog]);

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
    if (!continueTarget) return;

    router.push(
      `/authors/${authorId}/branches/${branchId}/books/${bookId}/lessons/${continueTarget.lessonId}`,
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

  const continueProgressText = useMemo(
    () => getProgressText(continueTarget),
    [continueTarget],
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
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>تقدم الكتاب</span>
              <span>
                {completedLessonsCount} / {lessons.length} ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            {continueTarget ? (
              <div className="space-y-1">
                <div className="text-muted-foreground">
                  سيتم فتح آخر درس وصلت له في هذا الكتاب.
                </div>
                <div className="font-medium">{continueProgressText}</div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                {continueProgressText}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleContinue} disabled={!continueTarget}>
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
            const p = prog[l.id] ?? { completed: false };

            return (
              <LessonRow
                key={l.id}
                href={`/authors/${authorId}/branches/${branchId}/books/${bookId}/lessons/${l.id}`}
                title={l.title}
                completed={p.completed}
                lastPositionSec={
                  p.lastProgressKind === "page"
                    ? 0
                    : (p.lastPositionSec ?? 0)
                }
              />
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}