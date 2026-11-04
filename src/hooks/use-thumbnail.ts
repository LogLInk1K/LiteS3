const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov"];

function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

export function isImageFile(name: string): boolean {
  return IMAGE_EXTENSIONS.includes(extensionOf(name));
}

export function isVideoFile(name: string): boolean {
  return VIDEO_EXTENSIONS.includes(extensionOf(name));
}

/** Images load the object directly; videos get an icon placeholder. */
export function isThumbnailable(name: string): boolean {
  return isImageFile(name) || isVideoFile(name);
}
