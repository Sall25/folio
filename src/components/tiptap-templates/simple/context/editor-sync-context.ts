import { createContext, useContext } from "react";

// True while the active page's collaborative doc is still connecting/syncing
// (the window between switching to a page and its Yjs doc being ready). The
// existing editor-skeleton-overlay uses this to cover just the content area
// during that gap, instead of showing a blank editor.
export const EditorSyncContext = createContext<{ isSyncing: boolean }>({
  isSyncing: false,
});

export function useEditorSync() {
  return useContext(EditorSyncContext);
}
