import { createContext, useContext, type RefObject } from "react";
import type { PeekPhase } from "./editor-layout-provider";

export const PADDING_LEFT = 230;
export const TRANSLATE_X = -80;

// ─── Types ────────────────────────────────────────────────────────────────────
export type LayoutMode = "mobile" | "tablet" | "desktop";

interface EditorLayoutContextValue {
  sidebarWidth: number;
  collapsed: boolean;
  versionHistoryOpen: boolean;
  onVersionHistoryOpenChanged: (v: boolean) => void;
  onCollapsedChange: (v: boolean) => void;
  editorWrapperRef: RefObject<HTMLDivElement | null>;
  editorLeft: number;
  paddingLeft: number;
  translateX: number;
  isResizingSidebar: boolean;
  setSidebarWidth: (w: number) => void;
  onSidebarResizingChange: (resizing: boolean) => void;
  mode: LayoutMode;
  drawerWidth: number;
  peeking: boolean;
  onPeekChange: (v: boolean) => void;
  collapseWithFloat: () => void;
  peekPhase: PeekPhase;
  openPeek: () => void;
  closePeek: () => void;
  discussionOpen: boolean;
  onDiscussionOpenChanged: (open: boolean) => void;
  sidebarView: "pages" | "inbox" | "trash";
  setSidebarView: (v: "pages" | "inbox" | "trash") => void;
  commentDisplayMode: "sidebar" | "popover";
  setCommentDisplayMode: (m: "sidebar" | "popover") => void;
  sidebarHovered: boolean;
  setSidebarHovered: (v: boolean) => void;
  customizeSidebarOpen?: boolean;
  setCustomizeSidebarOpen?: (v: boolean) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const EditorLayoutContext =
  createContext<EditorLayoutContextValue | null>(null);

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEditorLayout(): EditorLayoutContextValue {
  const ctx = useContext(EditorLayoutContext);
  if (!ctx) {
    throw new Error(
      "useEditorLayout must be used within an EditorLayoutProvider",
    );
  }
  return ctx;
}
