"use client";

import { useState } from "react";
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
  // Only drives the narrow-screen swap; at sm and up the classes below are inert.
  const [searchExpanded, setSearchExpanded] = useState(false);

  const collapseSearch = () => {
    if (!searchQuery) setSearchExpanded(false);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 max-sm:gap-1 border-b border-border-subtle bg-bg-panel/95 backdrop-blur supports-backdrop-filter:bg-bg-panel/60">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/icon.svg" alt="LiteS3" className="h-7 w-7 rounded-lg" />
          <h1 className="text-base font-medium text-text-primary hidden sm:block" style={{ letterSpacing: "-0.13px" }}>LiteS3</h1>
        </Link>
        <div
          className={`min-w-0 max-w-full max-sm:transition-[max-width,opacity] max-sm:duration-300 max-sm:ease-out ${
            searchExpanded
              ? "max-sm:max-w-0 max-sm:opacity-0 max-sm:overflow-x-clip max-sm:pointer-events-none"
              : "max-sm:max-w-72 max-sm:opacity-100"
          }`}
        >
          <BucketSelector currentBucketId={currentBucketId ?? undefined} onBucketChange={setCurrentBucketId} />
        </div>
      </div>

      <div
        className={`min-w-0 sm:flex-1 lg:flex lg:justify-center max-sm:shrink-0 max-sm:transition-[width] max-sm:duration-300 max-sm:ease-out ${
          searchExpanded ? "max-sm:w-44" : "max-sm:w-9"
        }`}
      >
        <div className="w-full max-w-md relative">
          {/* Collapsed on narrow screens the field is just an icon button, so centre the glyph like its neighbours */}
          <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary pointer-events-none max-sm:transition-[left] max-sm:duration-300 max-sm:ease-out ${searchExpanded ? "left-3" : "left-3 max-sm:left-2.5"}`} />
          <Input
            placeholder={t("common.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchExpanded(true)}
            onBlur={collapseSearch}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.currentTarget.blur();
                setSearchExpanded(false);
              }
            }}
            className={`pl-9 h-9 bg-hover-bg border-border-subtle text-text-primary placeholder:text-text-quaternary focus:border-brand-indigo ${searchExpanded ? "" : "max-sm:bg-transparent max-sm:border-transparent"}`}
          />
        </div>
      </div>

      <div className="flex items-center max-lg:shrink-0 lg:flex-1 lg:justify-end">
        <UserMenu />
      </div>
    </header>
  );
}
