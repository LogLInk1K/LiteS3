"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileOrFolder } from "@/store/file-store";

async function fetchFiles(prefix: string, bucketId?: string | null) {
  const url = new URL("/api/files", window.location.origin);
  url.searchParams.set("prefix", prefix);
  if (bucketId) {
    url.searchParams.set("bucketId", bucketId);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch files");
  return res.json();
}

async function fetchBuckets() {
  const res = await fetch("/api/buckets");
  if (!res.ok) throw new Error("Failed to fetch buckets");
  return res.json();
}

async function requestUploadUrl({ key, contentType }: { key: string; contentType: string }) {
  const res = await fetch("/api/files/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, contentType }),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  return res.json();
}

async function deleteFile(key: string, bucketId?: string | null) {
  const url = new URL("/api/files/delete", window.location.origin);
  url.searchParams.set("key", key);
  if (bucketId) {
    url.searchParams.set("bucketId", bucketId);
  }
  const res = await fetch(url.toString(), {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete file");
  return res.json();
}

async function getFileLink(key: string, expiresIn: number = 3600, bucketId?: string | null) {
  const url = new URL("/api/files/link", window.location.origin);
  url.searchParams.set("key", key);
  url.searchParams.set("expiresIn", String(expiresIn));
  if (bucketId) {
    url.searchParams.set("bucketId", bucketId);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to get file link");
  return res.json();
}

async function moveFile({ sourceKey, destKey, bucketId }: { sourceKey: string; destKey: string; bucketId?: string | null }) {
  const res = await fetch("/api/files/move", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceKey, destKey, bucketId }),
  });
  if (!res.ok) throw new Error("Failed to move file");
  return res.json();
}

async function copyFile({ sourceKey, destKey, bucketId }: { sourceKey: string; destKey: string; bucketId?: string | null }) {
  const res = await fetch("/api/files/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceKey, destKey, bucketId }),
  });
  if (!res.ok) throw new Error("Failed to copy file");
  return res.json();
}

async function createFolder(key: string, bucketId?: string | null) {
  const res = await fetch("/api/files/folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, bucketId }),
  });
  if (!res.ok) throw new Error("Failed to create folder");
  return res.json();
}

async function renameFile({ sourceKey, destKey, bucketId }: { sourceKey: string; destKey: string; bucketId?: string | null }) {
  const res = await fetch("/api/files/rename", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceKey, destKey, bucketId }),
  });
  if (!res.ok) throw new Error("Failed to rename file");
  return res.json();
}

export function useFiles(prefix: string, bucketId?: string | null) {
  return useQuery({
    queryKey: ["files", prefix, bucketId],
    queryFn: () => fetchFiles(prefix, bucketId),
  });
}

export function useBuckets() {
  return useQuery({
    queryKey: ["buckets"],
    queryFn: fetchBuckets,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestUploadUrl,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, bucketId }: { key: string; bucketId?: string | null }) =>
      deleteFile(key, bucketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useFileLink() {
  return useMutation({
    mutationFn: ({ key, expiresIn, bucketId }: { key: string; expiresIn?: number; bucketId?: string | null }) =>
      getFileLink(key, expiresIn, bucketId),
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: moveFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useCopyFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: copyFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, bucketId }: { key: string; bucketId?: string | null }) =>
      createFolder(key, bucketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: renameFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}
