"use client";

import { useEffect, useRef } from "react";

// Full-screen background video that scrubs forward/backward with horizontal
// mouse movement. It never autoplays; frames are seeked directly. An onSeeked
// queue coalesces requests so we don't flood the decoder while dragging.
const SENSITIVITY = 0.8;

export function ScrubVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const prevX = useRef<number | null>(null);
  const targetTime = useRef(0);
  const seeking = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const onMove = (e: MouseEvent) => {
      const dur = v.duration;
      if (!dur || Number.isNaN(dur)) return;
      if (prevX.current == null) {
        prevX.current = e.clientX;
        return;
      }
      const delta = e.clientX - prevX.current;
      prevX.current = e.clientX;

      let t = targetTime.current + (delta / window.innerWidth) * SENSITIVITY * dur;
      t = Math.max(0, Math.min(dur, t));
      targetTime.current = t;

      if (!seeking.current) {
        seeking.current = true;
        v.currentTime = t;
      }
    };

    const onSeeked = () => {
      // If the target moved while we were seeking, chase it; otherwise idle.
      if (Math.abs(v.currentTime - targetTime.current) > 0.01) {
        v.currentTime = targetTime.current;
      } else {
        seeking.current = false;
      }
    };

    window.addEventListener("mousemove", onMove);
    v.addEventListener("seeked", onSeeked);
    return () => {
      window.removeEventListener("mousemove", onMove);
      v.removeEventListener("seeked", onSeeked);
    };
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      muted
      playsInline
      preload="auto"
      className="fixed inset-0 h-full w-full object-cover"
      style={{
        zIndex: 0,
        objectPosition: "70% center",
        // Light fallback so the black hero text stays legible before the video
        // decodes (or if the asset fails to load).
        backgroundColor: "#c9c7c2",
      }}
    />
  );
}
