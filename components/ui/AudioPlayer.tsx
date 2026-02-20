// components/AudioPlayer.tsx
"use client";

import { useEffect, useRef, useState } from "react";

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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onLoaded = () => {
      try {
        if (initialTimeSec > 0 && initialTimeSec < a.duration) {
          a.currentTime = initialTimeSec;
        }
      } catch {}
      setReady(true);
    };

    a.addEventListener("loadedmetadata", onLoaded);
    return () => a.removeEventListener("loadedmetadata", onLoaded);
  }, [initialTimeSec]);

  useEffect(() => {
    if (!ready) return;
    const a = audioRef.current;
    if (!a) return;

    const interval = setInterval(() => {
      if (!a.paused && !a.ended) onTick(a.currentTime || 0);
    }, 15000);

    const onPause = () => onTick(a.currentTime || 0);
    const onVis = () => {
      if (document.visibilityState === "hidden") onTick(a.currentTime || 0);
    };
    const onBeforeUnload = () => onTick(a.currentTime || 0);

    a.addEventListener("pause", onPause);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      clearInterval(interval);
      a.removeEventListener("pause", onPause);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [ready, onTick]);

  return (
    <audio
      ref={audioRef}
      controls
      src={src}
      onEnded={onEnded}
      className="w-full"
    />
  );
}
