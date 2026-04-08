"use client";

import { isThumbnailable } from "@/hooks/use-thumbnail";
import { isVideoFile } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface ThumbnailProps {
  name: string;
  itemKey: string;
  size?: "card" | "list";
  className?: string;
}

export function Thumbnail({ name, itemKey, size = "card", className }: ThumbnailProps) {
  const enabled = isThumbnailable(name);
  const isVideo = isVideoFile(name);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px", threshold: 0 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [enabled]);

  if (!enabled) return null;

  const sizeClasses = size === "card"
    ? "h-20 w-20 object-cover rounded"
    : "h-8 w-8 object-cover rounded shrink-0";

  const thumbSize = size === "card" ? 200 : 64;
  const src = visible ? `/api/files/thumbnail?key=${encodeURIComponent(itemKey)}&size=${thumbSize}` : undefined;

  return (
    <div ref={ref} className={cn("relative overflow-hidden", size === "card" ? "h-20 w-20" : "h-8 w-8 shrink-0", className)}>
      {visible && !error ? (
        isVideo ? (
          <div className="relative">
            <img
              src={src}
              alt=""
              className={cn(sizeClasses, "bg-muted")}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
            />
            {loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-5 w-5 rounded-full bg-black/60 flex items-center justify-center">
                  <svg className="h-3 w-3 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ) : (
          <img
            src={src}
            alt=""
            className={cn(sizeClasses, "bg-muted")}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        )
      ) : (
        <div className={cn("flex items-center justify-center bg-muted rounded", sizeClasses)}>
          <span className="text-[8px] text-muted-foreground uppercase">
            {name.split(".").pop()}
          </span>
        </div>
      )}
    </div>
  );
}
