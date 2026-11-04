"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/react/shallow";
import { HardDrive, Search } from "lucide-react";
import { FileOrFolder, useFileStore } from "@/store/file-store";
import { useBuckets, useFiles, useThumbnailUrls } from "@/hooks/use-files";
import { isThumbnailable } from "@/hooks/use-thumbnail";
import { formatBytes } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import { Input } from "./ui/input";
import { FileIcon, FolderIcon } from "./file-icon";
import { Thumbnail } from "./thumbnail";

/** Keeps the typing loop cheap on buckets with thousands of keys. */
const MAX_RESULTS = 100;

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Keyboard-safe search surface for narrow screens. The field is pinned to the
 * top of a fixed layer, so the on-screen keyboard only shrinks the result area
 * instead of scrolling the sticky navbar or re-paginating the file list behind it.
 */
export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  // Selected fields only: opening the lightbox writes previewItem, and re-rendering a
  // hundred result rows for that is most of the click-to-paint cost.
  const { currentPrefix, currentBucketId, navigateToFolder, setPreviewItem } = useFileStore(
    useShallow((s) => ({
      currentPrefix: s.currentPrefix,
      currentBucketId: s.currentBucketId,
      navigateToFolder: s.navigateToFolder,
      setPreviewItem: s.setPreviewItem,
    })),
  );
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  // Results follow a settled term: thumbnail URLs are signed per key set, so matching on
  // every keystroke would fire one signing request per character typed.
  const [term, setTerm] = useState("");
  // Portals need document; skip the first client render to keep SSR output empty.
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollYRef = useRef(0);
  // Kept in a ref so close() stays identity-stable: the open effect must run once per
  // open, otherwise it re-captures the offset the browser scrolled to mid-session.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /**
   * Browsers scroll the document to reveal a focused field, then restore it when the
   * keyboard goes away. Unmounting first lets that restore land on the visible page,
   * which is the jitter seen on exit - so dismiss the keyboard while the panel still
   * covers everything and put the offset back ourselves.
   */
  const close = useCallback(() => {
    inputRef.current?.blur();
    const y = scrollYRef.current;
    window.setTimeout(() => {
      window.scrollTo(0, y);
      onCloseRef.current();
    }, 120);
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTerm("");
    scrollYRef.current = window.scrollY;
    const handleKey = (e: KeyboardEvent) => {
      // While the lightbox is up, Escape belongs to it - not to the panel behind. Read
      // the store imperatively so tracking it never costs a re-render.
      if (e.key === "Escape" && useFileStore.getState().previewItem === null) close();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, close]);

  useEffect(() => {
    const id = window.setTimeout(() => setTerm(query.trim().toLowerCase()), 180);
    return () => window.clearTimeout(id);
  }, [query]);

  const { data } = useFiles(currentPrefix, currentBucketId);
  const { data: bucketsData } = useBuckets();
  const buckets = bucketsData?.buckets || [];
  const currentBucket = buckets.find((b: { id: string }) => b.id === currentBucketId)
    || buckets.find((b: { isDefault: boolean }) => b.isDefault)
    || buckets[0];

  const matches = useMemo(() => {
    if (!term) return [];

    const seen = new Set<string>();
    const items: FileOrFolder[] = [];
    for (const item of [...(data?.folders || []), ...(data?.files || [])]) {
      if (seen.has(item.key)) continue;
      seen.add(item.key);
      if (item.name.toLowerCase().includes(term)) items.push(item);
    }

    // Folders on top, then the API's lexicographic order (oldest keys first).
    return items.sort((a, b) => {
      if ((a.type === "folder") !== (b.type === "folder")) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [data, term]);

  const visible = matches.slice(0, MAX_RESULTS);
  const mediaKeys = visible
    .filter((item) => item.type !== "folder" && isThumbnailable(item.name))
    .map((item) => item.key);
  const thumbnailUrls = useThumbnailUrls(mediaKeys, currentBucketId, currentBucket?.publicUrl);

  if (!mounted || !open) return null;

  const hasTerm = term !== "";
  const pathParts = currentPrefix.split("/").filter(Boolean);
  const scopeLabel = pathParts.length > 0 ? pathParts[pathParts.length - 1] : t("files.root");

  // Top-anchored on purpose: vertical centring would make the hint slide the moment
  // the keyboard changes the panel's height.
  const emptyState = (message: string) => (
    <div className="flex flex-col items-center gap-4 px-6 pt-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-hover-bg border border-border-subtle flex items-center justify-center">
        <Search className="h-7 w-7 text-text-quaternary" />
      </div>
      <p className="text-sm text-text-tertiary">{message}</p>
    </div>
  );

  const handlePick = (item: FileOrFolder) => {
    if (item.type === "folder") {
      navigateToFolder(item.key);
      // The panel would otherwise cover the folder it just opened.
      close();
    } else {
      // Lightbox is z-50 and the panel z-40, so the preview floats above a panel that
      // keeps its term and scroll position - closing it lands back on the same results.
      setPreviewItem(item);
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="fixed inset-0 z-40 flex p-2 bg-overlay-primary backdrop-blur-sm animate-in fade-in-0 duration-150"
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-2xl border border-border-subtle bg-bg-panel shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Field stays pinned to the top, so the keyboard only ever shrinks the result area */}
        <div className="shrink-0 px-3 pt-3 pb-2.5 bg-linear-to-b from-brand-indigo/10 to-transparent">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-indigo pointer-events-none" />
              <Input
                ref={inputRef}
                autoFocus
                type="text"
                enterKeyHint="search"
                autoComplete="off"
                spellCheck={false}
                placeholder={t("common.search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 pl-9 rounded-xl bg-surface-elevated"
              />
            </div>
            <button
              onClick={close}
              className="h-10 px-3.5 shrink-0 rounded-xl border border-border-subtle bg-surface-elevated text-sm text-text-secondary hover:text-text-primary hover:border-brand-indigo active:bg-hover-bg transition-colors"
            >
              {t("files.cancel")}
            </button>
          </div>

          {/* Fixed height: the count chip is taller than the 16px label, and letting it
              grow this row would shove every result down the moment one character is typed */}
          <div className="mt-2 flex h-5 items-center gap-1.5 text-xs text-text-quaternary">
            <HardDrive className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">{scopeLabel}</span>
            {hasTerm && (
              <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded-md bg-accent-violet/10 text-accent-violet font-medium tabular-nums">
                {matches.length} {t("files.items")}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2">
          {!hasTerm ? (
            emptyState(t("files.typeToSearch"))
          ) : visible.length === 0 ? (
            emptyState(t("files.noSearchResults"))
          ) : (
            <div className="flex flex-col gap-0.5">
              {visible.map((item) => {
                const isFolder = item.type === "folder";
                const hasThumb = !isFolder && isThumbnailable(item.name);
                // The thumbnail paints its own tile, so only the plain icons get a plate
                let plate = "bg-surface-elevated border border-border-subtle";
                if (isFolder) plate = "bg-brand-indigo/10";
                else if (hasThumb) plate = "";
                return (
                  <button
                    key={item.key}
                    onClick={() => handlePick(item)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-left transition-colors hover:bg-hover-bg active:bg-surface-secondary"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${plate}`}>
                      {isFolder ? (
                        <FolderIcon className="h-4 w-4 text-brand-indigo" />
                      ) : hasThumb ? (
                        <Thumbnail name={item.name} src={thumbnailUrls[item.key]} size="list" />
                      ) : (
                        <FileIcon name={item.name} className="h-4 w-4 text-text-tertiary" />
                      )}
                    </div>
                    <span className="flex-1 min-w-0 truncate text-sm text-text-primary">
                      {highlightMatches(item.name, term)}
                    </span>
                    {item.type === "file" && (
                      <span className="shrink-0 text-xs text-text-quaternary tabular-nums whitespace-nowrap">
                        {formatBytes(item.size)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {hasTerm && matches.length > visible.length && (
            <p className="px-2 py-2.5 text-center text-xs text-text-quaternary tabular-nums">
              +{matches.length - visible.length} {t("files.items")}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Tints every case-insensitive hit, so matches stay obvious inside long names. */
function highlightMatches(name: string, query: string): ReactNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [name];

  const lower = name.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  let idx = lower.indexOf(q);

  while (idx !== -1) {
    if (idx > from) parts.push(name.slice(from, idx));
    const end = idx + q.length;
    parts.push(
      <span key={idx} className="text-brand-indigo font-medium">
        {name.slice(idx, end)}
      </span>
    );
    from = end;
    idx = lower.indexOf(q, from);
  }
  if (from < name.length) parts.push(name.slice(from));

  return parts;
}
