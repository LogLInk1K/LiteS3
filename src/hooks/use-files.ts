"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileOrFolder } from "@/store/file-store";
import { buildPublicUrl } from "@/lib/public-url";

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

export interface UploadUrlRequest {
  key: string;
  contentType: string;
  size: number;
  bucketId?: string | null;
}

export interface UploadUrlResponse {
  url: string;
  key: string;
  contentType: string;
  expiresIn: number;
  method: "PUT";
}

export async function requestUploadUrl({
  key,
  contentType,
  size,
  bucketId,
}: UploadUrlRequest): Promise<UploadUrlResponse> {
  const res = await fetch("/api/files/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, contentType, size, bucketId }),
  });
  if (!res.ok) {
    const message = await res
      .json()
      .then((data) => data.error)
      .catch(() => null);
    throw new Error(message || `Failed to get upload URL (${res.status})`);
  }
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

export interface FileLinkResponse {
  url: string;
  permanent: boolean;
  expiresIn?: number;
}

export interface BatchFileLink extends FileLinkResponse {
  key: string;
}

async function getFileLink(key: string, expiresIn: number = 3600, bucketId?: string | null, download = false): Promise<FileLinkResponse> {
  const url = new URL("/api/files/link", window.location.origin);
  url.searchParams.set("key", key);
  url.searchParams.set("expiresIn", String(expiresIn));
  if (download) url.searchParams.set("download", "1");
  if (bucketId) {
    url.searchParams.set("bucketId", bucketId);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to get file link");
  return res.json();
}

async function getFileLinks(keys: string[], expiresIn: number = 3600, bucketId?: string | null, download = false): Promise<BatchFileLink[]> {
  const res = await fetch("/api/files/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys, expiresIn, bucketId, download }),
  });
  if (!res.ok) throw new Error("Failed to get file links");
  const data = await res.json();
  return data.links;
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

// Note: The copy operation is handled by the POST method on the /api/files/move endpoint.
// Do NOT change this path to /api/files/copy, as that endpoint does not exist and would cause a 404.
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
    mutationFn: ({ key, expiresIn, bucketId, download }: { key: string; expiresIn?: number; bucketId?: string | null; download?: boolean }) =>
      getFileLink(key, expiresIn, bucketId, download),
  });
}

/** Public buckets resolve locally unless a forced download needs a signed URL. */
export function useResolvedFileLink(publicUrl?: string | null) {
  const { mutateAsync } = useFileLink();

  return useCallback(
    async (key: string, bucketId?: string | null, download = false): Promise<FileLinkResponse> => {
      if (!download) {
        const direct = buildPublicUrl(publicUrl, key);
        if (direct) return { url: direct, permanent: true };
      }
      return mutateAsync({ key, bucketId, download });
    },
    [publicUrl, mutateAsync],
  );
}

/** One request for the whole batch; public buckets stay local unless downloading. */
export function useResolvedFileLinks(publicUrl?: string | null) {
  return useCallback(
    async (keys: string[], bucketId?: string | null, download = false): Promise<BatchFileLink[]> => {
      if (!download && publicUrl) {
        return keys.map((key) => ({
          key,
          url: buildPublicUrl(publicUrl, key)!,
          permanent: true,
        }));
      }
      return getFileLinks(keys, 3600, bucketId, download);
    },
    [publicUrl],
  );
}

const OBJECT_URL_CACHE_PREFIX = "lites3:object-url:";
// Stay slightly below the 1h presigned URL lifetime to avoid using an expired URL.
const OBJECT_URL_CACHE_TTL = 55 * 60 * 1000;

function objectUrlCacheKey(bucketId: string | null, key: string) {
  return `${OBJECT_URL_CACHE_PREFIX}${bucketId ?? "default"}:${key}`;
}

/** Presigned URLs change on every signing. Persisting them keeps the URL - and
 * therefore the browser's HTTP cache key - stable across page reloads. */
function readCachedObjectUrls(bucketId: string | null, keys: string[]): Map<string, string> {
  const cached = new Map<string, string>();
  if (typeof window === "undefined") return cached;
  try {
    for (const key of keys) {
      const cacheKey = objectUrlCacheKey(bucketId, key);
      const raw = window.sessionStorage.getItem(cacheKey);
      if (!raw) continue;
      const entry = JSON.parse(raw) as { url: string; expiresAt: number };
      if (!entry.url || entry.expiresAt <= Date.now()) {
        window.sessionStorage.removeItem(cacheKey);
        continue;
      }
      cached.set(key, entry.url);
    }
  } catch {
    // Storage unavailable (privacy mode / corrupted entry): re-sign instead.
  }
  return cached;
}

function writeCachedObjectUrls(bucketId: string | null, links: BatchFileLink[]) {
  if (typeof window === "undefined") return;
  try {
    const expiresAt = Date.now() + OBJECT_URL_CACHE_TTL;
    for (const link of links) {
      if (!link.url) continue;
      window.sessionStorage.setItem(
        objectUrlCacheKey(bucketId, link.key),
        JSON.stringify({ url: link.url, expiresAt }),
      );
    }
  } catch {
    // Quota or privacy mode: persistence is best-effort.
  }
}

async function getStableObjectUrls(keys: string[], bucketId?: string | null): Promise<BatchFileLink[]> {
  const cached = readCachedObjectUrls(bucketId ?? null, keys);
  const resolved: BatchFileLink[] = Array.from(cached, ([key, url]) => ({ key, url, permanent: false }));
  const missing = keys.filter((key) => !cached.has(key));
  if (missing.length === 0) return resolved;

  const fresh = await getFileLinks(missing, 3600, bucketId, false);
  writeCachedObjectUrls(bucketId ?? null, fresh);
  return [...resolved, ...fresh];
}

/**
 * Resolves object URLs for a page of images. Public buckets are built locally
 * with zero requests; private buckets reuse persisted presigned URLs so a reload
 * neither re-signs nor re-downloads the images.
 */
export function useThumbnailUrls(
  keys: string[],
  bucketId?: string | null,
  publicUrl?: string | null,
): Record<string, string> {
  const { data } = useQuery({
    queryKey: ["thumbnail-urls", bucketId ?? null, keys],
    queryFn: () => getStableObjectUrls(keys, bucketId),
    enabled: keys.length > 0 && !publicUrl,
    staleTime: 30 * 60 * 1000,
  });

  const result: Record<string, string> = {};
  if (publicUrl) {
    for (const key of keys) {
      const url = buildPublicUrl(publicUrl, key);
      if (url) result[key] = url;
    }
    return result;
  }
  for (const link of data ?? []) {
    if (link.url) result[link.key] = link.url;
  }
  return result;
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
