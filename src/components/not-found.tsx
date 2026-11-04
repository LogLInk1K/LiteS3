"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeMenu } from "./theme-menu";
import { useTranslation } from "@/hooks/use-translation";

interface NotFoundProps {
  showRedirect?: boolean;
  redirectDelay?: number;
  redirectPath?: string;
}

export function NotFound({
  showRedirect = true,
  redirectDelay = 3,
  redirectPath = "/",
}: NotFoundProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [countdown, setCountdown] = useState(redirectDelay);

  useEffect(() => {
    if (!showRedirect) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [showRedirect]);

  useEffect(() => {
    if (countdown === 0 && showRedirect) {
      router.push(redirectPath);
    }
  }, [countdown, showRedirect, redirectPath, router]);

  return (
    <div className="min-h-screen bg-bg-marketing flex items-center justify-center p-4">
      {/* Offsets mirror the navbar (py-3 / px-4) so the cluster sits where it does when signed in. */}
      <div className="fixed top-3 right-4 z-50">
        <ThemeMenu />
      </div>
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="text-[120px] font-medium text-text-quaternary leading-none select-none" style={{ letterSpacing: "-0.05em" }}>
            404
          </div>
        </div>
        <h1 className="text-xl font-medium text-text-primary mb-2">
          {t("notFound.title")}
        </h1>
        <p className="text-text-tertiary text-sm mb-6">
          {t("notFound.description")}
        </p>
        {showRedirect && (
          <div className="flex items-center justify-center gap-2 text-text-quaternary text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-indigo animate-pulse" />
            <span>{t("notFound.redirecting", { seconds: countdown })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
