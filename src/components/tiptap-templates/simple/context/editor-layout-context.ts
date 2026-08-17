import { createContext, useContext } from "react";
import type { PeekPhase } from "./editor-layout-provider";

export const PADDING_LEFT = 230;
export const TRANSLATE_X = -80;

// ─── Types ────────────────────────────────────────────────────────────────────
export type LayoutMode = "mobile" | "tablet" | "desktop";
export type CommentDisplayMode = "sidebar" | "popover";
export type SidebarView = "pages" | "inbox" | "trash";

export interface EditorLayoutActions {
  onCollapsedChange: (collapsed: boolean) => void;
  setSidebarWidth: (w: number) => void;
  onSidebarResizingChange: (resizing: boolean) => void;
  onPeekChange: (v: boolean) => void;
  collapseWithFloat: () => void;
  openPeek: () => void;
  closePeek: () => void;
  setSidebarView: (v: SidebarView) => void;
  setCommentDisplayMode: (m: CommentDisplayMode) => void;
  onDiscussionOpenChanged: (open: boolean) => void;
  setCustomizeSidebarOpen: (open: boolean) => void;
  editorWrapperRef: React.RefObject<HTMLDivElement | null>;
  translateX: number;
}

export interface EditorLayoutState {
  collapsed: boolean;
  sidebarView: SidebarView;
  discussionOpen: boolean;
  commentDisplayMode: CommentDisplayMode;
  customizeSidebarOpen: boolean;
}

export interface EditorLayoutTransient {
  isResizingSidebar: boolean;
  peeking: boolean;
  peekPhase: PeekPhase;
  expandedWidth: number;
}

// ─── Contexts ──────────────────────────────────────────────────────────────────
export const EditorLayoutActionsContext =
  createContext<EditorLayoutActions | null>(null);
export const EditorLayoutStateContext = createContext<EditorLayoutState | null>(
  null,
);
export const EditorLayoutTransientContext =
  createContext<EditorLayoutTransient | null>(null);

// ─── Hooks ─────────────────────────────────────────────────────────────────────
export function useEditorLayoutActions(): EditorLayoutActions {
  const ctx = useContext(EditorLayoutActionsContext);
  if (!ctx)
    throw new Error(
      "useEditorLayoutActions must be used within EditorLayoutProvider",
    );
  return ctx;
}

export function useEditorLayoutState(): EditorLayoutState {
  const ctx = useContext(EditorLayoutStateContext);
  if (!ctx)
    throw new Error(
      "useEditorLayoutState must be used within EditorLayoutProvider",
    );
  return ctx;
}

export function useEditorLayoutTransient(): EditorLayoutTransient {
  const ctx = useContext(EditorLayoutTransientContext);
  if (!ctx)
    throw new Error(
      "useEditorLayoutTransient must be used within EditorLayoutProvider",
    );
  return ctx;
}

// ── Back-compat shim (optional — eases migration) ────────────────────────────
// Lets existing useEditorLayout() calls keep working during migration. It reads
// ALL THREE contexts, so any component using it re-renders on any change — i.e.
// it forfeits the optimization. Migrate consumers to the specific hooks, then
// delete this. Keeping it temporarily avoids a big-bang rewrite of every caller.
export function useEditorLayout() {
  return {
    ...useEditorLayoutActions(),
    ...useEditorLayoutState(),
    ...useEditorLayoutTransient(),
  };
}
