"use client";

import { memo, useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { cn, formatBytes } from "@/lib/utils";
import { FileOrFolder, useFileStore } from "@/store/file-store";
import { FileIcon, FolderIcon } from "./file-icon";
import { Thumbnail } from "./thumbnail";
import { isThumbnailable } from "@/hooks/use-thumbnail";
import { Check } from "lucide-react";

interface FileCardProps {
  item: FileOrFolder;
  thumbnailUrl?: string;
}

function FileCardView({ item, thumbnailUrl }: FileCardProps) {
  // Subscribed field by field: a card must not re-render because some other row got
  // selected, a dialog opened or the lightbox appeared.
  const isSelected = useFileStore((s) => s.selectedItems.has(item.key));
  const { navigateToFolder, setPreviewItem, toggleSelect, openContextMenu } = useFileStore(
    useShallow((s) => ({
      navigateToFolder: s.navigateToFolder,
      setPreviewItem: s.setPreviewItem,
      toggleSelect: s.toggleSelect,
      openContextMenu: s.openContextMenu,
    })),
  );
  const isFolder = item.type === "folder";
  const hasThumbnail = !isFolder && isThumbnailable(item.name);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const handleClick = () => {
    if (isFolder) {
      navigateToFolder(item.key);
    } else {
      setPreviewItem(item);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelect(item.key);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(item, e.clientX, e.clientY);
  };

  return (
    <div
      data-key={item.key}
      className={cn(
        "group relative rounded-lg p-(--card-pad) cursor-pointer transition-all duration-150",
        "bg-surface-elevated/50 border border-transparent",
        !isSelected && "hover:bg-hover-bg/50 hover:border-border-subtle",
        isSelected && "bg-accent-violet/10 border-accent-violet/50"
      )}
      style={{ 
        contentVisibility: "auto", 
        containIntrinsicSize: "auto var(--card-height)"
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div 
        className="absolute top-3 right-3 z-20" 
        onClick={handleSelect}
      >
        <div
          className={cn(
            "h-5 w-5 rounded transition-all duration-150 flex items-center justify-center",
            isSelected 
              ? "bg-accent-violet border-2 border-accent-violet" 
              : "bg-white dark:bg-surface-elevated border-2 border-gray-300 dark:border-gray-500",
            !isTouchDevice && !isSelected && "opacity-0 group-hover:opacity-100"
          )}
        >
          {isSelected && (
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center h-(--thumb-size)">
          {isFolder ? (
            <FolderIcon className="h-(--icon-size) w-(--icon-size) text-brand-indigo" />
          ) : hasThumbnail ? (
            <Thumbnail name={item.name} src={thumbnailUrl} size="card" />
          ) : (
            <FileIcon name={item.name} className="h-(--icon-size) w-(--icon-size) text-text-tertiary" />
          )}
        </div>

        <span 
          className="text-sm text-center truncate w-full text-text-primary"
          style={{ 
            fontFamily: "'Inter Variable', 'Inter', sans-serif",
            fontFeatureSettings: '"cv01", "ss03"',
            fontWeight: 510,
            fontSize: '14px'
          }}
        >
          {item.name}
        </span>
      </div>
    </div>
  );
}

/** Memoised so a parent re-render (or a marquee selection elsewhere) can't walk every card. */
export const FileCard = memo(FileCardView);

export function FileCardSkeleton() {
  return (
    <div className="rounded-lg p-(--card-pad) animate-pulse bg-surface-elevated border border-transparent">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center h-(--thumb-size)">
          <div className="h-(--icon-size) w-(--icon-size) rounded-lg bg-hover-bg" />
        </div>
        <div className="h-4 rounded w-3/4 bg-hover-bg" />
      </div>
    </div>
  );
}
