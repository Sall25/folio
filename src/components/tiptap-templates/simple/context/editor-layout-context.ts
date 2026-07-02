import { createContext, useContext, type RefObject } from "react";

export const PADDING_LEFT = 230;
export const TRANSLATE_X = -80;

// ─── Types ────────────────────────────────────────────────────────────────────
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
