"use client";

import { useFileStore, FileOrFolder } from "@/store/file-store";
import { useFiles, useMoveFile, useCopyFile } from "@/hooks/use-files";
import { useUpload } from "@/hooks/use-upload";
import { useSelectionBox } from "@/hooks/use-selection-box";
import { useFileLink } from "@/hooks/use-files";
import { FileCard, FileCardSkeleton } from "./file-card";
import { FileListItem } from "./file-list-item";
import { NewFolderDialog } from "./dialogs/new-folder-dialog";
import { RenameDialog } from "./dialogs/rename-dialog";
import { MoveCopyDialog } from "./dialogs/move-copy-dialog";
import { DeleteProgressDialog } from "./dialogs/delete-progress-dialog";
import { LayoutGrid, List, ChevronRight, ChevronLeft, HardDrive, Upload, X, Download, Move, Copy, Trash2, FolderPlus, RotateCw } from "lucide-react";
import { Button } from "./ui/button";
import { useRef, useCallback, useState, useEffect } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 30;

export function FileTable() {
  const {
    currentBucketId, currentPrefix, pathStack, searchQuery, viewMode, currentPage,
    navigateUp, setCurrentPrefix, setViewMode, setCurrentPage,
    setSelectedItems, selectedItems, clearSelection,
    renameItem, closeRenameDialog,
    moveCopyItem, moveCopyMode, closeMoveCopyDialog,
    batchMoveCopyItems, openBatchMoveDialog, openBatchCopyDialog,
    newFolderOpen, openNewFolderDialog, closeNewFolderDialog,
    deleteItems, deleteDialogOpen, startDelete, closeDeleteDialog,
  } = useFileStore();
  const { data, isLoading, error } = useFiles(currentPrefix, currentBucketId);
  const { activeUploads, uploadFiles, removeUpload } = useUpload();
  const linkMutation = useFileLink();
  const moveMutation = useMoveFile();
  const copyMutation = useCopyFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rotation, setRotation] = useState(0);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setRotation(prev => prev + 360);
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["files"] });
    setTimeout(() => setIsRefreshing(false), 300);
  }, [isRefreshing, queryClient]);

  const selectedCount = selectedItems.size;

  const handleSelectionChange = useCallback(
    (selectedKeys: Set<string>) => {
      setSelectedItems(selectedKeys);
    },
    [setSelectedItems]
  );

  const { selectionBox } = useSelectionBox({
    containerRef,
    itemSelectors: "[data-key]",
    onSelectionChange: handleSelectionChange,
  });

  const allItems: FileOrFolder[] = [
    ...(data?.folders || []),
    ...(data?.files || []),
  ];

  const uniqueItems = allItems.filter((item, index, self) =>
    index === self.findIndex((i) => i.key === item.key)
  );

  const filteredItems = searchQuery
    ? uniqueItems.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : uniqueItems;

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pathParts = currentPrefix.split("/").filter(Boolean);

  const handleBatchDownload = async () => {
    const keys = Array.from(selectedItems);
    for (const key of keys) {
      const result = await linkMutation.mutateAsync({ key, bucketId: currentBucketId });
      if (result.url) {
        window.open(result.url, "_blank");
      }
    }
  };

  const handleBatchDelete = () => {
    const keys = Array.from(selectedItems);
    if (keys.length === 0) return;
    startDelete(keys);
    clearSelection();
  };

  const handleBatchMove = () => {
    const keys = Array.from(selectedItems);
    if (keys.length === 0) return;
    openBatchMoveDialog(keys);
    clearSelection();
  };

  const handleBatchCopy = () => {
    const keys = Array.from(selectedItems);
    if (keys.length === 0) return;
    openBatchCopyDialog(keys);
    clearSelection();
  };

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
          <HardDrive className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 text-sm text-text-quaternary overflow-x-auto flex-1">
          <button
            onClick={() => {
              setCurrentPrefix("");
              useFileStore.setState({ pathStack: [], currentPage: 1 });
            }}
            className="hover:text-text-primary transition-colors whitespace-nowrap"
          >
            {t("files.root")}
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
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 rounded-md border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors flex items-center justify-center disabled:opacity-50"
            title={t("files.refresh") || "Refresh"}
          >
            <RotateCw 
              className="h-4 w-4 transition-transform duration-500 ease-out" 
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </button>
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
          <button
            onClick={openNewFolderDialog}
            className="flex items-center gap-1.5 px-3 h-9 rounded-md border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-hover-bg text-sm transition-colors"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("files.newFolder")}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                uploadFiles(e.target.files);
                e.target.value = "";
              }
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

      <div 
        className={cn(
          "flex items-center gap-2 px-4 bg-surface-elevated border-b border-border-subtle overflow-hidden transition-all duration-200 ease-out",
          selectedCount > 0 ? "max-h-14 py-2 opacity-100" : "max-h-0 py-0 opacity-0 border-b-0"
        )}
      >
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-accent-violet/10">
          <span className="text-sm text-accent-violet font-medium">
            {selectedCount}
          </span>
        </div>
        <span className="text-sm text-text-secondary">
          {t("files.selected")}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button
            onClick={handleBatchDownload}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t("files.download")}</span>
          </button>
          <button
            onClick={handleBatchMove}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors"
          >
            <Move className="h-3.5 w-3.5" />
            <span>{t("files.move")}</span>
          </button>
          <button
            onClick={handleBatchCopy}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>{t("files.copy")}</span>
          </button>
          <button
            onClick={handleBatchDelete}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t("files.delete")}</span>
          </button>
        </div>
        <div className="w-px h-4 bg-border-subtle mx-1" />
        <button
          onClick={clearSelection}
          className="flex items-center justify-center h-7 w-7 rounded-md text-text-tertiary hover:text-text-primary hover:bg-hover-bg transition-colors"
          title={t("files.clearSelection")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4 will-change-transform bg-bg-marketing relative select-none"
      >
        {isLoading || isRefreshing ? (
          <div 
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <FileCardSkeleton key={i} />
            ))}
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
          <div 
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
          >
            {pagedItems.map((item) => (
              <FileCard key={item.key} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
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

        {selectionBox && (
          <div
            className="absolute bg-accent-violet/20 border border-accent-violet pointer-events-none"
            style={{
              left: Math.min(selectionBox.startX, selectionBox.endX),
              top: Math.min(selectionBox.startY, selectionBox.endY),
              width: Math.abs(selectionBox.endX - selectionBox.startX),
              height: Math.abs(selectionBox.endY - selectionBox.startY),
            }}
          />
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

      <NewFolderDialog open={newFolderOpen} onOpenChange={closeNewFolderDialog} />
      <RenameDialog open={!!renameItem} onOpenChange={closeRenameDialog} item={renameItem} />
      <MoveCopyDialog 
        open={!!moveCopyItem || batchMoveCopyItems.length > 0} 
        onOpenChange={closeMoveCopyDialog} 
        item={moveCopyItem} 
        mode={moveCopyMode} 
        batchItems={batchMoveCopyItems}
      />
      <DeleteProgressDialog open={deleteDialogOpen} onOpenChange={closeDeleteDialog} items={deleteItems} />
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
