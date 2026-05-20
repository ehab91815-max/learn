"use client";

import React, { useRef, useState } from "react";
import { auth } from "@/lib/firebase.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type R2UploadFieldProps = {
  mediaType: "audio" | "pdf";
  authorId: string;
  branchId: string;
  bookId: string;
  value: string;
  disabled?: boolean;
  onChange: (r2Key: string) => void;
};

function getAccept(mediaType: "audio" | "pdf") {
  if (mediaType === "pdf") return "application/pdf,.pdf";

  return [
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "audio/x-aac",
    "audio/ogg",
    "application/ogg",
    "audio/opus",
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/flac",
    "audio/x-flac",
    ".mp3",
    ".m4a",
    ".aac",
    ".ogg",
    ".opus",
    ".webm",
    ".wav",
    ".flac",
  ].join(",");
}

function getLabel(mediaType: "audio" | "pdf") {
  if (mediaType === "pdf") return "رفع ملف PDF إلى R2";
  return "رفع ملف MP3 إلى R2";
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes)) return "";

  const mb = bytes / 1024 / 1024;

  if (mb < 1) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${mb.toFixed(1)} MB`;
}

export default function R2UploadField({
  mediaType,
  authorId,
  branchId,
  bookId,
  value,
  disabled = false,
  onChange,
}: R2UploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [progressText, setProgressText] = useState("");

  async function uploadFile() {
    if (!selectedFile) {
      setMessage("اختر ملفًا أولًا");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setMessage("يجب تسجيل الدخول أولًا");
      return;
    }

    if (!authorId || !branchId || !bookId) {
      setMessage("اختر المؤلف والفرع والكتاب أولًا");
      return;
    }

    setIsUploading(true);
    setMessage("");
    setProgressText("جاري تجهيز رابط الرفع...");

    try {
      const token = await user.getIdToken();

      const presignRes = await fetch("/api/r2/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          contentType: selectedFile.type,
          fileSize: selectedFile.size,
          mediaType,
          authorId,
          branchId,
          bookId,
        }),
      });

      const presignData = await presignRes.json();

      if (!presignRes.ok) {
        throw new Error(presignData?.error ?? "تعذر تجهيز رابط الرفع");
      }

      setProgressText("جاري رفع الملف إلى R2...");

      const uploadRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!uploadRes.ok) {
        throw new Error("فشل رفع الملف إلى R2");
      }

      onChange(presignData.r2Key);
      setMessage("تم رفع الملف وتعبئة R2 Key بنجاح");
      setProgressText("");

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      setSelectedFile(null);
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message ?? "حدث خطأ أثناء الرفع");
      setProgressText("");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{getLabel(mediaType)}</p>
          <p className="text-xs text-muted-foreground">
            بعد الرفع سيتم تعبئة R2 Key تلقائيًا.
          </p>
        </div>

        {selectedFile ? (
          <p className="text-xs text-muted-foreground">
            {selectedFile.name} — {formatSize(selectedFile.size)}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          ref={inputRef}
          type="file"
          accept={getAccept(mediaType)}
          disabled={disabled || isUploading}
          onChange={(e) => {
            setMessage("");
            setProgressText("");
            setSelectedFile(e.target.files?.[0] ?? null);
          }}
        />

        <Button
          type="button"
          variant="outline"
          disabled={disabled || isUploading || !selectedFile}
          onClick={uploadFile}
        >
          {isUploading ? "جاري الرفع..." : "رفع الملف"}
        </Button>
      </div>

      {value ? (
        <p className="break-all rounded-md bg-background px-3 py-2 text-xs text-muted-foreground">
          R2 Key الحالي: {value}
        </p>
      ) : null}

      {progressText ? (
        <p className="text-sm text-muted-foreground">{progressText}</p>
      ) : null}

      {message ? (
        <p className="rounded-md bg-background px-3 py-2 text-sm">{message}</p>
      ) : null}
    </div>
  );
}
