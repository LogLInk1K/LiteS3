"use client";

import { useFileStore, FileOrFolder } from "@/store/file-store";
import { useFiles } from "@/hooks/use-files";
import { FileCard } from "./file-card";
import { FileListItem } from "./file-list-item";
import { cn } from "@/lib/utils";
import { LayoutGrid, List, ChevronRight, ChevronLeft, Home, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

const PAGE_SIZE = 30;

export function FileTable() {
  const {
    currentPrefix, pathStack, searchQuery, viewMode, currentPage,
    navigateUp, setCurrentPrefix, setViewMode, setCurrentPage,
  } = useFileStore();
  const { data, isLoading, error } = useFiles(currentPrefix);

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
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (pathStack.length > 0) navigateUp();
          }}
          disabled={pathStack.length === 0}
        >
          <Home className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto flex-1">
          <button
            onClick={() => {
              setCurrentPrefix("");
              useFileStore.setState({ pathStack: [], currentPage: 1 });
            }}
            className="hover:text-foreground transition-colors whitespace-nowrap"
          >
            根目录
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
                  className="hover:text-foreground transition-colors"
                >
                  {part}
                </button>
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 will-change-transform">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-destructive">
            加载失败: {(error as Error).message}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-lg">空文件夹</p>
            <p className="text-sm mt-1">拖拽文件到此处上传</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {pagedItems.map((item) => (
              <FileCard key={item.key} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground border-b">
              <div className="w-4" />
              <div className="h-5 w-5" />
              <span className="flex-1">名称</span>
              <span className="w-20 text-right">大小</span>
              <span className="w-36 text-right">修改时间</span>
            </div>
            {pagedItems.map((item) => (
              <FileListItem key={item.key} item={item} />
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t bg-background">
          <span className="text-xs text-muted-foreground">
            共 {filteredItems.length} 项，第 {safePage}/{totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(safePage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {generatePageNumbers(safePage, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
              ) : (
                <Button
                  key={p}
                  variant={safePage === p ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7 text-xs"
                  onClick={() => setCurrentPage(p as number)}
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
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
