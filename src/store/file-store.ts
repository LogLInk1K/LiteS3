import { create } from "zustand";

export interface FileItem {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  type: "file";
}

export interface FolderItem {
  key: string;
  name: string;
  type: "folder";
}

export type FileOrFolder = FileItem | FolderItem;

interface FileStore {
  currentPrefix: string;
  pathStack: string[];
  searchQuery: string;
  selectedItems: Set<string>;
  previewItem: FileOrFolder | null;
  viewMode: "grid" | "list";
  contextMenu: { item: FileOrFolder; x: number; y: number } | null;
  currentPage: number;

  setCurrentPrefix: (prefix: string) => void;
  navigateToFolder: (folderKey: string) => void;
  navigateUp: () => void;
  setSearchQuery: (query: string) => void;
  toggleSelect: (key: string) => void;
  clearSelection: () => void;
  setPreviewItem: (item: FileOrFolder | null) => void;
  setViewMode: (mode: "grid" | "list") => void;
  openContextMenu: (item: FileOrFolder, x: number, y: number) => void;
  closeContextMenu: () => void;
  setCurrentPage: (page: number) => void;
}

export const useFileStore = create<FileStore>((set, get) => ({
  currentPrefix: "",
  pathStack: [],
  searchQuery: "",
  selectedItems: new Set<string>(),
  previewItem: null,
  viewMode: "grid",
  contextMenu: null,
  currentPage: 1,

  setCurrentPrefix: (prefix) => set({ currentPrefix: prefix }),

  navigateToFolder: (folderKey) => {
    const { currentPrefix, pathStack } = get();
    set({
      currentPrefix: folderKey,
      pathStack: [...pathStack, currentPrefix],
      selectedItems: new Set<string>(),
      previewItem: null,
      currentPage: 1,
    });
  },

  navigateUp: () => {
    const { pathStack } = get();
    if (pathStack.length === 0) return;
    const newStack = [...pathStack];
    const parentPrefix = newStack.pop()!;
    set({
      currentPrefix: parentPrefix,
      pathStack: newStack,
      selectedItems: new Set<string>(),
      previewItem: null,
      currentPage: 1,
    });
  },

  setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),

  toggleSelect: (key) => {
    const { selectedItems } = get();
    const newSet = new Set(selectedItems);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    set({ selectedItems: newSet });
  },

  clearSelection: () => set({ selectedItems: new Set<string>() }),

  setPreviewItem: (item) => set({ previewItem: item }),

  setViewMode: (mode) => set({ viewMode: mode }),

  openContextMenu: (item, x, y) => set({ contextMenu: { item, x, y } }),
  closeContextMenu: () => set({ contextMenu: null }),
  setCurrentPage: (page) => set({ currentPage: page }),
}));
