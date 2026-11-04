"use client";

import { useState } from "react";
import { useFileStore } from "@/store/file-store";
import { Input } from "./ui/input";
import { Search } from "lucide-react";
import Link from "next/link";
import { BucketSelector } from "./bucket-selector";
import { UserMenu } from "./user-menu";
import { SearchOverlay } from "./search-overlay";
import { useTranslation } from "@/hooks/use-translation";

export function Navbar() {
  const { searchQuery, setSearchQuery, currentBucketId, setCurrentBucketId } = useFileStore();
  const { t } = useTranslation();
  // Below sm the field moves into a fixed overlay: an inline input would let the
  // on-screen keyboard resize the viewport and shove the sticky header around.
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 max-sm:gap-1 border-b border-border-subtle bg-bg-panel/95 backdrop-blur supports-backdrop-filter:bg-bg-panel/60">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/icon.svg" alt="LiteS3" className="h-7 w-7 rounded-lg" />
          <h1 className="text-base font-medium text-text-primary hidden sm:block" style={{ letterSpacing: "-0.13px" }}>LiteS3</h1>
        </Link>
        <div className="min-w-0 max-w-full">
          <BucketSelector currentBucketId={currentBucketId ?? undefined} onBucketChange={setCurrentBucketId} />
        </div>
      </div>

      <div className="min-w-0 max-sm:w-9 max-sm:shrink-0 sm:flex-1 lg:flex lg:justify-center">
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden max-sm:flex h-9 w-9 rounded-lg items-center justify-center text-text-tertiary hover:bg-hover-bg hover:text-text-secondary transition-colors"
        >
          <Search className="h-4 w-4" />
          <span className="sr-only">{t("common.search")}</span>
        </button>
        <div className="relative w-full max-w-md max-sm:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary pointer-events-none" />
          <Input
            placeholder={t("common.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") e.currentTarget.blur();
            }}
            className="pl-9 h-9 bg-hover-bg border-border-subtle text-text-primary placeholder:text-text-quaternary focus:border-brand-indigo"
          />
        </div>
      </div>

      <div className="flex items-center max-lg:shrink-0 lg:flex-1 lg:justify-end">
        <UserMenu />
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
