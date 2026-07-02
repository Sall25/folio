import { useCallback, type ReactNode } from "react";
import {
  EditorLayoutContext,
  PADDING_LEFT,
  TRANSLATE_X,
} from "./editor-layout-context";
import { useEffect, useRef, useState } from "react";

interface EditorLayoutProviderProps {
  children: ReactNode;
}

const SIDEBAR_COLLAPSED_WIDTH = 52;
const SIDEBAR_DEFAULT_WIDTH = 290;
const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 480;
const SIDEBAR_WIDTH_KEY = "editor-sidebar-width";

const clampWidth = (w: number) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(w)));

const loadStoredWidth = (): number => {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) ? clampWidth(n) : SIDEBAR_DEFAULT_WIDTH;
  } catch {
    return SIDEBAR_DEFAULT_WIDTH;
  }
};

export function EditorLayoutProvider({ children }: EditorLayoutProviderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  // User-set expanded width — persisted, clamped, survives reloads.
  const [expandedWidth, setExpandedWidth] = useState<number>(loadStoredWidth);
  // True only while the resize handle is being dragged; the sidebar uses
  // this to suspend its width transition so the drag tracks 1:1.
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : expandedWidth;
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const [editorLeft, setEditorLeft] = useState(0);
  const paddingLeft = collapsed
    ? 100 //PADDING_LEFT - Math.round(sidebarWidth / 6)
    : PADDING_LEFT;

  const onCollapsedChange = useCallback((v: boolean) => setCollapsed(v), []);
  const onVersionHistoryOpenChanged = useCallback(
    (v: boolean) => setVersionHistoryOpen(v),
    [],
  );

  // Live width updates during drag — clamp only; persistence happens once
  // at drag end, not on every pointermove.
  const setSidebarWidth = useCallback((w: number) => {
    setExpandedWidth(clampWidth(w));
  }, []);

  const onSidebarResizingChange = useCallback((resizing: boolean) => {
    setIsResizingSidebar(resizing);
    if (!resizing) {
      // Drag finished — persist the final width.
      setExpandedWidth((w) => {
        try {
          localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w));
        } catch {
          // storage unavailable — width stays session-only
        }
        return w;
      });
    }
  }, []);

  useEffect(() => {
    if (!editorWrapperRef.current) return;

    const raf = requestAnimationFrame(() => {
      queueMicrotask(() => {
        const { left } = editorWrapperRef.current!.getBoundingClientRect();
        setEditorLeft(left);
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [sidebarWidth, collapsed]);

  return (
    <EditorLayoutContext.Provider
      value={{
        sidebarWidth,
        collapsed,
        editorWrapperRef,
        editorLeft,
        paddingLeft,
        translateX: TRANSLATE_X,
        onCollapsedChange,
        versionHistoryOpen,
        onVersionHistoryOpenChanged,
        isResizingSidebar,
        setSidebarWidth,
        onSidebarResizingChange,
      }}
    >
      {children}
    </EditorLayoutContext.Provider>
  );
}
