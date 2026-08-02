import { useCallback, type ReactNode } from "react";
import {
  EditorLayoutContext,
  PADDING_LEFT,
  TRANSLATE_X,
  type LayoutMode,
} from "./editor-layout-context";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "src/hooks/use-breakpoint";

interface EditorLayoutProviderProps {
  children: ReactNode;
}

const SIDEBAR_COLLAPSED_WIDTH = 0;
const SIDEBAR_DEFAULT_WIDTH = 290;
const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 480;
const SIDEBAR_WIDTH_KEY = "editor-sidebar-width";

// The drawer's on-screen width on mobile — near full-bleed but leaving a sliver
// of the backdrop so it reads as an overlay, not a page.
const SIDEBAR_MOBILE_WIDTH = 300;

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

export type PeekPhase = "hidden" | "entering" | "open" | "leaving";

export function EditorLayoutProvider({ children }: EditorLayoutProviderProps) {
  // Breakpoints: <768 mobile, 768–1024 tablet, >=1024 desktop.
  const isMobile = useMediaQuery("max", "md");
  // const isTabletUp = useMediaQuery("min", "md");
  const isDesktop = useMediaQuery("min", "lg");
  const mode: LayoutMode = isMobile
    ? "mobile"
    : isDesktop
      ? "desktop"
      : "tablet";

  const [collapsed, setCollapsed] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [expandedWidth, setExpandedWidth] = useState<number>(loadStoredWidth);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<"pages" | "inbox" | "trash">(
    "pages",
  );
  const [commentModeOverride, setCommentModeOverride] = useState<
    "sidebar" | "popover" | null
  >(null);

  const commentDisplayMode: "sidebar" | "popover" =
    mode === "mobile" || mode === "tablet"
      ? "popover"
      : (commentModeOverride ?? "sidebar");

  const setCommentDisplayMode = (m: "sidebar" | "popover") =>
    setCommentModeOverride(m);

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

  // On mobile the sidebar is an OVERLAY — it must impose NO width on the editor
  // (content goes full-bleed, drawer floats above). On desktop/tablet it's a
  // panel that pushes the editor over by its width.
  const sidebarWidth =
    mode === "mobile"
      ? SIDEBAR_COLLAPSED_WIDTH
      : collapsed
        ? SIDEBAR_COLLAPSED_WIDTH
        : expandedWidth;

  // The drawer's own rendered width — what the sidebar element is actually
  // sized to when open. Separate from the offset above.
  const drawerWidth = mode === "mobile" ? SIDEBAR_MOBILE_WIDTH : expandedWidth;

  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const [editorLeft, setEditorLeft] = useState(0);
  const paddingLeft = collapsed ? 100 : PADDING_LEFT;

  const onCollapsedChange = useCallback((v: boolean) => setCollapsed(v), []);
  const onVersionHistoryOpenChanged = useCallback(
    (v: boolean) => setVersionHistoryOpen(v),
    [],
  );

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

  const [sidebarHovered, setSidebarHovered] = useState(false);

  return (
    <EditorLayoutContext.Provider
      value={{
        mode,
        sidebarWidth,
        drawerWidth,
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
        peeking,
        onPeekChange,
        collapseWithFloat,
        openPeek,
        closePeek,
        peekPhase,
        discussionOpen,
        onDiscussionOpenChanged: setDiscussionOpen,
        sidebarView,
        setSidebarView,
        commentDisplayMode,
        setCommentDisplayMode,
        sidebarHovered,
        setSidebarHovered,
      }}
    >
      {children}
    </EditorLayoutContext.Provider>
  );
}
