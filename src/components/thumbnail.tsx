"use client";

import { isAudioFile, isVideoFile } from "@/hooks/use-thumbnail";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { Music, Play } from "lucide-react";

interface ThumbnailProps {
  name: string;
  src?: string;
  size?: "card" | "list";
  className?: string;
}

/** Front-end replica of the old server-generated cover: dark tile + indigo glyph. */
function MediaCover({ name, size }: { name: string; size: "card" | "list" }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        size === "card" ? "h-(--thumb-size) w-(--thumb-size) rounded-lg" : "h-8 w-8 rounded"
      )}
      style={{ backgroundColor: "#1a1a2e" }}
    >
      {isVideoFile(name) ? (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
          <polygon points="35,25 35,75 70,50" fill="#6366f1" />
        </svg>
      ) : (
        <Music
          className={cn("text-[#6366f1]", size === "card" ? "h-(--glyph-size) w-(--glyph-size)" : "h-4 w-4")}
          strokeWidth={2}
        />
      )}
    </div>
  );
}

export function Thumbnail({ name, src, size = "card", className }: ThumbnailProps) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src || !ref.current) return;

    // Start loading a bit before the item enters the viewport so most images
    // are already decoded by the time the user actually sees them.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px 0px", threshold: 0 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [src]);

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  // A cached image can finish before React attaches onLoad.
  useEffect(() => {
    const img = imgRef.current;
    if (visible && img?.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [visible, src]);

  const sizeClasses = size === "card"
    ? "max-h-(--thumb-size) max-w-full object-contain rounded-lg"
    : "h-8 w-8 object-cover rounded shrink-0";

  const loading = visible && !!src && !loaded && !error;
  const showImage = visible && !!src && !error;
  const showPlaceholder = !loaded || !src || error;
  const showCover = !src && (isVideoFile(name) || isAudioFile(name));

  return (
    <div ref={ref} className={cn("relative overflow-hidden flex items-center justify-center", size === "card" ? "h-(--thumb-size) w-full min-w-(--thumb-size)" : "h-8 w-8 shrink-0", className)}>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-0 flex items-center justify-center transition-opacity duration-300",
          showPlaceholder ? "opacity-100" : "opacity-0"
        )}
      >
        {showCover ? (
          <MediaCover name={name} size={size} />
        ) : (
          <div className={cn("flex items-center justify-center rounded-lg", size === "card" ? "h-(--icon-size) w-(--icon-size)" : "h-8 w-8", "bg-hover-bg", loading && "animate-pulse")}>
            {isVideoFile(name) ? (
              <Play className="h-4 w-4 text-text-tertiary" fill="currentColor" />
            ) : isAudioFile(name) ? (
              <Music className="h-4 w-4 text-text-tertiary" />
            ) : (
              <span className="text-[10px] text-text-tertiary uppercase font-medium">
                {name.split(".").pop()}
              </span>
            )}
          </div>
        )}
      </div>

      {showImage && (
        <img
          ref={imgRef}
          src={src}
          alt=""
          className={cn(sizeClasses, "relative z-10 transition-opacity duration-300 ease-out", loaded ? "opacity-100" : "opacity-0")}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}
