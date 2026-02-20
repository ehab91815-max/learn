/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/setup/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase.client";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Media =
  | { type: "audio"; r2Key: string; durationSec?: number }
  | { type: "youtube"; videoId: string; startAtSec?: number };

type LessonSeed = {
  id: string;
  title: string;
  order: number;
  media: Media;
};

export default function AdminSetupPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  const seed = useMemo(() => {
    const authorId = "dr-essam";

    const books = [
      {
        branchId: "aqeedah",
        bookId: "aqeedah-101",
        title: "العقيدة للمبتدئين",
        lessons: [
          {
            id: "lesson-001",
            title: "مقدمة الدورة",
            order: 1,
            media: {
              type: "audio",
              r2Key: `authors/${authorId}/books/aqeedah-101/lesson-001.mp3`,
            },
          },
          {
            id: "lesson-002",
            title: "أركان الإيمان (يوتيوب مثال)",
            order: 2,
            media: { type: "youtube", videoId: "dQw4w9WgXcQ", startAtSec: 0 }, // عدّل الـ videoId
          },
          {
            id: "lesson-003",
            title: "مراجعة وخلاصة",
            order: 3,
            media: {
              type: "audio",
              r2Key: `authors/${authorId}/books/aqeedah-101/lesson-003.mp3`,
            },
          },
        ] as LessonSeed[],
      },
      {
        branchId: "fiqh",
        bookId: "fiqh-ibadat",
        title: "فقه العبادات المختصر",
        lessons: [
          {
            id: "lesson-001",
            title: "مدخل إلى فقه العبادات",
            order: 1,
            media: {
              type: "audio",
              r2Key: `authors/${authorId}/books/fiqh-ibadat/lesson-001.mp3`,
            },
          },
          {
            id: "lesson-002",
            title: "الطهارة باختصار",
            order: 2,
            media: {
              type: "audio",
              r2Key: `authors/${authorId}/books/fiqh-ibadat/lesson-002.mp3`,
            },
          },
          {
            id: "lesson-003",
            title: "الصلاة باختصار",
            order: 3,
            media: {
              type: "audio",
              r2Key: `authors/${authorId}/books/fiqh-ibadat/lesson-003.mp3`,
            },
          },
        ] as LessonSeed[],
      },
      {
        branchId: "arabic",
        bookId: "nahw-101",
        title: "مبادئ النحو",
        lessons: [
          {
            id: "lesson-001",
            title: "ما هو النحو ولماذا نتعلمه",
            order: 1,
            media: {
              type: "audio",
              r2Key: `authors/${authorId}/books/nahw-101/lesson-001.mp3`,
            },
          },
          {
            id: "lesson-002",
            title: "أقسام الكلمة",
            order: 2,
            media: {
              type: "audio",
              r2Key: `authors/${authorId}/books/nahw-101/lesson-002.mp3`,
            },
          },
          {
            id: "lesson-003",
            title: "المبتدأ والخبر",
            order: 3,
            media: {
              type: "audio",
              r2Key: `authors/${authorId}/books/nahw-101/lesson-003.mp3`,
            },
          },
        ] as LessonSeed[],
      },
    ];

    return { authorId, books };
  }, []);

  async function handleCreate() {
    if (!uid) {
      setMsg("يجب تسجيل الدخول أولاً.");
      return;
    }
    setBusy(true);
    setMsg("");

    try {
      const batch = writeBatch(db);

      const authorRef = doc(db, "authors", seed.authorId);
      batch.set(
        authorRef,
        {
          name: "د. عصام",
          order: 1,
          isPublished: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      const branches = [
        { id: "aqeedah", title: "عقيدة", order: 1 },
        { id: "fiqh", title: "فقه", order: 2 },
        { id: "arabic", title: "لغة عربية", order: 3 },
      ];

      for (const b of branches) {
        const ref = doc(db, "authors", seed.authorId, "branches", b.id);
        batch.set(
          ref,
          {
            title: b.title,
            order: b.order,
            isPublished: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      for (const bk of seed.books) {
        const bookRef = doc(
          db,
          "authors",
          seed.authorId,
          "branches",
          bk.branchId,
          "books",
          bk.bookId,
        );
        batch.set(
          bookRef,
          {
            title: bk.title,
            order: 1,
            isPublished: true,
            hasBookQuiz: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        const quizRef = doc(
          db,
          "authors",
          seed.authorId,
          "branches",
          bk.branchId,
          "books",
          bk.bookId,
          "bookQuiz",
          "main",
        );
        batch.set(
          quizRef,
          {
            title: `اختبار ${bk.title}`,
            isOptional: true,
            passPercent: 60,
            isPublished: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        for (const l of bk.lessons) {
          const lessonRef = doc(
            db,
            "authors",
            seed.authorId,
            "branches",
            bk.branchId,
            "books",
            bk.bookId,
            "lessons",
            l.id,
          );
          batch.set(
            lessonRef,
            {
              title: l.title,
              order: l.order,
              isPublished: true,
              media: l.media,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
      }

      await batch.commit();
      setMsg("تم إنشاء المحتوى ✅");
    } catch (e: any) {
      setMsg(`خطأ: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Admin Setup</CardTitle>
          <CardDescription>
            زر واحد لإنشاء محتوى د. عصام (مع مثال درس يوتيوب)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleCreate} disabled={busy}>
            {busy ? "جارٍ الإنشاء..." : "Create Dr. Essam Content"}
          </Button>
          {msg ? (
            <div className="text-sm text-muted-foreground">{msg}</div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>ملاحظة يوتيوب</CardTitle>
          <CardDescription>
            عدّل videoId في الكود لأي درس يوتيوب. مثالنا الحالي (للاختبار فقط).
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
