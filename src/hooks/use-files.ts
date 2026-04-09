"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileOrFolder } from "@/store/file-store";

async function fetchFiles(prefix: string) {
  const res = await fetch(`/api/files?prefix=${encodeURIComponent(prefix)}`);
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

async function deleteFile(key: string) {
  const res = await fetch(`/api/files/delete?key=${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete file");
  return res.json();
}

async function getFileLink(key: string, expiresIn: number = 3600) {
  const res = await fetch(`/api/files/link?key=${encodeURIComponent(key)}&expiresIn=${expiresIn}`);
  if (!res.ok) throw new Error("Failed to get file link");
  return res.json();
}

async function moveFile({ sourceKey, destKey }: { sourceKey: string; destKey: string }) {
  const res = await fetch("/api/files/move", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceKey, destKey }),
  });
  if (!res.ok) throw new Error("Failed to move file");
  return res.json();
}

async function copyFile({ sourceKey, destKey }: { sourceKey: string; destKey: string }) {
  const res = await fetch("/api/files/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceKey, destKey }),
  });
  if (!res.ok) throw new Error("Failed to copy file");
  return res.json();
}

export function useFiles(prefix: string) {
  return useQuery({
    queryKey: ["files", prefix],
    queryFn: () => fetchFiles(prefix),
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
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useFileLink() {
  return useMutation({
    mutationFn: ({ key, expiresIn }: { key: string; expiresIn?: number }) =>
      getFileLink(key, expiresIn),
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
