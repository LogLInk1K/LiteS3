/**
 * Builds a permanent, anonymous URL for a public bucket.
 * Pure and dependency-free so the server and the browser share the exact same
 * encoding rules for object keys.
 */
export function buildPublicUrl(
  publicUrl: string | null | undefined,
  key: string,
): string | null {
  if (!publicUrl) return null;
  const base = publicUrl.replace(/\/+$/, "");
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${base}/${encodedKey}`;
}
