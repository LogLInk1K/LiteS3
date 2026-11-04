"use client";

import { useState, useEffect } from "react";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { FileOrFolder, useFileStore } from "@/store/file-store";
import { FileIcon, FolderIcon } from "./file-icon";
import { Thumbnail } from "./thumbnail";
import { isThumbnailable } from "@/hooks/use-thumbnail";
import { Check } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

interface FileListItemProps {
  item: FileOrFolder;
  thumbnailUrl?: string;
}

export function FileListItem({ item, thumbnailUrl }: FileListItemProps) {
  const { navigateToFolder, setPreviewItem, selectedItems, toggleSelect, openContextMenu } = useFileStore();
  const { language } = useTranslation();
  const isSelected = selectedItems.has(item.key);
  const isFolder = item.type === "folder";
  const hasThumbnail = !isFolder && isThumbnailable(item.name);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const handleRowClick = (e: React.MouseEvent) => {
    toggleSelect(item.key);
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        "group flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 cursor-pointer",
        !isSelected && "hover:bg-hover-bg",
        isSelected && "bg-accent-violet/10"
      )}
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 40px" }}
      onClick={handleRowClick}
      onContextMenu={handleContextMenu}
    >
      <div onClick={handleSelect}>
        <div
          className={cn(
            "h-5 w-5 rounded transition-all duration-150 flex items-center justify-center shrink-0",
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

      {isFolder ? (
        <FolderIcon className="h-5 w-5 text-brand-indigo shrink-0" />
      ) : hasThumbnail ? (
        <Thumbnail name={item.name} src={thumbnailUrl} size="list" />
      ) : (
        <FileIcon name={item.name} className="h-5 w-5 text-text-tertiary shrink-0" />
      )}

      <div className="flex-1 min-w-0 flex items-center">
        <span 
          className="text-sm truncate text-text-primary hover:text-accent-violet transition-colors cursor-pointer inline-block"
          onClick={handleNameClick}
        >
          {item.name}
        </span>
      </div>

      {!isFolder && "size" in item && (
        <span className="text-xs text-text-tertiary w-20 text-right shrink-0">
          {formatBytes(item.size)}
        </span>
      )}

      {!isFolder && "lastModified" in item && (
        <span className="text-xs text-text-tertiary w-36 text-right shrink-0">
          {formatDate(item.lastModified, language === "en" ? "en-US" : "zh-CN")}
        </span>
      )}
    </div>
  );
}
