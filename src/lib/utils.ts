import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDate(date: Date | string, locale: string = "zh-CN") {
  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getFileExtension(key: string) {
  const parts = key.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export function getFileName(key: string) {
  const parts = key.split("/");
  return parts[parts.length - 1] || parts[parts.length - 2];
}

export function isImageFile(key: string) {
  const ext = getFileExtension(key);
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext);
}

export function isVideoFile(key: string) {
  const ext = getFileExtension(key);
  return ["mp4", "webm", "ogg", "mov", "avi"].includes(ext);
}

export function isAudioFile(key: string) {
  const ext = getFileExtension(key);
  return ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext);
}

export function isCodeFile(key: string) {
  const ext = getFileExtension(key);
  return [
    "js", "jsx", "ts", "tsx", "py", "rb", "go", "rs", "java", "c", "cpp",
    "h", "hpp", "cs", "php", "swift", "kt", "scala", "sh", "bash", "sql",
    "html", "css", "scss", "less", "json", "yaml", "yml", "toml", "xml",
    "dockerfile", "makefile", "gitignore", "env",
  ].includes(ext);
}

export function isMarkdownFile(key: string) {
  const ext = getFileExtension(key);
  return ["md", "mdx"].includes(ext);
}

export function isTextFile(key: string) {
  const ext = getFileExtension(key);
  return [
    "txt", "log", "csv", "tsv", "ini", "cfg", "conf",
  ].includes(ext);
}

const CONNECTION_ERROR_MAP: Record<string, string> = {
  BUCKET_NAME_REQUIRED: "buckets.errorBucketNameRequired",
  ENDPOINT_REQUIRED: "buckets.errorEndpointRequired",
  ACCESS_KEY_REQUIRED: "buckets.errorAccessKeyRequired",
  SECRET_KEY_REQUIRED: "buckets.errorSecretKeyRequired",
  CREDENTIALS_PAIR_REQUIRED: "buckets.errorCredentialsPairRequired",
  ENDPOINT_UNREACHABLE: "buckets.errorEndpointUnreachable",
  INVALID_CREDENTIALS: "buckets.errorInvalidCredentials",
  BUCKET_NOT_FOUND: "buckets.errorBucketNotFound",
  NETWORK_ERROR: "buckets.errorNetwork",
  CONNECTION_FAILED: "buckets.errorConnectionFailed",
};

export function mapConnectionError(code: string, t: (key: string) => string): string {
  return t(CONNECTION_ERROR_MAP[code] || "buckets.connectionFailed");
}

/** Triggers a download from a URL that already returns Content-Disposition: attachment. */
export function triggerDownload(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  // Removing the element immediately can cancel the navigation in some browsers.
  window.setTimeout(() => link.remove(), 1000);
}

/**
 * Each URL is loaded in its own browsing context. Firing several <a>.click()
 * calls on one page makes the browser drop the pending navigations, so only
 * one or two downloads survive. Hidden iframes keep every request independent,
 * and never navigate the main tab away if a URL happens to be inline.
 */
export function triggerDownloads(urls: string[], intervalMs = 300) {
  urls.forEach((url, index) => {
    window.setTimeout(() => {
      const frame = document.createElement("iframe");
      frame.style.display = "none";
      frame.src = url;
      document.body.appendChild(frame);
      window.setTimeout(() => frame.remove(), 15_000);
    }, index * intervalMs);
  });
}
