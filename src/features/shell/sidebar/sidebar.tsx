import { memo } from "react";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { useEditorLayout } from "../context/editor-layout-context";
import { useLayoutMode } from "../hooks/use-layout-mode";
import { calculateDrawerWidth, calculateSidebarWidth } from "src/lib/utils";
import { SidebarHeader } from "./sidebar-header";
import { SidebarBody } from "./sidebar-body";
import { SidebarFooter } from "./sidebar-footer";
import { CustomizeSidebarPanel } from "./customize-sidebar-panel";
import { useSectionOrder } from "../hooks/use-sidebar-order";
import { useHiddenSections } from "../hooks/use-hidden-sections";
import { createPortal } from "react-dom";
import "./sidebar.scss";
import { SidebarResizeHandle } from "./sidebar-resize-handle";
import { useSpaceAccent } from "../space-accent/space-accent";
import { ThemeSheet } from "../appearance/theme-sheet";

export const Sidebar = memo(() => {
  const {
    collapsed,
    peeking,
    openPeek,
    closePeek,
    peekPhase: phase,
    expandedWidth,
    customizeSidebarOpen,
    setCustomizeSidebarOpen,
    onCollapsedChange,
  } = useEditorLayout();
  const { mode, isMobile } = useLayoutMode();
  const drawerWidth = calculateDrawerWidth(mode, expandedWidth);
  const sidebarWidth = calculateSidebarWidth(mode, collapsed, expandedWidth);

  const floatingActive = !isMobile && collapsed && phase !== "hidden";
  // Visible position: on-screen while open OR during the grace period of leaving.
  // Only 'hidden' (after the timer) actually moves it off.
  const onScreen = phase === "open" || phase === "leaving";
  const showContent = isMobile ? true : !collapsed || floatingActive;

  const [order] = useSectionOrder();
  const [hidden, toggleHidden] = useHiddenSections();

  const accent = useSpaceAccent();

  const sidebarCard = (
    <Card
      className={`sidebar ${collapsed ? "sidebar--collapsed" : ""} ${
        isMobile ? "sidebar-mobile" : ""
      } ${floatingActive ? "sidebar--floating" : ""} ${
        accent ? "sidebar--accent" : ""
      }`}
      onMouseEnter={() => {
        if (!isMobile && collapsed) openPeek();
      }}
      onMouseLeave={() => {
        if (!isMobile) closePeek();
      }}
      style={{
        ...accent?.style,
        zIndex: isMobile ? 950 : floatingActive ? 900 : 120,
        position: "fixed",
        left: 0,
        top: floatingActive ? "12%" : 0,
        borderRadius: 0,
        borderTopRightRadius: floatingActive ? "var(--tt-radius-xl)" : 0,
        borderBottomRightRadius: floatingActive ? "var(--tt-radius-xl)" : 0,
        width: isMobile
          ? "min(300px, 89vw)"
          : floatingActive
            ? drawerWidth
            : sidebarWidth,
        // On a phone, 100vh is the screen with the browser's bars hidden,
        // taller than what shows while they're out: the dock at the bottom
        // ended up under them. 100dvh is what's visible.
        height: floatingActive
          ? "min(600px, calc(var(--app-vh, 100vh) - 32px))"
          : isMobile
            ? "var(--app-vh, 100dvh)"
            : "var(--app-vh, 100vh)",
        transform:
          isMobile && collapsed
            ? "translateX(-100%)"
            : floatingActive
              ? onScreen
                ? "translateX(0)"
                : "translateX(-110%)"
              : collapsed
                ? "translateX(-110%)"
                : "translateX(0)",
        transition:
          phase === "leaving" || phase === "hidden"
            ? "transform 0.3s cubic-bezier(0.4, 0, 1, 1)" // smooth accelerate-out
            : "transform 0.24s cubic-bezier(0.32, 0.72, 0, 1)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {showContent && !peeking && <SidebarHeader />}

      {!isMobile && collapsed && floatingActive && (
        <div
          onMouseEnter={openPeek}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            // Wide enough to cover the card's left edge (left:8 + shadow) AND the
            // diagonal path down from the toolbar hamburger. Full height so the
            // vertically-centered card is always reachable without crossing a gap.
            width: Math.max(28, 8 + 20),
            height: "var(--app-vh, 100vh)",
            zIndex: 899,
          }}
        />
      )}

      {showContent && !customizeSidebarOpen && <SidebarBody />}

      {showContent && !peeking && !customizeSidebarOpen && <SidebarFooter />}

      {customizeSidebarOpen && (
        <CustomizeSidebarPanel
          order={order}
          hidden={hidden}
          onToggle={toggleHidden}
          onDone={() => setCustomizeSidebarOpen?.(false)}
        />
      )}

      <SidebarResizeHandle />
    </Card>
  );
  // On a phone the open sidebar is a drawer over the page: dim the page behind
  // it so the editor doesn't compete for attention, and tap it to close.
  const backdrop = (
    <div
      className={`sidebar-backdrop${!collapsed ? " is-open" : ""}`}
      aria-hidden="true"
      onClick={() => onCollapsedChange(true)}
    />
  );
  // Drawn outside the sidebar card: the card's z-index would trap it.
  const sheet = (
    <ThemeSheet left={collapsed ? 0 : sidebarWidth} flush={isMobile} />
  );

  return mode === "mobile" ? (
    <>
      {createPortal(
        <>
          {backdrop}
          {sidebarCard}
        </>,
        document.body,
      )}
      {sheet}
    </>
  ) : (
    <>
      {sidebarCard}
      {sheet}
    </>
  );
});
