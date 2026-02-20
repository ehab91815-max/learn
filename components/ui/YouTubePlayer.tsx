/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeIFrameApi(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve, reject) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => reject(new Error("Failed to load YouTube IFrame API"));
      document.head.appendChild(s);
    }

    window.onYouTubeIframeAPIReady = () => resolve();
  });

  return ytApiPromise;
}

export default function YouTubePlayer({
  videoId,
  initialTimeSec,
  onTick,
  onEnded,
}: {
  videoId: string;
  initialTimeSec: number;
  onTick: (currentTimeSec: number) => void;
  onEnded: () => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const tickRef = useRef<number | null>(null);
  const didSeekRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await loadYouTubeIFrameApi();
      if (cancelled) return;
      if (!hostRef.current) return;

      // امسح أي player سابق
      try {
        playerRef.current?.destroy?.();
      } catch {}

      didSeekRef.current = false;

      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            // Seek مرة واحدة فقط
            if (!didSeekRef.current && initialTimeSec > 0) {
              try {
                playerRef.current.seekTo(initialTimeSec, true);
              } catch {}
              didSeekRef.current = true;
            }
          },
          onStateChange: (e: any) => {
            const YT = window.YT;
            if (!YT) return;

            // PLAYING
            if (e.data === YT.PlayerState.PLAYING) {
              if (tickRef.current) window.clearInterval(tickRef.current);
              tickRef.current = window.setInterval(() => {
                try {
                  const t = playerRef.current?.getCurrentTime?.() ?? 0;
                  onTick(Math.floor(t));
                } catch {}
              }, 15000);
            }

            // PAUSED
            if (e.data === YT.PlayerState.PAUSED) {
              if (tickRef.current) window.clearInterval(tickRef.current);
              tickRef.current = null;
              try {
                const t = playerRef.current?.getCurrentTime?.() ?? 0;
                onTick(Math.floor(t));
              } catch {}
            }

            // ENDED
            if (e.data === YT.PlayerState.ENDED) {
              if (tickRef.current) window.clearInterval(tickRef.current);
              tickRef.current = null;
              try {
                const t = playerRef.current?.getCurrentTime?.() ?? 0;
                onTick(Math.floor(t));
              } catch {}
              onEnded();
            }
          },
        },
      });
    })();

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        try {
          const t = playerRef.current?.getCurrentTime?.() ?? 0;
          onTick(Math.floor(t));
        } catch {}
      }
    };

    window.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.removeEventListener("visibilitychange", onVis);
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
      try {
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;
    };
  }, [videoId, initialTimeSec, onTick, onEnded]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}
