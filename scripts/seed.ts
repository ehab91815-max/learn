/* eslint-disable @typescript-eslint/no-explicit-any */
// scripts/seed.ts
import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  //projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

async function upsert(path: string, data: Record<string, any>) {
  await db.doc(path).set(data, { merge: true });
}

async function run() {
  const authorId = "dr-essam";

  await upsert(`authors/${authorId}`, {
    name: "د. عصام",
    order: 1,
    isPublished: true,
  });

  const branches = [
    { id: "aqeedah", title: "عقيدة", order: 1 },
    { id: "fiqh", title: "فقه", order: 2 },
    { id: "arabic", title: "لغة عربية", order: 3 },
  ];

  for (const b of branches) {
    await upsert(`authors/${authorId}/branches/${b.id}`, {
      title: b.title,
      order: b.order,
      isPublished: true,
    });
  }

  const books = [
    {
      branchId: "aqeedah",
      bookId: "aqeedah-101",
      title: "العقيدة للمبتدئين",
      lessons: [
        { id: "lesson-001", title: "مقدمة الدورة", order: 1 },
        { id: "lesson-002", title: "محاور العقيدة الأساسية", order: 2 },
        { id: "lesson-003", title: "مراجعة وخلاصة", order: 3 },
      ],
    },
    {
      branchId: "fiqh",
      bookId: "fiqh-ibadat",
      title: "فقه العبادات المختصر",
      lessons: [
        { id: "lesson-001", title: "مدخل إلى فقه العبادات", order: 1 },
        { id: "lesson-002", title: "الطهارة باختصار", order: 2 },
        { id: "lesson-003", title: "الصلاة باختصار", order: 3 },
      ],
    },
    {
      branchId: "arabic",
      bookId: "nahw-101",
      title: "مبادئ النحو",
      lessons: [
        { id: "lesson-001", title: "ما هو النحو ولماذا نتعلمه", order: 1 },
        { id: "lesson-002", title: "أقسام الكلمة", order: 2 },
        { id: "lesson-003", title: "المبتدأ والخبر", order: 3 },
      ],
    },
  ];

  for (const bk of books) {
    const bookPath = `authors/${authorId}/branches/${bk.branchId}/books/${bk.bookId}`;

    await upsert(bookPath, {
      title: bk.title,
      order: 1,
      isPublished: true,
      hasBookQuiz: true,
    });

    await upsert(`${bookPath}/bookQuiz/main`, {
      title: `اختبار ${bk.title}`,
      isOptional: true,
      passPercent: 60,
      isPublished: true,
    });

    for (const l of bk.lessons) {
      await upsert(`${bookPath}/lessons/${l.id}`, {
        title: l.title,
        order: l.order,
        isPublished: true,
        media: {
          type: "audio",
          r2Key: `authors/${authorId}/books/${bk.bookId}/${l.id}.mp3`,
        },
      });
    }
  }

  console.log("Seed done ✅");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});