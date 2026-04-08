export function isThumbnailable(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return [
    "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp",
    "mp4", "webm", "mov",
  ].includes(ext);
}
