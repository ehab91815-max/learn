// components/ui/AudioPlayer.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function AudioPlayer({
  src,
  initialTimeSec,
  onTick,
  onEnded,
}: {
  src: string;
  initialTimeSec: number;
  onTick: (currentTimeSec: number) => void;
  onEnded: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const didSeekInitialRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [lastSavedAtSec, setLastSavedAtSec] = useState<number | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const saveCurrentTime = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const safeTime = audio.currentTime || 0;
    onTick(safeTime);
    setLastSavedAtSec(safeTime);
  }, [onTick]);

  const seekTo = useCallback(
    (nextTime: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      const safeTime = clamp(nextTime, 0, duration || 0);
      audio.currentTime = safeTime;
      setCurrentTime(safeTime);
    },
    [duration],
  );

  const skipBy = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      seekTo((audio.currentTime || 0) + seconds);
    },
    [seekTo],
  );

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!ready) return;
    if (!duration) return;
    if (didSeekInitialRef.current) return;

    if (initialTimeSec > 0 && initialTimeSec < duration) {
      const safeTime = clamp(initialTimeSec, 0, duration);

      audio.currentTime = safeTime;
      setCurrentTime(safeTime);
      didSeekInitialRef.current = true;
    }
  }, [ready, duration, initialTimeSec]);

  useEffect(() => {
    if (!isFocusMode) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFocusMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFocusMode]);

  return (
    <section
      className={
        isFocusMode
          ? "fixed inset-0 z-50 overflow-y-auto bg-background/95 p-4 backdrop-blur md:p-8"
          : "rounded-3xl border bg-card p-5 shadow-sm"
      }
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget;
          const audioDuration = Number.isFinite(audio.duration)
            ? audio.duration
            : 0;

          setDuration(audioDuration);
          setReady(true);

          if (
            !didSeekInitialRef.current &&
            initialTimeSec > 0 &&
            initialTimeSec < audioDuration
          ) {
            audio.currentTime = initialTimeSec;
            setCurrentTime(initialTimeSec);
            didSeekInitialRef.current = true;
          }
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime || 0);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          saveCurrentTime();
        }}
        onEnded={() => {
          setIsPlaying(false);
          saveCurrentTime();
          onEnded();
        }}
      />

      <div
        className={
          isFocusMode
            ? "mx-auto flex min-h-[calc(100dvh-2rem)] max-w-3xl flex-col justify-center space-y-7"
            : "space-y-5"
        }
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsFocusMode((value) => !value)}
            className="rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            {isFocusMode ? "إغلاق التركيز" : "وضع التركيز"}
          </button>

          {isFocusMode ? (
            <div className="text-xs text-muted-foreground">
              اضغط Esc للخروج
            </div>
          ) : null}
        </div>

        <div className="text-center">
          <div className="text-sm text-muted-foreground">مشغل الدرس الصوتي</div>
          <div
            className={
              isFocusMode
                ? "mt-2 text-2xl font-bold md:text-3xl"
                : "mt-1 text-lg font-semibold"
            }
          >
            {isPlaying ? "جاري الاستماع الآن" : "جاهز للاستماع"}
          </div>
        </div>

        <div className="space-y-2" dir="rtl">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={1}
            value={currentTime}
            disabled={!ready || !duration}
            onChange={(event) => seekTo(Number(event.target.value))}
            className="w-full accent-primary disabled:opacity-50"
            aria-label="تقدم الدرس الصوتي"
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => skipBy(-10)}
            disabled={!ready}
            className={
              isFocusMode
                ? "rounded-full border px-5 py-4 text-base font-semibold transition hover:bg-muted disabled:opacity-50"
                : "rounded-full border px-4 py-3 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
            }
          >
            -10 ث
          </button>

          <button
            type="button"
            onClick={togglePlay}
            disabled={!ready}
            className={
              isFocusMode
                ? "grid h-24 w-24 place-items-center rounded-full bg-primary text-3xl font-bold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
                : "grid h-16 w-16 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            }
            aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
          >
            {isPlaying ? "Ⅱ" : "▶"}
          </button>

          <button
            type="button"
            onClick={() => skipBy(10)}
            disabled={!ready}
            className={
              isFocusMode
                ? "rounded-full border px-5 py-4 text-base font-semibold transition hover:bg-muted disabled:opacity-50"
                : "rounded-full border px-4 py-3 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
            }
          >
            +10 ث
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={saveCurrentTime}
            disabled={!ready}
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            حفظ موضع التقدم
          </button>

          {lastSavedAtSec !== null ? (
            <div className="text-xs text-muted-foreground">
              تم حفظ الموضع عند {formatTime(lastSavedAtSec)}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              اضغط حفظ للرجوع إلى هذا الموضع لاحقًا
            </div>
          )}
        </div>

        <div className="grid gap-5 rounded-2xl bg-muted/40 p-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium">الصوت</div>

            <div className="flex items-center gap-3" dir="rtl">
              <span className="text-xs text-muted-foreground">0</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="w-full accent-primary"
                aria-label="مستوى الصوت"
              />
              <span className="text-xs text-muted-foreground">100</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">سرعة التشغيل</div>

            <div className="flex flex-wrap gap-2">
              {[1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  className={
                    playbackRate === rate
                      ? "rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                      : "rounded-full border px-3 py-2 text-sm font-semibold hover:bg-muted"
                  }
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}