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
        title: "فضل الغني الحميد",
        lessons: [
          {
            id: "lesson-001",
            title: "مقدمة",
            order: 1,
            media: { type: "youtube", videoId: "yApIvEjaTlc", startAtSec: 0 },
          },
          {
            id: "lesson-002",
            title: "أثر توحيد الربوبية في نفس المؤمن",
            order: 2,
            media: { type: "youtube", videoId: "o4t8_kYbUTY", startAtSec: 0 },
          },
          {
            id: "lesson-003",
            title: "ولقد بعثنا في كل أمة رسولا",
            order: 3,
            media: { type: "youtube", videoId: "yhiy1QPD7RQ", startAtSec: 0 },
          },
          {
            id: "lesson-004",
            title: "وقضى ربك ألا تعبدوا إلا إياه",
            order: 4,
            media: { type: "youtube", videoId: "_lX073KsFS0", startAtSec: 0 },
          },
          {
            id: "lesson-005",
            title: "عبادة الخوف",
            order: 5,
            media: { type: "youtube", videoId: "cAnUEtoczvQ", startAtSec: 0 },
          },
          {
            id: "lesson-006",
            title: "تنبيهات على شروط لا إله إلا الله",
            order: 6,
            media: { type: "youtube", videoId: "BmII-loclM8", startAtSec: 0 },
          },
          {
            id: "lesson-007",
            title: "تعريف العبادة",
            order: 7,
            media: { type: "youtube", videoId: "KfcxncIhfWY", startAtSec: 0 },
          },
          {
            id: "lesson-008",
            title: "باب من حقق التوحيد",
            order: 8,
            media: { type: "youtube", videoId: "7NFHbC9bdMM", startAtSec: 0 },
          },
          {
            id: "lesson-009",
            title: "تابع معنى النصرة",
            order: 9,
            media: { type: "youtube", videoId: "nQWRfsyLgHQ", startAtSec: 0 },
          },
          {
            id: "lesson-010",
            title: "الحلف بغير الله",
            order: 10,
            media: { type: "youtube", videoId: "DL7ivP2XcVU", startAtSec: 0 },
          },
          {
            id: "lesson-011",
            title: "صور ليست من الموالاه",
            order: 11,
            media: { type: "youtube", videoId: "dbhH-1TlnXQ", startAtSec: 0 },
          },
          {
            id: "lesson-012",
            title: "تابع صور ليست من الموالاه3",
            order: 1,
            media: { type: "youtube", videoId: "bG0sT2BlJJI", startAtSec: 0 },
          },
          {
            id: "lesson-013",
            title: "النوع الثالث من الشرك",
            order: 1,
            media: { type: "youtube", videoId: "v8dB4Fw3KTk", startAtSec: 0 },
          },
          {
            id: "lesson-014",
            title: "تابع الشرك في الحاكمية2",
            order: 14,
            media: { type: "youtube", videoId: "S9caRBbl7To", startAtSec: 0 },
          },
          {
            id: "lesson-015",
            title: "تابع الشرك في الحاكمية3",
            order: 15,
            media: { type: "youtube", videoId: "W2uw94TtB6A", startAtSec: 0 },
          },
          {
            id: "lesson-016",
            title: "تابع الشرك في الحاكمية4",
            order: 16,
            media: { type: "youtube", videoId: "ffI9uVJ3HbM", startAtSec: 0 },
          },
          {
            id: "lesson-017",
            title: "الواجب علينا تجاه قضية الحاكمية",
            order: 17,
            media: { type: "youtube", videoId: "I6m500ZzDFM", startAtSec: 0 },
          },
          {
            id: "lesson-018",
            title: "بدعة تكفير عوام المسلمين",
            order: 18,
            media: { type: "youtube", videoId: "z-yMn5t1bPk", startAtSec: 0 },
          },
          {
            id: "lesson-019",
            title: "ما يثبت به حكم الإسلام",
            order: 19,
            media: { type: "youtube", videoId: "1OP0bC0B_yE", startAtSec: 0 },
          },
          {
            id: "lesson-020",
            title: "العذر بالجهل أدلة القرآن",
            order: 20,
            media: { type: "youtube", videoId: "SVhUlpr7DJ0", startAtSec: 0 },
          },
          {
            id: "lesson-021",
            title: "تابع العذر بالجهل",
            order: 21,
            media: { type: "youtube", videoId: "lind9-K_VHE", startAtSec: 0 },
          },
          {
            id: "lesson-022",
            title: "حكم التبرك",
            order: 22,
            media: { type: "youtube", videoId: "L9QYgzAMToE", startAtSec: 0 },
          },
          {
            id: "lesson-023",
            title: "تابع حكم التبرك",
            order: 23,
            media: { type: "youtube", videoId: "k2OqYi_lXQg", startAtSec: 0 },
          },
          {
            id: "lesson-024",
            title: "نهاية العذر بالجهل",
            order: 24,
            media: { type: "youtube", videoId: "iNQ9ebJClyU", startAtSec: 0 },
          },
          {
            id: "lesson-025",
            title: "مقدمة عن أهمية دراسة الأسماء والصفات",
            order: 25,
            media: { type: "youtube", videoId: "no89Q9BKsj4", startAtSec: 0 },
          },
          {
            id: "lesson-026",
            title: "الأسماء والصفات2",
            order: 26,
            media: { type: "youtube", videoId: "Fy9_ixJblds", startAtSec: 0 },
          },
          {
            id: "lesson-027",
            title: "الأسماء والصفات3",
            order: 27,
            media: { type: "youtube", videoId: "lUVk-Wm5nAc", startAtSec: 0 },
          },
          {
            id: "lesson-028",
            title: "الأسماء والصفات4",
            order: 28,
            media: { type: "youtube", videoId: "RLlNnqLArKE", startAtSec: 0 },
          },
          {
            id: "lesson-029",
            title: "الأسماء والصفات5",
            order: 29,
            media: { type: "youtube", videoId: "dUD0GBEinV8", startAtSec: 0 },
          },
        ] as LessonSeed[],
      },

      {
        branchId: "fiqh",
        bookId: "fiqh-ibadat",
        title: "الفقه",
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
