"use client";

import { useFileStore, FileOrFolder } from "@/store/file-store";
import { useFiles } from "@/hooks/use-files";
import { FileCard } from "./file-card";
import { FileListItem } from "./file-list-item";
import { LayoutGrid, List, ChevronRight, ChevronLeft, Home, Loader2, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { useRef } from "react";
import { useTranslation } from "@/hooks/use-translation";

const PAGE_SIZE = 30;

export function FileTable() {
  const {
    currentPrefix, pathStack, searchQuery, viewMode, currentPage,
    navigateUp, setCurrentPrefix, setViewMode, setCurrentPage,
  } = useFileStore();
  const { data, isLoading, error } = useFiles(currentPrefix);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const allItems: FileOrFolder[] = [
    ...(data?.folders || []),
    ...(data?.files || []),
  ];

  const filteredItems = searchQuery
    ? allItems.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allItems;

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pathParts = currentPrefix.split("/").filter(Boolean);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle bg-bg-panel">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (pathStack.length > 0) navigateUp();
          }}
          disabled={pathStack.length === 0}
          className="h-8 w-8 rounded-lg disabled:opacity-50"
        >
          <Home className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 text-sm text-text-quaternary overflow-x-auto flex-1">
          <button
            onClick={() => {
              setCurrentPrefix("");
              useFileStore.setState({ pathStack: [], currentPage: 1 });
            }}
            className="hover:text-text-primary transition-colors whitespace-nowrap"
          >
            Root
          </button>
          {pathParts.map((part, index) => {
            const prefix = pathParts.slice(0, index + 1).join("/") + "/";
            return (
              <span key={prefix} className="flex items-center gap-1 whitespace-nowrap">
                <ChevronRight className="h-3 w-3" />
                <button
                  onClick={() => {
                    setCurrentPrefix(prefix);
                    useFileStore.setState({
                      pathStack: pathParts.slice(0, index).map((_, i) =>
                        pathParts.slice(0, i).join("/") + "/"
                      ).filter(Boolean),
                      currentPage: 1,
                    });
                  }}
                  className="hover:text-text-primary transition-colors"
                >
                  {part}
                </button>
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-surface-elevated rounded-lg border border-border-subtle">
            <button
              onClick={() => setViewMode("grid")}
              className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
                viewMode === "grid" ? "bg-hover-bg text-text-primary" : "text-text-tertiary hover:bg-hover-bg"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
                viewMode === "list" ? "bg-hover-bg text-text-primary" : "text-text-tertiary hover:bg-hover-bg"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              // Handled by DropZone
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 h-9 rounded-md bg-brand-indigo text-white text-sm font-medium hover:bg-accent-violet transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("common.upload")}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 will-change-transform bg-bg-marketing">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-brand-indigo" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-text-primary text-lg">Failed to load</p>
              <p className="text-text-quaternary text-sm mt-1">{(error as Error).message}</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-text-quaternary">
            <p className="text-lg text-text-tertiary">{t("files.emptyFolder")}</p>
            <p className="text-sm mt-1">{t("files.dragDrop")}</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {pagedItems.map((item) => (
              <FileCard key={item.key} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3 px-3 py-2 text-xs text-text-quaternary border-b border-border-subtle">
              <div className="w-4" />
              <div className="h-5 w-5" />
              <span className="flex-1">{t("files.name")}</span>
              <span className="w-20 text-right">{t("files.size")}</span>
              <span className="w-36 text-right">{t("files.modified")}</span>
            </div>
            {pagedItems.map((item) => (
              <FileListItem key={item.key} item={item} />
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border-subtle bg-bg-panel">
          <span className="text-xs text-text-quaternary">
            {filteredItems.length} {t("files.items")}, {t("files.page")} {safePage}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(safePage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {generatePageNumbers(safePage, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-xs text-text-quaternary">…</span>
              ) : (
                <Button
                  key={p}
                  variant={safePage === p ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7 text-xs rounded-lg"
                  onClick={() => setCurrentPage(p as number)}
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function generatePageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);

  return pages;
}
