"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { useFileStore } from "@/store/file-store";
import { useQueryClient } from "@tanstack/react-query";
import { parallelWithLimit } from "@/lib/concurrent";
import { Trash2, Check, Loader2, AlertTriangle } from "lucide-react";

const MAX_CONCURRENT_DELETES = 5;

function deduplicatePaths(keys: string[]): string[] {
  const sorted = [...keys].sort();
  const result: string[] = [];
  for (const key of sorted) {
    if (result.length === 0 || !key.startsWith(result[result.length - 1])) {
      result.push(key);
    }
  }
  return result;
}

interface DeleteProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: string[];
  onComplete?: () => void;
}

export function DeleteProgressDialog({ open, onOpenChange, items, onComplete }: DeleteProgressDialogProps) {
  const { t } = useTranslation();
  const currentBucketId = useFileStore((s) => s.currentBucketId);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"confirm" | "deleting" | "complete" | "error">("confirm");
  const [deletedCount, setDeletedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dedupedItems, setDedupedItems] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      const deduped = deduplicatePaths(items);
      setDedupedItems(deduped);
      setStatus("confirm");
      setDeletedCount(0);
      setErrorCount(0);
      setError(null);
    }
  }, [open, items]);

  const handleConfirm = () => {
    setStatus("deleting");
    deleteItems();
  };

  const deleteItems = async () => {
    if (dedupedItems.length === 0) return;

    const result = await parallelWithLimit(
      dedupedItems,
      async (key) => {
        const url = new URL("/api/files/delete", window.location.origin);
        url.searchParams.set("key", key);
        if (currentBucketId) {
          url.searchParams.set("bucketId", currentBucketId);
        }
        const res = await fetch(url.toString(), { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Delete failed");
        }
      },
      MAX_CONCURRENT_DELETES,
      (info) => {
        setDeletedCount(info.completed - info.errors.length);
        setErrorCount(info.errors.length);
      }
    );

    if (result.errors.length > 0 && result.completed < dedupedItems.length) {
      setError(result.errors[0].message);
      setStatus("error");
    } else {
      setStatus("complete");
    }

    queryClient.invalidateQueries({ queryKey: ["files"] });
    onComplete?.();
  };

  const handleClose = () => {
    if (status !== "deleting") {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  const progressPercent = dedupedItems.length > 0 ? Math.round((deletedCount + errorCount) / dedupedItems.length * 100) : 0;

  return (
    <div className="fixed inset-0 bg-overlay-primary backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={handleClose}>
      <div className="w-full max-w-sm bg-bg-panel rounded-xl border border-border-subtle p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          {status === "confirm" ? (
            <>
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-medium text-text-primary">{t("files.confirmDelete")}</h2>
                <p className="text-sm text-text-tertiary">
                  {dedupedItems.length}{items.length !== dedupedItems.length && ` (${items.length} ${t("files.itemsSelected")})`} {t("files.itemsSelected")}
                </p>
              </div>
            </>
          ) : status === "deleting" ? (
            <>
              <div className="w-10 h-10 rounded-lg bg-brand-indigo/10 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-brand-indigo" />
              </div>
              <div>
                <h2 className="text-base font-medium text-text-primary">{t("files.deleting")}</h2>
                <p className="text-sm text-text-tertiary">{t("files.deleteProgress")}</p>
              </div>
            </>
          ) : status === "complete" ? (
            <>
              <div className="w-10 h-10 rounded-lg bg-success-green/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-success-green" />
              </div>
              <div>
                <h2 className="text-base font-medium text-text-primary">{t("files.deleteComplete")}</h2>
                <p className="text-sm text-text-tertiary">
                  {deletedCount} {t("files.itemsDeleted")}
                  {errorCount > 0 && <span className="text-destructive ml-2">{errorCount} {t("files.failed")}</span>}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-medium text-text-primary">{t("files.operationFailed")}</h2>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </>
          )}
        </div>
        
        {status === "confirm" && (
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg bg-hover-bg text-text-secondary font-medium hover:bg-surface-elevated transition-colors"
            >
              {t("files.cancel")}
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 rounded-lg bg-destructive text-white font-medium hover:bg-destructive/90 transition-colors"
            >
              {t("files.delete")}
            </button>
          </div>
        )}
        
        {status === "deleting" && (
          <div className="space-y-3">
            <div className="h-1.5 bg-hover-bg rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-indigo rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">{deletedCount + errorCount} / {dedupedItems.length}</span>
              <span className="text-text-secondary font-medium">{progressPercent}%</span>
            </div>
          </div>
        )}
        
        {status === "complete" && (
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 rounded-lg bg-brand-indigo text-white font-medium hover:bg-accent-violet transition-colors"
          >
            {t("files.confirm")}
          </button>
        )}
      </div>
    </div>
  );
}
