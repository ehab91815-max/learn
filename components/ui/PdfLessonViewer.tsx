"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type PdfLessonViewerProps = {
  src: string;
  title: string;
  initialPage?: number;
  completed: boolean;
  disabled?: boolean;
  onSavePage: (page: number) => Promise<void> | void;
  onComplete: () => Promise<void> | void;
};

function normalizePage(value: number | string | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export default function PdfLessonViewer({
  src,
  title,
  initialPage = 1,
  completed,
  disabled = false,
  onSavePage,
  onComplete,
}: PdfLessonViewerProps) {
  const [page, setPage] = useState(() => normalizePage(initialPage));
  const [savedPage, setSavedPage] = useState(() => normalizePage(initialPage));
  const [isSavingPage, setIsSavingPage] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [message, setMessage] = useState("");

  const viewerSrc = useMemo(() => {
    return `${src}#page=${page}&toolbar=1&navpanes=0&view=FitH`;
  }, [src, page]);

  const pageUrl = useMemo(() => {
    return `${src}#page=${page}`;
  }, [src, page]);

  async function handleSavePage() {
    const nextPage = normalizePage(page);

    setIsSavingPage(true);
    setMessage("");

    try {
      await onSavePage(nextPage);
      setSavedPage(nextPage);
      setMessage(`تم حفظ موضع القراءة عند صفحة ${nextPage}`);
    } catch (error) {
      console.error(error);
      setMessage("تعذر حفظ موضع القراءة");
    } finally {
      setIsSavingPage(false);
    }
  }

  async function handleComplete() {
    setIsCompleting(true);
    setMessage("");

    try {
      await onComplete();
      setMessage("تم تسجيل إكمال الدرس");
    } catch (error) {
      console.error(error);
      setMessage("تعذر تسجيل إكمال الدرس");
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-3 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">PDF</Badge>
              {completed ? (
                <Badge>تم الإكمال</Badge>
              ) : (
                <Badge variant="outline">قيد الدراسة</Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              آخر صفحة محفوظة: {savedPage}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button asChild variant="outline" size="sm">
              <a href={pageUrl} target="_blank" rel="noreferrer">
                فتح الصفحة الحالية
              </a>
            </Button>

            <Button asChild variant="outline" size="sm">
              <a href={src} download>
                تحميل PDF
              </a>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-muted/20">
          <iframe
            title={title || "PDF"}
            src={viewerSrc}
            className="h-[65vh] min-h-[420px] w-full sm:h-[75vh]"
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">الصفحة الحالية</label>
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              value={page}
              onChange={(e) => setPage(normalizePage(e.target.value))}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              اكتب رقم الصفحة التي وصلت إليها ثم اضغط حفظ موضع القراءة.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleSavePage}
            disabled={disabled || isSavingPage}
          >
            {isSavingPage ? "جاري الحفظ..." : "حفظ موضع القراءة"}
          </Button>

          <Button
            type="button"
            onClick={handleComplete}
            disabled={disabled || completed || isCompleting}
          >
            {completed
              ? "تمت دراسة الدرس"
              : isCompleting
                ? "جاري الحفظ..."
                : "تسجيل إكمال الدرس"}
          </Button>
        </div>

        {message ? (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
            {message}
          </p>
        ) : null}

        {disabled ? (
          <p className="mt-3 text-sm text-muted-foreground">
            سجّل الدخول حتى يتم حفظ موضع القراءة وإكمال الدرس.
          </p>
        ) : null}
      </div>
    </div>
  );
}