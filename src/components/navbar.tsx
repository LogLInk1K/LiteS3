"use client";

import { useFileStore } from "@/store/file-store";
import { Input } from "./ui/input";
import { Search } from "lucide-react";
import Link from "next/link";
import { BucketSelector } from "./bucket-selector";
import { UserMenu } from "./user-menu";
import { useTranslation } from "@/hooks/use-translation";

export function Navbar() {
  const { searchQuery, setSearchQuery, currentBucketId, setCurrentBucketId } = useFileStore();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-bg-panel/95 backdrop-blur supports-backdrop-filter:bg-bg-panel/60">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/icon.svg" alt="LiteS3" className="h-7 w-7 rounded-lg" />
          <h1 className="text-base font-medium text-text-primary hidden sm:block" style={{ letterSpacing: "-0.13px" }}>LiteS3</h1>
        </Link>
        <BucketSelector currentBucketId={currentBucketId ?? undefined} onBucketChange={setCurrentBucketId} />
      </div>

      {/* Narrow screens keep the row short: bucket name collapses to its icon and the hint text is trimmed */}
      <div className="w-28 shrink-0 min-w-0 sm:w-auto sm:flex-1 lg:flex lg:justify-center">
        <div className="w-full max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
          <Input
            placeholder={t("common.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-hover-bg border-border-subtle text-text-primary placeholder:text-text-quaternary focus:border-brand-indigo max-sm:placeholder:text-transparent"
          />
          {!searchQuery && (
            <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-text-quaternary pointer-events-none sm:hidden">
              {t("common.searchShort")}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center max-lg:shrink-0 lg:flex-1 lg:justify-end">
        <UserMenu />
      </div>
    </header>
  );
}
