"use client";

import { useCallback, useState } from "react";
import { useUpload } from "@/hooks/use-upload";
import { useBuckets } from "@/hooks/use-files";
import { useFileStore } from "@/store/file-store";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

export function DropZone() {
  const { activeUploads, uploadFiles, removeUpload } = useUpload();
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useTranslation();
  const { currentBucketId } = useFileStore();
  const { data: bucketsData } = useBuckets();
  const buckets = bucketsData?.buckets || [];
  const currentBucket = buckets.find((b: { id: string }) => b.id === currentBucketId)
    || buckets.find((b: { isDefault: boolean }) => b.isDefault)
    || buckets[0];
  const isPublic = !!currentBucket?.publicUrl;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      await uploadFiles(files);
    },
    [uploadFiles]
  );

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "fixed inset-0 z-40 pointer-events-none transition-all",
          isDragging && "pointer-events-auto bg-brand-indigo/5 border-2 border-dashed border-brand-indigo/50"
        )}
      >
        {isDragging && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 text-brand-indigo">
              <UploadCloud className="h-16 w-16" />
              <p className="text-lg font-medium">{t("files.dropToUpload")}</p>
              {isPublic && (
                <p className="max-w-md text-center text-sm text-destructive">
                  {t("files.publicBucketWarning")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {activeUploads.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-border-subtle bg-surface-elevated shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <span className="text-sm font-medium text-text-primary">{t("files.uploading")}</span>
            <span className="text-xs text-text-tertiary">
              {activeUploads.filter((u) => u.status === "done").length}/{activeUploads.length}
            </span>
          </div>
          <div className="max-h-60 overflow-auto p-2">
            {activeUploads.map((upload) => (
              <div key={upload.id} className="flex items-center gap-2 px-2 py-1.5">
                {upload.status === "uploading" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-brand-indigo shrink-0" />
                ) : upload.status === "error" ? (
                  <X className="h-4 w-4 text-destructive shrink-0" />
                ) : null}
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate text-text-primary">{upload.file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1 bg-hover-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-indigo rounded-full transition-all"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-text-tertiary">
                      {formatBytes(upload.file.size)}
                    </span>
                  </div>
                  {upload.status === "error" && upload.error && (
                    <p className="text-[10px] text-destructive mt-0.5 wrap-break-word" title={upload.error}>
                      {upload.error}
                    </p>
                  )}
                </div>
                <button onClick={() => removeUpload(upload.id)} className="shrink-0">
                  <X className="h-3 w-3 text-text-tertiary hover:text-text-primary" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
