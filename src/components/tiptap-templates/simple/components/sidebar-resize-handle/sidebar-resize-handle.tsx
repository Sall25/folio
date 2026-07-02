import { useCallback, useRef } from "react";
import { useEditorLayout } from "../../context/editor-layout-context";
import "./sidebar-resize-handle.scss";

// Invisible-until-hovered strip on the sidebar's right edge. Pointer capture
// keeps the drag alive even when the cursor leaves the strip; width updates
// are rAF-throttled so pointermove floods don't outpace React.
export function SidebarResizeHandle() {
  const {
    collapsed,
    isResizingSidebar,
    setSidebarWidth,
    onSidebarResizingChange,
  } = useEditorLayout();
  const rafRef = useRef<number | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (collapsed || e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      onSidebarResizingChange(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [collapsed, onSidebarResizingChange],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const x = e.clientX;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        // Sidebar is fixed at left: 0, so the pointer's clientX IS the width.
        setSidebarWidth(x);
      });
    },
    [setSidebarWidth],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      onSidebarResizingChange(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    },
    [onSidebarResizingChange],
  );

  if (collapsed) return null;

  return (
    <div
      className={[
        "sidebar-resize-handle",
        isResizingSidebar && "sidebar-resize-handle--active",
      ]
        .filter(Boolean)
        .join(" ")}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    />
  );
}
