"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { useFileStore } from "@/store/file-store";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Check, Loader2, AlertTriangle } from "lucide-react";

interface DeleteProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: string[];
  onComplete?: () => void;
}

export function DeleteProgressDialog({ open, onOpenChange, items, onComplete }: DeleteProgressDialogProps) {
  const { t } = useTranslation();
  const { currentBucketId } = useFileStore();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"confirm" | "deleting" | "complete" | "error">("confirm");
  const [deletedCount, setDeletedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStatus("confirm");
      setDeletedCount(0);
      setError(null);
    }
  }, [open]);

  const handleConfirm = () => {
    setStatus("deleting");
    deleteItems();
  };

  const deleteItems = async () => {
    if (items.length === 0) return;

    let successCount = 0;
    
    for (let i = 0; i < items.length; i++) {
      try {
        const url = new URL("/api/files/delete", window.location.origin);
        url.searchParams.set("key", items[i]);
        if (currentBucketId) {
          url.searchParams.set("bucketId", currentBucketId);
        }
        const res = await fetch(url.toString(), {
          method: "DELETE",
        });
        
        if (res.ok) {
          const data = await res.json();
          successCount += data.deleted || 1;
        } else {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Delete failed");
        }
        
        setDeletedCount(successCount);
      } catch (err) {
        console.error(`Failed to delete ${items[i]}:`, err);
      }
    }

    setStatus("complete");
    queryClient.invalidateQueries({ queryKey: ["files"] });
    onComplete?.();
  };

  const handleClose = () => {
    if (status !== "deleting") {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-overlay-primary backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-bg-panel rounded-xl border border-border-subtle p-6">
        <div className="flex items-center gap-3 mb-6">
          {status === "confirm" ? (
            <>
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-medium text-text-primary">{t("files.confirmDelete")}</h2>
                <p className="text-sm text-text-tertiary">{items.length} {t("files.itemsSelected")}</p>
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
                <p className="text-sm text-text-tertiary">{deletedCount} {t("files.itemsDeleted")}</p>
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
                style={{ width: `${Math.round((deletedCount / items.length) * 100) || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">{deletedCount} / {items.length}</span>
              <span className="text-text-secondary font-medium">{Math.round((deletedCount / items.length) * 100) || 0}%</span>
            </div>
          </div>
        )}
        
        {status === "complete" && (
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 rounded-lg bg-brand-indigo text-white font-medium hover:bg-accent-violet transition-colors"
          >
            {t("files.confirm") || "确定"}
          </button>
        )}
      </div>
    </div>
  );
}
