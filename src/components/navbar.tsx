"use client";

import { useFileStore } from "@/store/file-store";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search, UploadCloud, Moon, Sun, LogOut, Server } from "lucide-react";
import { useTheme } from "./theme-provider";
import { useRef } from "react";
import { signOut } from "next-auth/react";
import { Tooltip } from "./ui/tooltip";
import Link from "next/link";
import { BucketSelector } from "./bucket-selector";

export function Navbar() {
  const { searchQuery, setSearchQuery } = useFileStore();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-border-standard bg-bg-panel/95 backdrop-blur supports-backdrop-filter:bg-bg-panel/60">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-indigo flex items-center justify-center">
            <span className="text-white font-medium text-sm">S3</span>
          </div>
          <h1 className="text-base font-medium text-text-primary hidden sm:block">S3 Manager</h1>
        </Link>
        <BucketSelector />
      </div>

      <div className="flex-1 max-w-md mx-auto relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 bg-hover-bg border-border-standard text-text-primary placeholder-text-quaternary focus:border-brand-indigo"
        />
      </div>

      <div className="flex items-center gap-1">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            // Handled by DropZone
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 w-8 rounded-lg hover:bg-hover-bg"
        >
          <UploadCloud className="h-4 w-4 text-text-tertiary" />
        </Button>
        <Link href="/buckets">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-hover-bg"
          >
            <Server className="h-4 w-4 text-text-tertiary" />
          </Button>
        </Link>
        <Tooltip content="Toggle theme" side="bottom">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 rounded-lg hover:bg-hover-bg"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-text-tertiary" /> : <Moon className="h-4 w-4 text-text-tertiary" />}
          </Button>
        </Tooltip>
        <Tooltip content="Sign out" side="bottom">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="h-8 w-8 rounded-lg hover:bg-hover-bg"
          >
            <LogOut className="h-4 w-4 text-text-tertiary" />
          </Button>
        </Tooltip>
      </div>
    </header>
  );
}
