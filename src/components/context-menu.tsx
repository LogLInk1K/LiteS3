"use client";

import { useEffect } from "react";
import { useFileStore } from "@/store/file-store";
import { useFileLink, useBuckets } from "@/hooks/use-files";
import { useTranslation } from "@/hooks/use-translation";
import { Pencil, Trash2, Copy, Move, Link, Download, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export function ContextMenu() {
  const { contextMenu, closeContextMenu, setPreviewItem, openRenameDialog, openMoveDialog, openCopyDialog, startDelete, currentBucketId } = useFileStore();
  const linkMutation = useFileLink();
  const { t } = useTranslation();
  const { data: bucketsData } = useBuckets();
  const buckets = bucketsData?.buckets || [];
  const currentBucket = buckets.find((b: { id: string }) => b.id === currentBucketId)
    || buckets.find((b: { isDefault: boolean }) => b.isDefault)
    || buckets[0];
  const isPublic = !!currentBucket?.publicUrl;

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => closeContextMenu();
    const handleScroll = () => closeContextMenu();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu();
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("scroll", handleScroll, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu, closeContextMenu]);

  if (!contextMenu) return null;

  const { item, x: rawX, y: rawY } = contextMenu;
  const isFolder = item.type === "folder";

  const menuWidth = 180;
  const menuHeight = isFolder ? 180 : 280;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const x = rawX + menuWidth > viewportWidth ? Math.max(0, rawX - menuWidth) : rawX;
  const y = rawY + menuHeight > viewportHeight ? Math.max(0, rawY - menuHeight) : rawY;

  const handleDelete = () => {
    closeContextMenu();
    startDelete([item.key]);
  };

  const handleCopyLink = async () => {
    closeContextMenu();
    const result = await linkMutation.mutateAsync({ key: item.key, bucketId: currentBucketId });
    if (result.url) {
      await navigator.clipboard.writeText(result.url);
    }
  };

  const handleDownload = async () => {
    closeContextMenu();
    const result = await linkMutation.mutateAsync({ key: item.key, bucketId: currentBucketId });
    if (result.url) {
      window.open(result.url, "_blank");
    }
  };

  const handlePreview = () => {
    closeContextMenu();
    setPreviewItem(item);
  };

  const handleRename = () => {
    openRenameDialog(item);
  };

  const handleMove = () => {
    openMoveDialog(item);
  };

  const handleCopy = () => {
    openCopyDialog(item);
  };

  return (
    <div
      className={cn(
        "fixed z-50 min-w-32 overflow-hidden rounded-lg border border-border-subtle bg-surface-elevated p-1 text-text-primary shadow-lg animate-in fade-in-0 zoom-in-95"
      )}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {!isFolder && (
        <>
          <MenuItem onClick={handlePreview}>
            <Eye className="mr-2 h-4 w-4" /> {t("files.preview")}
          </MenuItem>
          <MenuItem onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" /> {t("files.download")}
          </MenuItem>
          <MenuItem onClick={handleCopyLink}>
            <Link className="mr-2 h-4 w-4" /> {isPublic ? t("files.copyPublicLink") : t("files.copyTempLink")}
          </MenuItem>
          <MenuSeparator />
        </>
      )}
      <MenuItem onClick={handleRename}>
        <Pencil className="mr-2 h-4 w-4" /> {t("files.rename")}
      </MenuItem>
      <MenuItem onClick={handleMove}>
        <Move className="mr-2 h-4 w-4" /> {t("files.move")}
      </MenuItem>
      <MenuItem onClick={handleCopy}>
        <Copy className="mr-2 h-4 w-4" /> {t("files.copy")}
      </MenuItem>
      <MenuSeparator />
      <MenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
        <Trash2 className="mr-2 h-4 w-4" /> {t("files.delete")}
      </MenuItem>
    </div>
  );
}

function MenuItem({
  className,
  onClick,
  children,
}: {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-hover-bg text-text-secondary hover:text-text-primary",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function MenuSeparator() {
  return <div className="-mx-1 my-1 h-px bg-border-subtle" />;
}
