"use client";

import { useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { useCreateFolder } from "@/hooks/use-files";
import { useFileStore } from "@/store/file-store";
import { FolderPlus, Loader2, X } from "lucide-react";

interface NewFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewFolderDialog({ open, onOpenChange }: NewFolderDialogProps) {
  const { t } = useTranslation();
  const { currentPrefix, currentBucketId } = useFileStore();
  const [name, setName] = useState("");
  const createFolder = useCreateFolder();

  const handleCreate = async () => {
    if (!name.trim()) return;

    const folderKey = currentPrefix + name.trim() + "/";
    
    try {
      await createFolder.mutateAsync({ key: folderKey, bucketId: currentBucketId });
      setName("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreate();
    }
  };

  const handleClose = () => {
    setName("");
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-overlay-primary backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-bg-panel rounded-xl border border-border-subtle p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-indigo/10 flex items-center justify-center">
              <FolderPlus className="h-5 w-5 text-brand-indigo" />
            </div>
            <h2 className="text-base font-medium text-text-primary">{t("files.newFolder")}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-hover-bg transition-colors"
          >
            <X className="h-4 w-4 text-text-tertiary" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {t("files.folderName")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("files.folderName")}
              className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-subtle text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand-indigo"
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg bg-hover-bg text-text-secondary font-medium hover:bg-surface-elevated transition-colors"
            >
              {t("files.cancel")}
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || createFolder.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-brand-indigo text-white font-medium hover:bg-accent-violet transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createFolder.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("files.create")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
