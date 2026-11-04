"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { useRenameFile } from "@/hooks/use-files";
import { useFileStore, FileOrFolder } from "@/store/file-store";
import { Pencil, Loader2, X, Check, AlertTriangle } from "lucide-react";

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FileOrFolder | null;
}

export function RenameDialog({ open, onOpenChange, item }: RenameDialogProps) {
  const { t } = useTranslation();
  const currentPrefix = useFileStore((s) => s.currentPrefix);
  const currentBucketId = useFileStore((s) => s.currentBucketId);
  const [name, setName] = useState("");
  const [operationStatus, setOperationStatus] = useState<"editing" | "processing" | "complete" | "error">("editing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const renameFile = useRenameFile();

  useEffect(() => {
    if (item) {
      setName(item.name);
      setOperationStatus("editing");
      setErrorMessage(null);
    }
  }, [item]);

  const handleRename = async () => {
    if (!item || !name.trim() || name === item.name) return;

    const isFolder = item.type === "folder";
    const sourceKey = item.key;
    let destKey: string;

    if (isFolder) {
      const parentPath = sourceKey.slice(0, -item.name.length - 1);
      destKey = parentPath + name.trim() + "/";
    } else {
      destKey = currentPrefix + name.trim();
    }

    setOperationStatus("processing");
    try {
      await renameFile.mutateAsync({ sourceKey, destKey, bucketId: currentBucketId });
      setOperationStatus("complete");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Rename failed");
      setOperationStatus("error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && operationStatus === "editing") {
      handleRename();
    }
  };

  const handleClose = () => {
    if (operationStatus !== "processing") {
      onOpenChange(false);
    }
  };

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 bg-overlay-primary backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={handleClose}>
      <div className="w-full max-w-sm bg-bg-panel rounded-xl border border-border-subtle p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-indigo/10 flex items-center justify-center">
              {operationStatus === "processing" ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand-indigo" />
              ) : operationStatus === "complete" ? (
                <Check className="h-5 w-5 text-success-green" />
              ) : operationStatus === "error" ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <Pencil className="h-5 w-5 text-brand-indigo" />
              )}
            </div>
            <h2 className="text-base font-medium text-text-primary">
              {operationStatus === "editing" ? t("files.rename")
                : operationStatus === "processing" ? t("files.renaming")
                : operationStatus === "complete" ? t("files.renameComplete")
                : t("files.operationFailed")}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-hover-bg transition-colors"
          >
            <X className="h-4 w-4 text-text-tertiary" />
          </button>
        </div>

        {operationStatus === "editing" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t("files.newName")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("files.newName")}
                className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-subtle text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand-indigo"
                autoFocus
                onFocus={(e) => {
                  const lastDot = name.lastIndexOf(".");
                  if (lastDot > 0) {
                    e.target.setSelectionRange(0, lastDot);
                  } else {
                    e.target.select();
                  }
                }}
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
                onClick={handleRename}
                disabled={!name.trim() || name === item?.name}
                className="flex-1 px-4 py-2 rounded-lg bg-brand-indigo text-white font-medium hover:bg-accent-violet transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("files.rename")}
              </button>
            </div>
          </div>
        )}

        {operationStatus === "processing" && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-3 text-text-tertiary">
              <Loader2 className="h-5 w-5 animate-spin text-brand-indigo" />
              <span className="text-sm">
                {item.type === "folder" ? t("files.renamingFolder") : t("files.renaming")}
              </span>
            </div>
          </div>
        )}

        {operationStatus === "complete" && (
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 rounded-lg bg-brand-indigo text-white font-medium hover:bg-accent-violet transition-colors"
          >
            {t("files.confirm")}
          </button>
        )}

        {operationStatus === "error" && (
          <div className="space-y-4">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 rounded-lg bg-brand-indigo text-white font-medium hover:bg-accent-violet transition-colors"
            >
              {t("files.confirm")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
