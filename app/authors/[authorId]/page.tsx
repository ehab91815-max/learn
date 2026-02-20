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

type AttemptLite = {
  id: string;
  authorId: string;
  branchId: string;
  bookId: string;
  status: "active" | "completed";
  lastActivityAt?: any;
  lastLessonId?: string;
};

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
  const [continueTarget, setContinueTarget] = useState<{
    authorId: string;
    branchId: string;
    bookId: string;
    lessonId: string;
  } | null>(null);

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

      setContinueTarget({
        authorId,
        branchId: a.branchId,
        bookId: a.bookId,
        lessonId: firstIncomplete.id,
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
      { label: "المؤلفون", href: "/authors" },
      { label: author?.name ?? "..." },
    ],
    [author?.name],
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
        <CardContent className="text-sm text-muted-foreground">
          {continueTarget
            ? "سيتم فتح آخر درس وصلت له داخل هذا المؤلف."
            : "لا يوجد تقدم محفوظ لهذا المؤلف بعد."}
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
