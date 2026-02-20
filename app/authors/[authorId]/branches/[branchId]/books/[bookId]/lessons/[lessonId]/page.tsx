/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase.client";

import {
  getAuthor,
  getBranch,
  getBook,
  getLesson,
  Author,
  Branch,
  Book,
} from "@/lib/catalog";
import { getOrCreateActiveAttempt } from "@/lib/attempts";
import { getLessonProgress, saveLessonProgress } from "@/lib/progress";
import { r2UrlFromKey } from "@/lib/r2";

import BreadcrumbNav from "@/components/ui/BreadcrumbNav";
import AudioPlayer from "@/components/ui/AudioPlayer";
import YouTubePlayer from "@/components/ui/YouTubePlayer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function LessonPage({
  params,
}: {
  params: Promise<{
    authorId: string;
    branchId: string;
    bookId: string;
    lessonId: string;
  }>;
}) {
  const { authorId, branchId, bookId, lessonId } = React.use(params);

  const [uid, setUid] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const [author, setAuthor] = useState<Author | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [book, setBook] = useState<Book | null>(null);

  const [title, setTitle] = useState<string>("");
  const [media, setMedia] = useState<any>(null);

  const [initialTime, setInitialTime] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    getAuthor(authorId).then(setAuthor);
    getBranch(authorId, branchId).then(setBranch);
    getBook(authorId, branchId, bookId).then(setBook);

    (async () => {
      const lesson = await getLesson(authorId, branchId, bookId, lessonId);
      if (!lesson) return;
      setTitle(lesson.title);
      setMedia(lesson.media);
    })();
  }, [authorId, branchId, bookId, lessonId]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const a = await getOrCreateActiveAttempt(uid, authorId, branchId, bookId);
      setAttemptId(a.id);

      const p = await getLessonProgress(uid, a.id, lessonId);
      if (p) {
        setInitialTime(Number(p.lastPositionSec ?? 0));
        setCompleted(!!p.completed);
      } else {
        setInitialTime(0);
        setCompleted(false);
      }
    })();
  }, [uid, authorId, branchId, bookId, lessonId]);

  const handleTick = useCallback(
    async (sec: number) => {
      if (!uid || !attemptId) return;
      if (completed) return;
      await saveLessonProgress(uid, attemptId, lessonId, {
        lastPositionSec: Math.max(0, Math.floor(sec)),
      });
    },
    [uid, attemptId, lessonId, completed],
  );

  const handleEnded = useCallback(async () => {
    if (!uid || !attemptId) return;
    await saveLessonProgress(uid, attemptId, lessonId, {
      completed: true,
      lastPositionSec: 0,
    });
    setCompleted(true);
  }, [uid, attemptId, lessonId]);

  const crumbs = useMemo(
    () => [
      { label: "المؤلفون", href: "/authors" },
      { label: author?.name ?? "...", href: `/authors/${authorId}` },
      {
        label: branch?.title ?? "...",
        href: `/authors/${authorId}/branches/${branchId}`,
      },
      {
        label: book?.title ?? "...",
        href: `/authors/${authorId}/branches/${branchId}/books/${bookId}`,
      },
      { label: title || "..." },
    ],
    [
      author?.name,
      branch?.title,
      book?.title,
      title,
      authorId,
      branchId,
      bookId,
    ],
  );

  const isAudio = media?.type === "audio";
  const isYoutube = media?.type === "youtube";

  return (
    <main className="mx-auto max-w-3xl p-4 space-y-4">
      <BreadcrumbNav items={crumbs} />

      <Card>
        <CardHeader>
          <CardTitle>{title || "..."}</CardTitle>
          {completed ? (
            <CardDescription>تم إكمال الدرس ✅</CardDescription>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4">
          {isAudio ? (
            <AudioPlayer
              src={r2UrlFromKey(media.r2Key)}
              initialTimeSec={initialTime}
              onTick={handleTick}
              onEnded={handleEnded}
            />
          ) : null}

          {isYoutube ? (
            <YouTubePlayer
              videoId={media.videoId}
              initialTimeSec={initialTime}
              onTick={handleTick}
              onEnded={handleEnded}
            />
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
