/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Author, Branch, Book, Lesson } from "@/lib/catalog";
import {
  createAuthor,
  createBook,
  createBranch,
  createLesson,
  deleteAuthorDeep,
  deleteBookDeep,
  deleteBranchDeep,
  deleteLesson,
  listAdminAuthors,
  listAdminBooks,
  listAdminBranches,
  listAdminLessons,
  updateAuthor,
  updateBook,
  updateBranch,
  updateLesson,
  updateLessonOrders,
} from "@/lib/admin-catalog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import R2UploadField from "@/components/ui/R2UploadField";

type MediaKind = "audio" | "youtube" | "pdf";

type AuthorForm = {
  id?: string;
  docId: string;
  name: string;
  bio: string;
  imageUrl: string;
  order: string;
  isPublished: boolean;
};

type BranchForm = {
  id?: string;
  docId: string;
  title: string;
  description: string;
  order: string;
  isPublished: boolean;
};

type BookForm = {
  id?: string;
  docId: string;
  title: string;
  description: string;
  coverUrl: string;
  order: string;
  isPublished: boolean;
  hasBookQuiz: boolean;
};

type LessonForm = {
  id?: string;
  title: string;
  summary: string;
  order: string;
  isPublished: boolean;
  mediaType: MediaKind;
  r2Key: string;
  videoId: string;
  startAtSec: string;
  durationSec: string;
};

const emptyAuthorForm: AuthorForm = {
  docId: "",
  name: "",
  bio: "",
  imageUrl: "",
  order: "1",
  isPublished: true,
};

const emptyBranchForm: BranchForm = {
  docId: "",
  title: "",
  description: "",
  order: "1",
  isPublished: true,
};

const emptyBookForm: BookForm = {
  docId: "",
  title: "",
  description: "",
  coverUrl: "",
  order: "1",
  isPublished: true,
  hasBookQuiz: false,
};

const emptyLessonForm: LessonForm = {
  title: "",
  summary: "",
  order: "1",
  isPublished: true,
  mediaType: "audio",
  r2Key: "",
  videoId: "",
  startAtSec: "0",
  durationSec: "",
};

function toNumber(value: string, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function assertValidDocId(value: string, label: string) {
  const id = value.trim();

  if (!id) {
    throw new Error(`${label} مطلوب`);
  }

  if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
    throw new Error(
      `${label} يجب أن يحتوي على حروف إنجليزية أو أرقام أو - أو _ فقط`,
    );
  }

  return id;
}

function mediaLabel(media: Lesson["media"]) {
  if (media.type === "audio") return "صوت";
  if (media.type === "youtube") return "يوتيوب";
  if (media.type === "pdf") return "PDF";
  return "غير معروف";
}

function buildMediaFromForm(form: LessonForm): Lesson["media"] {
  if (form.mediaType === "youtube") {
    return {
      type: "youtube",
      videoId: form.videoId.trim(),
      startAtSec: toNumber(form.startAtSec, 0),
    };
  }

  if (form.mediaType === "pdf") {
    return {
      type: "pdf",
      r2Key: form.r2Key.trim(),
    };
  }

  const media: {
    type: "audio";
    r2Key: string;
    durationSec?: number;
  } = {
    type: "audio",
    r2Key: form.r2Key.trim(),
  };

  if (form.durationSec.trim()) {
    media.durationSec = toNumber(form.durationSec, 0);
  }

  return media;
}

function lessonToForm(lesson: Lesson): LessonForm {
  const media = lesson.media;

  return {
    id: lesson.id,
    title: lesson.title ?? "",
    summary: lesson.summary ?? "",
    order: String(lesson.order ?? 1),
    isPublished: !!lesson.isPublished,
    mediaType: media.type,
    r2Key:
      media.type === "audio" || media.type === "pdf" ? (media.r2Key ?? "") : "",
    videoId: media.type === "youtube" ? (media.videoId ?? "") : "",
    startAtSec: media.type === "youtube" ? String(media.startAtSec ?? 0) : "0",
    durationSec:
      media.type === "audio" && media.durationSec
        ? String(media.durationSec)
        : "",
  };
}

export default function AdminPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [selectedAuthorId, setSelectedAuthorId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("");

  const [authorForm, setAuthorForm] = useState<AuthorForm>(emptyAuthorForm);
  const [branchForm, setBranchForm] = useState<BranchForm>(emptyBranchForm);
  const [bookForm, setBookForm] = useState<BookForm>(emptyBookForm);
  const [lessonForm, setLessonForm] = useState<LessonForm>(emptyLessonForm);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedAuthor = useMemo(
    () => authors.find((a) => a.id === selectedAuthorId) ?? null,
    [authors, selectedAuthorId],
  );

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId) ?? null,
    [branches, selectedBranchId],
  );

  const selectedBook = useMemo(
    () => books.find((b) => b.id === selectedBookId) ?? null,
    [books, selectedBookId],
  );

  const runAction = useCallback(async (action: () => Promise<void>) => {
    setLoading(true);
    setMessage("");

    try {
      await action();
      setMessage("تم الحفظ بنجاح");
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message ?? "حدث خطأ أثناء تنفيذ العملية");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAuthors = useCallback(async () => {
    const data = await listAdminAuthors();
    setAuthors(data);
  }, []);

  const refreshBranches = useCallback(async (authorId: string) => {
    if (!authorId) {
      setBranches([]);
      return;
    }

    const data = await listAdminBranches(authorId);
    setBranches(data);
  }, []);

  const refreshBooks = useCallback(
    async (authorId: string, branchId: string) => {
      if (!authorId || !branchId) {
        setBooks([]);
        return;
      }

      const data = await listAdminBooks(authorId, branchId);
      setBooks(data);
    },
    [],
  );

  const refreshLessons = useCallback(
    async (authorId: string, branchId: string, bookId: string) => {
      if (!authorId || !branchId || !bookId) {
        setLessons([]);
        return;
      }

      const data = await listAdminLessons(authorId, branchId, bookId);
      setLessons(data);
    },
    [],
  );

  useEffect(() => {
    refreshAuthors();
  }, [refreshAuthors]);

  async function handleSelectAuthor(authorId: string) {
    setSelectedAuthorId(authorId);
    setSelectedBranchId("");
    setSelectedBookId("");
    setBranches([]);
    setBooks([]);
    setLessons([]);
    setBranchForm(emptyBranchForm);
    setBookForm(emptyBookForm);
    setLessonForm(emptyLessonForm);

    if (authorId) {
      await refreshBranches(authorId);
    }
  }

  async function handleSelectBranch(branchId: string) {
    setSelectedBranchId(branchId);
    setSelectedBookId("");
    setBooks([]);
    setLessons([]);
    setBookForm(emptyBookForm);
    setLessonForm(emptyLessonForm);

    if (selectedAuthorId && branchId) {
      await refreshBooks(selectedAuthorId, branchId);
    }
  }

  async function handleSelectBook(bookId: string) {
    setSelectedBookId(bookId);
    setLessons([]);
    setLessonForm(emptyLessonForm);

    if (selectedAuthorId && selectedBranchId && bookId) {
      await refreshLessons(selectedAuthorId, selectedBranchId, bookId);
    }
  }

  function resetAuthorForm() {
    setAuthorForm(emptyAuthorForm);
  }

  function resetBranchForm() {
    setBranchForm(emptyBranchForm);
  }

  function resetBookForm() {
    setBookForm(emptyBookForm);
  }

  function resetLessonForm() {
    setLessonForm(emptyLessonForm);
  }

  async function submitAuthor(e: React.FormEvent) {
    e.preventDefault();

    await runAction(async () => {
      const payload = {
        name: authorForm.name.trim(),
        bio: optionalText(authorForm.bio),
        imageUrl: optionalText(authorForm.imageUrl),
        order: toNumber(authorForm.order, 1),
        isPublished: authorForm.isPublished,
      };

      if (authorForm.id) {
        await updateAuthor(authorForm.id, payload);
      } else {
        const customAuthorId = assertValidDocId(authorForm.docId, "Author ID");
        await createAuthor(payload, customAuthorId);
      }

      resetAuthorForm();
      await refreshAuthors();
    });
  }

  async function submitBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAuthorId) return;

    await runAction(async () => {
      const payload = {
        title: branchForm.title.trim(),
        description: optionalText(branchForm.description),
        order: toNumber(branchForm.order, 1),
        isPublished: branchForm.isPublished,
      };

      if (branchForm.id) {
        await updateBranch(selectedAuthorId, branchForm.id, payload);
      } else {
        const customBranchId = assertValidDocId(branchForm.docId, "Branch ID");
        await createBranch(selectedAuthorId, payload, customBranchId);
      }

      resetBranchForm();
      await refreshBranches(selectedAuthorId);
    });
  }

  async function submitBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAuthorId || !selectedBranchId) return;

    await runAction(async () => {
      const payload = {
        title: bookForm.title.trim(),
        description: optionalText(bookForm.description),
        coverUrl: optionalText(bookForm.coverUrl),
        order: toNumber(bookForm.order, 1),
        isPublished: bookForm.isPublished,
        hasBookQuiz: bookForm.hasBookQuiz,
      };

      if (bookForm.id) {
        await updateBook(
          selectedAuthorId,
          selectedBranchId,
          bookForm.id,
          payload,
        );
      } else {
        const customBookId = bookForm.docId.trim();

        if (!customBookId) {
          throw new Error("Book ID مطلوب عند إنشاء كتاب جديد");
        }

        if (!/^[a-zA-Z0-9-_]+$/.test(customBookId)) {
          throw new Error(
            "Book ID يجب أن يحتوي على حروف إنجليزية أو أرقام أو - أو _ فقط",
          );
        }

        await createBook(
          selectedAuthorId,
          selectedBranchId,
          payload,
          customBookId,
        );
      }

      resetBookForm();
      await refreshBooks(selectedAuthorId, selectedBranchId);
    });
  }

  async function submitLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAuthorId || !selectedBranchId || !selectedBookId) return;

    await runAction(async () => {
      const payload = {
        title: lessonForm.title.trim(),
        summary: optionalText(lessonForm.summary),
        order: toNumber(lessonForm.order, 1),
        isPublished: lessonForm.isPublished,
        media: buildMediaFromForm(lessonForm),
      };

      if (lessonForm.id) {
        await updateLesson(
          selectedAuthorId,
          selectedBranchId,
          selectedBookId,
          lessonForm.id,
          payload,
        );
      } else {
        await createLesson(
          selectedAuthorId,
          selectedBranchId,
          selectedBookId,
          payload,
        );
      }

      resetLessonForm();
      await refreshLessons(selectedAuthorId, selectedBranchId, selectedBookId);
    });
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">لوحة إدارة المحتوى</h1>
        <p className="text-sm text-muted-foreground">
          إدارة المؤلفين، الفروع، الكتب، والدروس من مكان واحد.
        </p>

        {message ? (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            {message}
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>اختيار المسار</CardTitle>
          <CardDescription>
            اختر المؤلف ثم الفرع ثم الكتاب لإدارة الدروس.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">المؤلف</label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedAuthorId}
              onChange={(e) => handleSelectAuthor(e.target.value)}
            >
              <option value="">اختر المؤلف</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">الفرع</label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedBranchId}
              onChange={(e) => handleSelectBranch(e.target.value)}
              disabled={!selectedAuthorId}
            >
              <option value="">اختر الفرع</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">الكتاب</label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedBookId}
              onChange={(e) => handleSelectBook(e.target.value)}
              disabled={!selectedBranchId}
            >
              <option value="">اختر الكتاب</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>المؤلفون</CardTitle>
            <CardDescription>إضافة وتعديل وحذف المؤلفين.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={submitAuthor} className="space-y-3">
              <Input
                placeholder="Author ID مثل: dr-essam"
                value={authorForm.docId}
                onChange={(e) =>
                  setAuthorForm((p) => ({ ...p, docId: e.target.value }))
                }
                disabled={!!authorForm.id}
                required={!authorForm.id}
              />

              {authorForm.id ? (
                <p className="text-xs text-muted-foreground">
                  لا يمكن تعديل Author ID بعد إنشاء المؤلف.
                </p>
              ) : null}

              <Input
                placeholder="اسم المؤلف"
                value={authorForm.name}
                onChange={(e) =>
                  setAuthorForm((p) => ({ ...p, name: e.target.value }))
                }
                required
              />

              <textarea
                className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="نبذة مختصرة"
                value={authorForm.bio}
                onChange={(e) =>
                  setAuthorForm((p) => ({ ...p, bio: e.target.value }))
                }
              />

              <Input
                placeholder="رابط الصورة"
                value={authorForm.imageUrl}
                onChange={(e) =>
                  setAuthorForm((p) => ({ ...p, imageUrl: e.target.value }))
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="الترتيب"
                  value={authorForm.order}
                  onChange={(e) =>
                    setAuthorForm((p) => ({ ...p, order: e.target.value }))
                  }
                />

                <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={authorForm.isPublished}
                    onChange={(e) =>
                      setAuthorForm((p) => ({
                        ...p,
                        isPublished: e.target.checked,
                      }))
                    }
                  />
                  منشور
                </label>
              </div>

              <div className="flex gap-2">
                <Button disabled={loading}>
                  {authorForm.id ? "حفظ تعديل المؤلف" : "إضافة مؤلف"}
                </Button>

                {authorForm.id ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetAuthorForm}
                  >
                    إلغاء
                  </Button>
                ) : null}
              </div>
            </form>

            <Separator />

            <div className="space-y-2">
              {authors.map((author) => (
                <div
                  key={author.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium">{author.name}</div>
                    <div className="text-xs text-muted-foreground">
                      order: {author.order} — id: {author.id}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={author.isPublished ? "default" : "outline"}>
                      {author.isPublished ? "منشور" : "مخفي"}
                    </Badge>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setAuthorForm({
                          id: author.id,
                          docId: author.id,
                          name: author.name ?? "",
                          bio: author.bio ?? "",
                          imageUrl: author.imageUrl ?? "",
                          order: String(author.order ?? 1),
                          isPublished: !!author.isPublished,
                        })
                      }
                    >
                      تعديل
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (
                          !confirm(
                            "سيتم حذف المؤلف وكل الفروع والكتب والدروس داخله. هل أنت متأكد؟",
                          )
                        ) {
                          return;
                        }

                        runAction(async () => {
                          await deleteAuthorDeep(author.id);
                          if (selectedAuthorId === author.id) {
                            await handleSelectAuthor("");
                          }
                          await refreshAuthors();
                        });
                      }}
                    >
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الفروع</CardTitle>
            <CardDescription>
              {selectedAuthor
                ? `الفروع داخل: ${selectedAuthor.name}`
                : "اختر مؤلفًا أولًا."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={submitBranch} className="space-y-3">
              <Input
                placeholder="Branch ID مثل: aqeedah"
                value={branchForm.docId}
                onChange={(e) =>
                  setBranchForm((p) => ({ ...p, docId: e.target.value }))
                }
                disabled={!selectedAuthorId || !!branchForm.id}
                required={!branchForm.id}
              />

              {branchForm.id ? (
                <p className="text-xs text-muted-foreground">
                  لا يمكن تعديل Branch ID بعد إنشاء الفرع.
                </p>
              ) : null}

              <Input
                placeholder="عنوان الفرع"
                value={branchForm.title}
                onChange={(e) =>
                  setBranchForm((p) => ({ ...p, title: e.target.value }))
                }
                disabled={!selectedAuthorId}
                required
              />

              <textarea
                className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="وصف الفرع"
                value={branchForm.description}
                onChange={(e) =>
                  setBranchForm((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                disabled={!selectedAuthorId}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="الترتيب"
                  value={branchForm.order}
                  onChange={(e) =>
                    setBranchForm((p) => ({ ...p, order: e.target.value }))
                  }
                  disabled={!selectedAuthorId}
                />

                <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={branchForm.isPublished}
                    onChange={(e) =>
                      setBranchForm((p) => ({
                        ...p,
                        isPublished: e.target.checked,
                      }))
                    }
                    disabled={!selectedAuthorId}
                  />
                  منشور
                </label>
              </div>

              <div className="flex gap-2">
                <Button disabled={loading || !selectedAuthorId}>
                  {branchForm.id ? "حفظ تعديل الفرع" : "إضافة فرع"}
                </Button>

                {branchForm.id ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetBranchForm}
                  >
                    إلغاء
                  </Button>
                ) : null}
              </div>
            </form>

            <Separator />

            <div className="space-y-2">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium">{branch.title}</div>
                    <div className="text-xs text-muted-foreground">
                      order: {branch.order} — id: {branch.id}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={branch.isPublished ? "default" : "outline"}>
                      {branch.isPublished ? "منشور" : "مخفي"}
                    </Badge>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedBranchId(branch.id);

                        setBranchForm({
                          id: branch.id,
                          docId: branch.id,
                          title: branch.title ?? "",
                          description: branch.description ?? "",
                          order: String(branch.order ?? 1),
                          isPublished: !!branch.isPublished,
                        });
                      }}
                    >
                      تعديل
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (
                          !confirm(
                            "سيتم حذف الفرع وكل الكتب والدروس داخله. هل أنت متأكد؟",
                          )
                        ) {
                          return;
                        }

                        runAction(async () => {
                          await deleteBranchDeep(selectedAuthorId, branch.id);
                          if (selectedBranchId === branch.id) {
                            await handleSelectBranch("");
                          }
                          await refreshBranches(selectedAuthorId);
                        });
                      }}
                    >
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>الكتب</CardTitle>
            <CardDescription>
              {selectedBranch
                ? `الكتب داخل: ${selectedBranch.title}`
                : "اختر فرعًا أولًا."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={submitBook} className="space-y-3">
              <Input
                placeholder="Book ID مثل: alfadl"
                value={bookForm.docId}
                onChange={(e) =>
                  setBookForm((p) => ({ ...p, docId: e.target.value }))
                }
                disabled={!selectedBranchId || !!bookForm.id}
                required={!bookForm.id}
              />

              {bookForm.id ? (
                <p className="text-xs text-muted-foreground">
                  لا يمكن تعديل Book ID بعد إنشاء الكتاب. أنشئ كتابًا جديدًا إذا
                  أردت تغيير المسار.
                </p>
              ) : null}

              <Input
                placeholder="عنوان الكتاب"
                value={bookForm.title}
                onChange={(e) =>
                  setBookForm((p) => ({ ...p, title: e.target.value }))
                }
                disabled={!selectedBranchId}
                required
              />

              <textarea
                className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="وصف الكتاب"
                value={bookForm.description}
                onChange={(e) =>
                  setBookForm((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                disabled={!selectedBranchId}
              />

              <Input
                placeholder="رابط الغلاف"
                value={bookForm.coverUrl}
                onChange={(e) =>
                  setBookForm((p) => ({ ...p, coverUrl: e.target.value }))
                }
                disabled={!selectedBranchId}
              />

              <div className="grid grid-cols-3 gap-3">
                <Input
                  type="number"
                  placeholder="الترتيب"
                  value={bookForm.order}
                  onChange={(e) =>
                    setBookForm((p) => ({ ...p, order: e.target.value }))
                  }
                  disabled={!selectedBranchId}
                />

                <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={bookForm.isPublished}
                    onChange={(e) =>
                      setBookForm((p) => ({
                        ...p,
                        isPublished: e.target.checked,
                      }))
                    }
                    disabled={!selectedBranchId}
                  />
                  منشور
                </label>

                <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={bookForm.hasBookQuiz}
                    onChange={(e) =>
                      setBookForm((p) => ({
                        ...p,
                        hasBookQuiz: e.target.checked,
                      }))
                    }
                    disabled={!selectedBranchId}
                  />
                  اختبار كتاب
                </label>
              </div>

              <div className="flex gap-2">
                <Button disabled={loading || !selectedBranchId}>
                  {bookForm.id ? "حفظ تعديل الكتاب" : "إضافة كتاب"}
                </Button>

                {bookForm.id ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetBookForm}
                  >
                    إلغاء
                  </Button>
                ) : null}
              </div>
            </form>

            <Separator />

            <div className="space-y-2">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium">{book.title}</div>
                    <div className="text-xs text-muted-foreground">
                      order: {book.order} — id: {book.id}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={book.isPublished ? "default" : "outline"}>
                      {book.isPublished ? "منشور" : "مخفي"}
                    </Badge>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedBookId(book.id);
                        setBookForm({
                          id: book.id,
                          docId: book.id,
                          title: book.title ?? "",
                          description: book.description ?? "",
                          coverUrl: book.coverUrl ?? "",
                          order: String(book.order ?? 1),
                          isPublished: !!book.isPublished,
                          hasBookQuiz: !!book.hasBookQuiz,
                        });

                        if (selectedAuthorId && selectedBranchId) {
                          refreshLessons(
                            selectedAuthorId,
                            selectedBranchId,
                            book.id,
                          );
                        }
                      }}
                    >
                      تعديل
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (
                          !confirm(
                            "سيتم حذف الكتاب وكل الدروس داخله. هل أنت متأكد؟",
                          )
                        ) {
                          return;
                        }

                        runAction(async () => {
                          await deleteBookDeep(
                            selectedAuthorId,
                            selectedBranchId,
                            book.id,
                          );

                          if (selectedBookId === book.id) {
                            await handleSelectBook("");
                          }

                          await refreshBooks(
                            selectedAuthorId,
                            selectedBranchId,
                          );
                        });
                      }}
                    >
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الدروس</CardTitle>
            <CardDescription>
              {selectedBook
                ? `الدروس داخل: ${selectedBook.title}`
                : "اختر كتابًا أولًا."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={submitLesson} className="space-y-3">
              <Input
                placeholder="عنوان الدرس"
                value={lessonForm.title}
                onChange={(e) =>
                  setLessonForm((p) => ({ ...p, title: e.target.value }))
                }
                disabled={!selectedBookId}
                required
              />

              <textarea
                className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="ملخص الدرس"
                value={lessonForm.summary}
                onChange={(e) =>
                  setLessonForm((p) => ({ ...p, summary: e.target.value }))
                }
                disabled={!selectedBookId}
              />

              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  type="number"
                  placeholder="الترتيب"
                  value={lessonForm.order}
                  onChange={(e) =>
                    setLessonForm((p) => ({ ...p, order: e.target.value }))
                  }
                  disabled={!selectedBookId}
                />

                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={lessonForm.mediaType}
                  onChange={(e) =>
                    setLessonForm((p) => ({
                      ...p,
                      mediaType: e.target.value as MediaKind,
                    }))
                  }
                  disabled={!selectedBookId}
                >
                  <option value="audio">صوت R2</option>
                  <option value="youtube">يوتيوب</option>
                  <option value="pdf">PDF R2</option>
                </select>

                <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={lessonForm.isPublished}
                    onChange={(e) =>
                      setLessonForm((p) => ({
                        ...p,
                        isPublished: e.target.checked,
                      }))
                    }
                    disabled={!selectedBookId}
                  />
                  منشور
                </label>
              </div>

              {lessonForm.mediaType === "youtube" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder="YouTube Video ID"
                    value={lessonForm.videoId}
                    onChange={(e) =>
                      setLessonForm((p) => ({
                        ...p,
                        videoId: e.target.value,
                      }))
                    }
                    disabled={!selectedBookId}
                    required
                  />

                  <Input
                    type="number"
                    placeholder="Start At Sec"
                    value={lessonForm.startAtSec}
                    onChange={(e) =>
                      setLessonForm((p) => ({
                        ...p,
                        startAtSec: e.target.value,
                      }))
                    }
                    disabled={!selectedBookId}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <R2UploadField
                    mediaType={lessonForm.mediaType}
                    authorId={selectedAuthorId}
                    branchId={selectedBranchId}
                    bookId={selectedBookId}
                    value={lessonForm.r2Key}
                    disabled={!selectedBookId}
                    onChange={(r2Key) =>
                      setLessonForm((p) => ({
                        ...p,
                        r2Key,
                      }))
                    }
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      placeholder={
                        lessonForm.mediaType === "pdf"
                          ? "PDF R2 Key"
                          : "Audio R2 Key"
                      }
                      value={lessonForm.r2Key}
                      onChange={(e) =>
                        setLessonForm((p) => ({
                          ...p,
                          r2Key: e.target.value,
                        }))
                      }
                      disabled={!selectedBookId}
                      required
                    />

                    {lessonForm.mediaType === "audio" ? (
                      <Input
                        type="number"
                        placeholder="مدة الصوت بالثواني - اختياري"
                        value={lessonForm.durationSec}
                        onChange={(e) =>
                          setLessonForm((p) => ({
                            ...p,
                            durationSec: e.target.value,
                          }))
                        }
                        disabled={!selectedBookId}
                      />
                    ) : null}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button disabled={loading || !selectedBookId}>
                  {lessonForm.id ? "حفظ تعديل الدرس" : "إضافة درس"}
                </Button>

                {lessonForm.id ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetLessonForm}
                  >
                    إلغاء
                  </Button>
                ) : null}
              </div>
            </form>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">ترتيب الدروس</h3>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!selectedBookId || loading || lessons.length === 0}
                  onClick={() => {
                    runAction(async () => {
                      await updateLessonOrders(
                        selectedAuthorId,
                        selectedBranchId,
                        selectedBookId,
                        lessons.map((lesson) => ({
                          id: lesson.id,
                          order: Number(lesson.order ?? 0),
                        })),
                      );

                      await refreshLessons(
                        selectedAuthorId,
                        selectedBranchId,
                        selectedBookId,
                      );
                    });
                  }}
                >
                  حفظ ترتيب الدروس
                </Button>
              </div>

              {lessons.map((lesson) => (
                <div key={lesson.id} className="rounded-lg border p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{lesson.title}</div>
                      <div className="text-xs text-muted-foreground">
                        id: {lesson.id}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{mediaLabel(lesson.media)}</Badge>
                      <Badge
                        variant={lesson.isPublished ? "default" : "outline"}
                      >
                        {lesson.isPublished ? "منشور" : "مخفي"}
                      </Badge>

                      <Input
                        type="number"
                        className="w-24"
                        value={String(lesson.order ?? 0)}
                        onChange={(e) => {
                          const nextOrder = Number(e.target.value);

                          setLessons((prev) =>
                            prev.map((item) =>
                              item.id === lesson.id
                                ? {
                                    ...item,
                                    order: Number.isFinite(nextOrder)
                                      ? nextOrder
                                      : 0,
                                  }
                                : item,
                            ),
                          );
                        }}
                      />

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setLessonForm(lessonToForm(lesson))}
                      >
                        تعديل
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (!confirm("هل تريد حذف هذا الدرس؟")) return;

                          runAction(async () => {
                            await deleteLesson(
                              selectedAuthorId,
                              selectedBranchId,
                              selectedBookId,
                              lesson.id,
                            );

                            await refreshLessons(
                              selectedAuthorId,
                              selectedBranchId,
                              selectedBookId,
                            );
                          });
                        }}
                      >
                        حذف
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {selectedBookId && lessons.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  لا توجد دروس داخل هذا الكتاب حتى الآن.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
