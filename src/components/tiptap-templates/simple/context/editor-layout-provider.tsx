import { useCallback, useMemo, type ReactNode } from "react";
import {
  EditorLayoutActionsContext,
  EditorLayoutStateContext,
  EditorLayoutTransientContext,
  TRANSLATE_X,
  type CommentDisplayMode,
  type EditorLayoutActions,
  type EditorLayoutState,
  type EditorLayoutTransient,
  type LayoutMode,
  type SidebarView,
} from "./editor-layout-context";
import { useEffect, useRef, useState } from "react";
import { clampWidth, loadStoredWidth } from "src/lib/loadStoredWidth";
import { SIDEBAR_WIDTH_KEY } from "src/lib/utils";
import { useLayoutMode } from "../hooks/use-layout-mode";

interface EditorLayoutProviderProps {
  children: ReactNode;
}

export type PeekPhase = "hidden" | "entering" | "open" | "leaving";

export function EditorLayoutProvider({ children }: EditorLayoutProviderProps) {
  const { mode } = useLayoutMode();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedWidth, setExpandedWidth] = useState<number>(loadStoredWidth);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>("pages");
  const [commentModeOverride, setCommentModeOverride] =
    useState<CommentDisplayMode | null>(null);

  const [customizeSidebarOpen, setCustomizeSidebarOpen] = useState(false);

  const commentDisplayMode: CommentDisplayMode =
    mode === "mobile" || mode === "tablet"
      ? "popover"
      : (commentModeOverride ?? "sidebar");

  const setCommentDisplayMode = useCallback(
    (m: CommentDisplayMode) => setCommentModeOverride(m),
    [],
  );

  // Auto-collapse when the viewport can't hold a persistent panel, and restore
  // when it can again — otherwise rotating a tablet leaves the sidebar covering
  // the editor with no obvious way back. Tracks the previous mode so a manual
  // toggle inside a mode isn't overridden on every render.
  const prevModeRef = useRef<LayoutMode>(mode);
  useEffect(() => {
    const prev = prevModeRef.current;
    if (prev !== mode) {
      if (mode === "mobile") {
        // Entering mobile: drawer closed.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCollapsed(true);
      } else if (prev === "mobile") {
        // Leaving mobile for a size that fits a panel: open it.
        setCollapsed(false);
      }
      prevModeRef.current = mode;
    }
  }, [mode]);

  const editorWrapperRef = useRef<HTMLDivElement>(null);

  const onCollapsedChange = useCallback((v: boolean) => setCollapsed(v), []);

  const setSidebarWidth = useCallback((w: number) => {
    setExpandedWidth(clampWidth(w));
  }, []);

  const onSidebarResizingChange = useCallback((resizing: boolean) => {
    setIsResizingSidebar(resizing);
    if (!resizing) {
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

  const [peeking, setPeeking] = useState(false);
  const peekTimer = useRef<number | null>(null);

  // Hover-peek (desktop, when collapsed): show the floating panel, and keep it
  // until the pointer leaves. A small close delay avoids flicker when the cursor
  // briefly exits and re-enters.
  const onPeekChange = useCallback((v: boolean) => {
    if (peekTimer.current) {
      window.clearTimeout(peekTimer.current);
      peekTimer.current = null;
    }
    if (v) {
      setPeeking(true);
    } else {
      peekTimer.current = window.setTimeout(() => setPeeking(false), 180);
    }
  }, []);

  // Click-collapse with the Notion detach: pop into a floating card, hold, then
  // slide away. Distinct from onCollapsedChange(true), which collapses instantly.
  const collapseWithFloat = useCallback(() => {
    if (peekTimer.current) {
      window.clearTimeout(peekTimer.current);
      peekTimer.current = null;
    }
    setPeeking(true); // detach into the floating panel
    setCollapsed(true); // layout treats it as collapsed (editor reclaims width)
    peekTimer.current = window.setTimeout(() => setPeeking(false), 240); // then slide out
  }, []);

  useEffect(() => {
    return () => {
      if (peekTimer.current) window.clearTimeout(peekTimer.current);
    };
  }, []);

  const [peekPhase, setPeekPhase] = useState<PeekPhase>("hidden");
  const leaveTimer = useRef<number | null>(null);

  const openPeek = useCallback(() => {
    if (leaveTimer.current) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    setPeekPhase("entering");
    requestAnimationFrame(() => setPeekPhase("open"));
  }, []);

  const closePeek = useCallback(() => {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    setPeekPhase((p) => (p === "hidden" ? p : "leaving"));
    // Match the 0.28s exit transition so the slide fully plays before unmount.
    leaveTimer.current = window.setTimeout(() => setPeekPhase("hidden"), 300);
  }, []);

  // ── Actions: stable identities → this object effectively never rebuilds. ──
  const actions = useMemo<EditorLayoutActions>(
    () => ({
      onCollapsedChange,
      setSidebarWidth,
      onSidebarResizingChange,
      onPeekChange,
      collapseWithFloat,
      openPeek,
      closePeek,
      setSidebarView,
      setCommentDisplayMode,
      onDiscussionOpenChanged: setDiscussionOpen,
      setCustomizeSidebarOpen,
      editorWrapperRef,
      translateX: TRANSLATE_X,
    }),
    [
      onCollapsedChange,
      setSidebarWidth,
      onSidebarResizingChange,
      onPeekChange,
      collapseWithFloat,
      openPeek,
      closePeek,
      setSidebarView,
      setCommentDisplayMode,
      setDiscussionOpen,
      setCustomizeSidebarOpen,
      editorWrapperRef,
    ],
  );

  // ── General UI state: infrequent changes. ──
  const state = useMemo<EditorLayoutState>(
    () => ({
      collapsed,
      sidebarView,
      discussionOpen,
      commentDisplayMode,
      customizeSidebarOpen,
    }),
    [
      collapsed,
      sidebarView,
      discussionOpen,
      commentDisplayMode,
      customizeSidebarOpen,
    ],
  );

  // ── Transient/hot state: resize drag + peek animation (per-frame changes). ──
  const transient = useMemo<EditorLayoutTransient>(
    () => ({ isResizingSidebar, peeking, peekPhase, expandedWidth }),
    [isResizingSidebar, peeking, peekPhase, expandedWidth],
  );

  return (
    <EditorLayoutActionsContext.Provider value={actions}>
      <EditorLayoutStateContext.Provider value={state}>
        <EditorLayoutTransientContext.Provider value={transient}>
          {children}
        </EditorLayoutTransientContext.Provider>
      </EditorLayoutStateContext.Provider>
    </EditorLayoutActionsContext.Provider>
  );
}
