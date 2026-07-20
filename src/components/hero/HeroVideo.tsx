"use client";

// Full-screen autoplaying, looping, muted background video. Light fallback bg so
// the black hero text stays legible before the video decodes (or if blocked).
export function HeroVideo({ src }: { src: string }) {
  return (
    <video
      src={src}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      className="fixed inset-0 h-full w-full object-cover"
      style={{ zIndex: 0, backgroundColor: "#eeecec" }}
    />
  );
}
