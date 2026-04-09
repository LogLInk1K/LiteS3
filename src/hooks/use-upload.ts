"use client";

import { useState, useCallback } from "react";
import { useFileStore } from "@/store/file-store";
import { useQueryClient } from "@tanstack/react-query";

interface UploadItem {
  id: string;
  file: File;
  key: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

let uploadsState: UploadItem[] = [];
const listeners: Set<() => void> = new Set();

function setUploads(newUploads: UploadItem[] | ((prev: UploadItem[]) => UploadItem[])) {
  uploadsState = typeof newUploads === "function" ? newUploads(uploadsState) : newUploads;
  listeners.forEach((listener) => listener());
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useUpload() {
  const { currentPrefix, currentBucketId } = useFileStore();
  const queryClient = useQueryClient();
  const [, forceUpdate] = useState({});

  const subscribe = useCallback(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  useState(() => {
    subscribe();
  });

  const uploadFile = async (file: File, prefix?: string) => {
    const id = generateId();
    const key = (prefix || currentPrefix) + file.name;
    const uploadItem: UploadItem = {
      id,
      file,
      key,
      progress: 0,
      status: "uploading",
    };

    setUploads((prev) => [...prev, uploadItem]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("key", key);
      if (currentBucketId) {
        formData.append("bucketId", currentBucketId);
      }

      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploads((prev) =>
              prev.map((u) => (u.id === id ? { ...u, progress } : u))
            );
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploads((prev) =>
              prev.map((u) => (u.id === id ? { ...u, status: "done", progress: 100 } : u))
            );
            resolve();
          } else {
            const error = xhr.responseText ? JSON.parse(xhr.responseText).error : `Upload failed: ${xhr.status}`;
            reject(new Error(error));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.open("POST", "/api/files/upload");
        xhr.send(formData);
      });

      queryClient.invalidateQueries({ queryKey: ["files"] });
    } catch (error: any) {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: "error", error: error.message } : u
        )
      );
    }
  };

  const uploadFiles = async (files: FileList | File[], prefix?: string) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      await uploadFile(file, prefix);
    }
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const uploads = uploadsState;
  const activeUploads = uploads.filter((u) => u.status !== "done");

  return {
    uploads,
    activeUploads,
    uploadFile,
    uploadFiles,
    removeUpload,
  };
}
