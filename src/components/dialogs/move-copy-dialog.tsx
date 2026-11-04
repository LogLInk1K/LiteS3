"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { useFiles, useMoveFile, useCopyFile } from "@/hooks/use-files";
import { useFileStore, FileOrFolder } from "@/store/file-store";
import { parallelWithLimit } from "@/lib/concurrent";
import { Folder, Loader2, ChevronRight, HardDrive, FolderOpen, X, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_CONCURRENT_OPERATIONS = 3;

interface MoveCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FileOrFolder | null;
  mode: "move" | "copy";
  batchItems?: string[];
}

export function MoveCopyDialog({ open, onOpenChange, item, mode, batchItems }: MoveCopyDialogProps) {
  const { t } = useTranslation();
  const currentBucketId = useFileStore((s) => s.currentBucketId);
  const [selectedPath, setSelectedPath] = useState("");
  const [currentBrowsePath, setCurrentBrowsePath] = useState("");
  const [operationStatus, setOperationStatus] = useState<"browsing" | "processing" | "complete" | "error">("browsing");
  const [completedCount, setCompletedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const moveFile = useMoveFile();
  const copyFile = useCopyFile();
  
  const { data } = useFiles(currentBrowsePath, currentBucketId);
  
  const isBatchMode = batchItems && batchItems.length > 0;
  
  useEffect(() => {
    if (open) {
      setSelectedPath("");
      setCurrentBrowsePath("");
      setOperationStatus("browsing");
      setCompletedCount(0);
      setErrorCount(0);
      setTotalCount(0);
      setErrorMessage(null);
    }
  }, [open]);

  const folders = data?.folders || [];
  
  const pathParts = currentBrowsePath.split("/").filter(Boolean);

  const handleNavigateToFolder = (folderKey: string) => {
    setCurrentBrowsePath(folderKey);
  };

  const handleNavigateUp = () => {
    const parts = currentBrowsePath.split("/").filter(Boolean);
    parts.pop();
    setCurrentBrowsePath(parts.join("/") + (parts.length > 0 ? "/" : ""));
  };

  const handleNavigateToPath = (index: number) => {
    const parts = pathParts.slice(0, index + 1);
    setCurrentBrowsePath(parts.join("/") + "/");
  };

  const handleConfirm = async () => {
    const keys = isBatchMode ? batchItems! : (item ? [item.key] : []);
    if (keys.length === 0) return;

    setOperationStatus("processing");
    setTotalCount(keys.length);
    setCompletedCount(0);
    setErrorCount(0);

    const tasks = keys.map((key) => {
      const name = key.split("/").filter(Boolean).pop() || "";
      const isFolder = key.endsWith("/");
      const destPath = selectedPath || currentBrowsePath;
      const destKey = destPath + name + (isFolder ? "/" : "");
      return { sourceKey: key, destKey };
    });

    const result = await parallelWithLimit(
      tasks,
      async (task) => {
        if (mode === "move") {
          await moveFile.mutateAsync({ sourceKey: task.sourceKey, destKey: task.destKey, bucketId: currentBucketId });
        } else {
          await copyFile.mutateAsync({ sourceKey: task.sourceKey, destKey: task.destKey, bucketId: currentBucketId });
        }
      },
      MAX_CONCURRENT_OPERATIONS,
      (info) => {
        setCompletedCount(info.completed - info.errors.length);
        setErrorCount(info.errors.length);
      }
    );

    if (result.errors.length > 0 && result.completed < keys.length) {
      setErrorMessage(result.errors[0].message);
      setOperationStatus("error");
    } else {
      setOperationStatus("complete");
    }
  };

  const handleClose = () => {
    if (operationStatus !== "processing") {
      onOpenChange(false);
    }
  };

  if (!open || (!item && !isBatchMode)) return null;

  const title = isBatchMode 
    ? (mode === "move" ? `${t("files.move")} (${batchItems!.length})` : `${t("files.copy")} (${batchItems!.length})`)
    : (mode === "move" ? t("files.moveTitle") : t("files.copyTitle"));

  const progressPercent = totalCount > 0 ? Math.round((completedCount + errorCount) / totalCount * 100) : 0;

  return (
    <div className="fixed inset-0 bg-overlay-primary backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={handleClose}>
      <div className="w-full max-w-lg bg-bg-panel rounded-xl border border-border-subtle p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-indigo/10 flex items-center justify-center">
              {operationStatus === "processing" ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand-indigo" />
              ) : operationStatus === "complete" ? (
                <Check className="h-5 w-5 text-success-green" />
              ) : operationStatus === "error" ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : mode === "move" ? (
                <FolderOpen className="h-5 w-5 text-brand-indigo" />
              ) : (
                <Folder className="h-5 w-5 text-brand-indigo" />
              )}
            </div>
            <h2 className="text-base font-medium text-text-primary">
              {operationStatus === "browsing" ? title
                : operationStatus === "processing" ? (mode === "move" ? t("files.moving") : t("files.copying"))
                : operationStatus === "complete" ? (mode === "move" ? t("files.moveComplete") : t("files.copyComplete"))
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

        {operationStatus === "browsing" && (
          <div className="space-y-4">
            <div className="text-sm text-text-secondary">
              {t("files.selectFolder")}
            </div>
            
            <div className="flex items-center gap-1 text-sm text-text-quaternary px-3 py-2 bg-hover-bg rounded-lg border border-border-subtle overflow-x-auto">
              <button
                onClick={() => setCurrentBrowsePath("")}
                className="hover:text-text-primary transition-colors flex items-center gap-1 shrink-0"
              >
                <HardDrive className="h-3.5 w-3.5" />
                <span>{t("files.root")}</span>
              </button>
              {pathParts.map((part, index) => (
                <span key={index} className="flex items-center gap-1 shrink-0">
                  <ChevronRight className="h-3 w-3" />
                  <button
                    onClick={() => handleNavigateToPath(index)}
                    className="hover:text-text-primary transition-colors"
                  >
                    {part}
                  </button>
                </span>
              ))}
            </div>

            <div className="border border-border-subtle rounded-lg max-h-64 overflow-y-auto">
              {currentBrowsePath !== "" && (
                <div
                  onClick={handleNavigateUp}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-hover-bg transition-colors border-b border-border-subtle"
                >
                  <Folder className="h-5 w-5 text-brand-indigo shrink-0" />
                  <span className="text-sm text-text-secondary">..</span>
                </div>
              )}
              
              {folders.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-text-quaternary text-sm">
                  {t("files.emptyFolder")}
                </div>
              ) : (
                folders.map((folder: { key: string; name: string }) => (
                  <div
                    key={folder.key}
                    onClick={() => setSelectedPath(folder.key)}
                    onDoubleClick={() => handleNavigateToFolder(folder.key)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                      selectedPath === folder.key
                        ? "bg-accent-violet/10 text-accent-violet"
                        : "hover:bg-hover-bg"
                    )}
                  >
                    <Folder className="h-5 w-5 text-brand-indigo shrink-0" />
                    <span className="text-sm truncate">{folder.name}</span>
                  </div>
                ))
              )}
            </div>

            <div className="text-sm text-text-secondary">
              {t("files.currentFolder")}:{" "}
              <span className="text-text-primary">
                {selectedPath || currentBrowsePath || t("files.root")}
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 rounded-lg bg-hover-bg text-text-secondary font-medium hover:bg-surface-elevated transition-colors"
              >
                {t("files.cancel")}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 rounded-lg bg-brand-indigo text-white font-medium hover:bg-accent-violet transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mode === "move" ? t("files.move") : t("files.copy")}
              </button>
            </div>
          </div>
        )}

        {operationStatus === "processing" && (
          <div className="space-y-3">
            <div className="h-1.5 bg-hover-bg rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-indigo rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">{completedCount + errorCount} / {totalCount}</span>
              <span className="text-text-secondary font-medium">{progressPercent}%</span>
            </div>
          </div>
        )}

        {operationStatus === "complete" && (
          <div className="space-y-4">
            <p className="text-sm text-text-tertiary">
              {completedCount} {mode === "move" ? t("files.itemsMoved") : t("files.itemsCopied")}
              {errorCount > 0 && <span className="text-destructive ml-2">{errorCount} {t("files.failed")}</span>}
            </p>
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 rounded-lg bg-brand-indigo text-white font-medium hover:bg-accent-violet transition-colors"
            >
              {t("files.confirm")}
            </button>
          </div>
        )}

        {operationStatus === "error" && (
          <div className="space-y-4">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <p className="text-sm text-text-tertiary">
              {completedCount} {mode === "move" ? t("files.itemsMoved") : t("files.itemsCopied")}
              {errorCount > 0 && <span className="text-destructive ml-2">{errorCount} {t("files.failed")}</span>}
            </p>
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
