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
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-indigo flex items-center justify-center">
            <span className="text-white font-medium text-sm">S3</span>
          </div>
          <h1 className="text-sm font-medium text-text-primary hidden sm:block" style={{ letterSpacing: "-0.13px" }}>S3 Manager</h1>
        </Link>
        <BucketSelector currentBucketId={currentBucketId ?? undefined} onBucketChange={setCurrentBucketId} />
      </div>

      <div className="flex-1 max-w-md mx-auto relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
        <Input
          placeholder={t("common.search")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 bg-hover-bg border-border-subtle text-text-primary placeholder:text-text-quaternary focus:border-brand-indigo"
        />
      </div>

      <div className="flex items-center">
        <UserMenu />
      </div>
    </header>
  );
}
