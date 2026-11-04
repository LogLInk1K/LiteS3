import { isAudioFile, isImageFile, isVideoFile } from "@/lib/utils";

// Share one set of extension lists with the icons and the preview so cards,
// placeholders and lightboxes always classify a file the same way.
export { isAudioFile, isImageFile, isVideoFile };

/** Images load the object directly; audio and video get an icon placeholder. */
export function isThumbnailable(name: string): boolean {
  return isImageFile(name) || isVideoFile(name) || isAudioFile(name);
}
