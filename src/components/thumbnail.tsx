"use client";

import { isVideoFile } from "@/hooks/use-thumbnail";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { Play } from "lucide-react";

interface ThumbnailProps {
  name: string;
  src?: string;
  size?: "card" | "list";
  className?: string;
}

export function Thumbnail({ name, src, size = "card", className }: ThumbnailProps) {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setError(false);
    if (!src || !ref.current) return;

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
  }, [src]);

  const sizeClasses = size === "card"
    ? "max-h-20 max-w-full object-contain rounded-lg"
    : "h-8 w-8 object-cover rounded shrink-0";

  const showImage = visible && !!src && !error;

  return (
    <div ref={ref} className={cn("relative overflow-hidden flex items-center justify-center", size === "card" ? "h-20 w-full" : "h-8 w-8 shrink-0", className)}>
      {showImage ? (
        <img
          src={src}
          alt=""
          className={cn(sizeClasses, "bg-surface-elevated")}
          loading="lazy"
          decoding="async"
          onError={() => setError(true)}
        />
      ) : (
        <div className={cn("flex items-center justify-center rounded-lg", size === "card" ? "h-12 w-12" : "h-8 w-8", "bg-hover-bg")}>
          {isVideoFile(name) ? (
            <Play className="h-4 w-4 text-text-tertiary" fill="currentColor" />
          ) : (
            <span className="text-[10px] text-text-tertiary uppercase font-medium">
              {name.split(".").pop()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
