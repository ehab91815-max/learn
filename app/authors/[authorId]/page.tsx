/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase.client";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import EntityCard from "@/components/ui/EntityCard";
import BreadcrumbNav from "@/components/ui/BreadcrumbNav";
import { getAuthor, listBranches, Author, Branch } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProgressKind = "time" | "page";

type AttemptLite = {
  id: string;
  authorId: string;
  branchId: string;
  bookId: string;
  status: "active" | "completed";
  lastActivityAt?: any;
  lastLessonId?: string;
  lastPositionSec?: number;
  lastPageNumber?: number;
  lastProgressKind?: ProgressKind;
};

type ContinueTarget = {
  authorId: string;
  branchId: string;
  bookId: string;
  lessonId: string;
  lastPositionSec?: number;
  lastPageNumber?: number;
  lastProgressKind?: ProgressKind;
};

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

function getContinueProgressText(target: ContinueTarget | null) {
  if (!target) return "لا يوجد تقدم محفوظ لهذا المؤلف بعد.";

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

export default function AuthorPage({
  params,
}: {
  params: Promise<{ authorId: string }>;
}) {
  const { authorId } = React.use(params);
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [continueTarget, setContinueTarget] = useState<ContinueTarget | null>(
    null,
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    getAuthor(authorId).then(setAuthor);
    listBranches(authorId).then(setBranches);
  }, [authorId]);

  useEffect(() => {
    if (!uid) return;

    (async () => {
      const attemptsCol = collection(db, "users", uid, "attempts");
      const qA = query(
        attemptsCol,
        where("authorId", "==", authorId),
        where("status", "==", "active"),
        orderBy("lastActivityAt", "desc"),
        limit(1),
      );

      const aSnap = await getDocs(qA);
      if (aSnap.empty) {
        setContinueTarget(null);
        return;
      }

      const aDoc = aSnap.docs[0];
      const a = { id: aDoc.id, ...(aDoc.data() as any) } as AttemptLite;

      if (a.lastLessonId) {
        setContinueTarget({
          authorId,
          branchId: a.branchId,
          bookId: a.bookId,
          lessonId: a.lastLessonId,
          lastPositionSec: a.lastPositionSec,
          lastPageNumber: a.lastPageNumber,
          lastProgressKind: a.lastProgressKind,
        });
        return;
      }

      const pSnap = await getDocs(
        collection(db, "users", uid, "attempts", a.id, "progress"),
      );

      const firstIncomplete = pSnap.docs.find(
        (d) => !(d.data() as any)?.completed,
      );

      if (!firstIncomplete) {
        setContinueTarget(null);
        return;
      }

      const progress = firstIncomplete.data() as any;

      setContinueTarget({
        authorId,
        branchId: a.branchId,
        bookId: a.bookId,
        lessonId: firstIncomplete.id,
        lastPositionSec: progress.lastPositionSec,
        lastPageNumber: progress.lastPageNumber,
        lastProgressKind: progress.lastProgressKind,
      });
    })();
  }, [uid, authorId]);

  function handleContinue() {
    if (!continueTarget) return;

    router.push(
      `/authors/${continueTarget.authorId}/branches/${continueTarget.branchId}/books/${continueTarget.bookId}/lessons/${continueTarget.lessonId}`,
    );
  }

  const crumbs = useMemo(
    () => [
      { label: "المشايخ", href: "/authors" },
      { label: author?.name ?? "..." },
    ],
    [author?.name],
  );

  const continueProgressText = useMemo(
    () => getContinueProgressText(continueTarget),
    [continueTarget],
  );

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <BreadcrumbNav items={crumbs} />
        <Button onClick={handleContinue} disabled={!continueTarget}>
          تابع
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            {author?.name ?? "..."}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-1 text-sm text-muted-foreground">
          {continueTarget ? (
            <>
              <div>سيتم فتح آخر درس وصلت له عند الشيخ.</div>
              <div className="font-medium text-foreground">
                {continueProgressText}
              </div>
            </>
          ) : (
            <div>{continueProgressText}</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {branches.map((b) => (
          <EntityCard
            key={b.id}
            href={`/authors/${authorId}/branches/${b.id}`}
            title={b.title}
          />
        ))}
      </div>
    </main>
  );
}