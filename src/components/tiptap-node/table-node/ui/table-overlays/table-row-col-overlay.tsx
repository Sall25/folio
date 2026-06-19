import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTableOverlays } from "./use-table-overlays";

interface TableRowColOverlayProps {
  orientation?: "row" | "column";
  children: ReactNode;
  className?: string;
}

export function TableRowColOverlay({
  orientation,
  children,
  className,
}: TableRowColOverlayProps) {
  const { left, top, width, height } = useTableOverlays();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Measure the table's viewport rect from a zero-size anchor we drop into the
  // normal (non-portaled) tree. The anchor sits inside .table-overlays, so its
  // offsetParent chain reaches the table; we read the nearest .tableWrapper
  // table. position:fixed overlays are then placed against this live rect, so
  // they escape every clipping ancestor without needing the hook's coord space.
  useLayoutEffect(() => {
    const anchorEl = anchorRef.current;
    if (!anchorEl) return;
    const root = anchorEl.closest(".table-overlays");
    const tableEl = root?.querySelector("table") ?? null;
    if (!tableEl) return;

    const measure = () => setRect(tableEl.getBoundingClientRect());
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(tableEl);
    // reposition on scroll/resize so overlays track the table
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, []);

  if (width === 0 || height === 0) return null;

  // The zero-size anchor always renders in the normal tree (for measuring).
  const anchor = (
    <span
      ref={anchorRef}
      style={{ position: "absolute", width: 0, height: 0 }}
    />
  );

  if (!rect) return anchor;

  // `top`/`left`/`width`/`height` from the hook are offsets WITHIN the table's
  // coordinate space (same as before, when they were used with the table-flush
  // .table-overlays as positioning parent). We now add the table's viewport
  // origin (rect.left/rect.top) to place them with position:fixed.
  const overlay =
    orientation === "row" ? (
      <div
        className={className}
        style={{
          position: "fixed",
          top: rect.top + (top ?? 0),
          left: rect.left + 3,
          height,
        }}
      >
        {children}
      </div>
    ) : (
      <div
        className={className}
        style={{
          position: "fixed",
          left: rect.left + (left ?? 0),
          top: rect.top - 16,
          width,
          marginLeft: "20px",
        }}
      >
        {children}
      </div>
    );

  return (
    <>
      {anchor}
      {createPortal(overlay, document.body)}
    </>
  );
}
