"use client";

import { useShallow } from "zustand/react/shallow";
import { useFileStore } from "@/store/file-store";
import { NewFolderDialog } from "./dialogs/new-folder-dialog";
import { RenameDialog } from "./dialogs/rename-dialog";
import { MoveCopyDialog } from "./dialogs/move-copy-dialog";
import { DeleteProgressDialog } from "./dialogs/delete-progress-dialog";

/**
 * Hosts every dialog and owns their store slice, so opening or closing one never
 * re-renders the file grid - the grid has no reason to know about dialog state.
 */
export function DialogHost() {
  const {
    renameItem,
    closeRenameDialog,
    moveCopyItem,
    moveCopyMode,
    batchMoveCopyItems,
    closeMoveCopyDialog,
    newFolderOpen,
    closeNewFolderDialog,
    deleteItems,
    deleteDialogOpen,
    closeDeleteDialog,
  } = useFileStore(
    useShallow((s) => ({
      renameItem: s.renameItem,
      closeRenameDialog: s.closeRenameDialog,
      moveCopyItem: s.moveCopyItem,
      moveCopyMode: s.moveCopyMode,
      batchMoveCopyItems: s.batchMoveCopyItems,
      closeMoveCopyDialog: s.closeMoveCopyDialog,
      newFolderOpen: s.newFolderOpen,
      closeNewFolderDialog: s.closeNewFolderDialog,
      deleteItems: s.deleteItems,
      deleteDialogOpen: s.deleteDialogOpen,
      closeDeleteDialog: s.closeDeleteDialog,
    })),
  );

  return (
    <>
      <NewFolderDialog open={newFolderOpen} onOpenChange={closeNewFolderDialog} />
      <RenameDialog open={!!renameItem} onOpenChange={closeRenameDialog} item={renameItem} />
      <MoveCopyDialog
        open={!!moveCopyItem || batchMoveCopyItems.length > 0}
        onOpenChange={closeMoveCopyDialog}
        item={moveCopyItem}
        mode={moveCopyMode}
        batchItems={batchMoveCopyItems}
      />
      <DeleteProgressDialog open={deleteDialogOpen} onOpenChange={closeDeleteDialog} items={deleteItems} />
    </>
  );
}
