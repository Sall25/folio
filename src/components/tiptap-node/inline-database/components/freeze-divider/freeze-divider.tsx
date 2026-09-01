import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { DatabaseProperty } from "src/types";
import "./freeze-divider.scss";

type Boundary = { propId: string; x: number };

/**
 * Drag-to-freeze divider — a handle on the header that snaps to column
 * boundaries. Dragging right freezes more columns, left freezes fewer, and
 * past the first boundary unfreezes entirely.
 *
 * PORTALED to document.body and pinned with position:fixed. It can't live in
 * the table: ancestors clip it (.simple-editor-main overflow-x:hidden, plus
 * the paint containment implied by content-visibility:auto on
 * .tiptap.ProseMirror), which cut it off at the default (unfrozen) position.
 *
 * Position is written straight to the DOM rather than held in state — nothing
 * else renders from it, and this keeps the drag at zero re-renders per move.
 */
export function FreezeDivider({
  containerRef,
  visibleProperties,
  frozenPropertyId,
  onFreeze,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  visibleProperties: DatabaseProperty[];
  frozenPropertyId: string | null;
  onFreeze: (propId: string | null) => void;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const boundsRef = useRef<Boundary[]>([]);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);

  const handleRef = useRef<HTMLSpanElement | null>(null);

  /** Put the grip at the pointer's height — the user never hunts for it. */
  const placeHandle = useCallback((clientY: number) => {
    const el = elRef.current;
    const handle = handleRef.current;
    if (!el || !handle) return;
    const r = el.getBoundingClientRect();
    // Rect height, not offsetHeight — the root is width:0 with absolutely
    // positioned children, so offsetHeight is 0 and the clamp collapsed to a
    // constant, pinning the grip to the top.
    if (r.height === 0) return;
    const y = Math.max(9, Math.min(r.height - 9, clientY - r.top));
    handle.style.top = `${y}px`;
  }, []);

  /** Right edge of every visible header, in VIEWPORT px (the divider is fixed). */
  const measure = useCallback((): Boundary[] => {
    const container = containerRef.current;
    if (!container) return [];
    return visibleProperties
      .map((p) => {
        const el = container.querySelector<HTMLElement>(
          `.db-th[data-prop-id="${p.id}"]`,
        );
        if (!el) return null;
        return { propId: p.id, x: el.getBoundingClientRect().right };
      })
      .filter((b): b is Boundary => b !== null)
      .sort((a, b) => a.x - b.x);
  }, [containerRef, visibleProperties]);

  /** Write position + vertical extent to the element. */
  const place = useCallback(
    (x: number) => {
      const el = elRef.current;
      const container = containerRef.current;
      if (!el || !container) return;
      const r = container.getBoundingClientRect();
      el.style.left = `${x}px`;
      el.style.top = `${r.top}px`;
      el.style.height = `${r.height}px`;
    },
    [containerRef],
  );

  /** Park on the current boundary. When nothing is frozen, park at the first
   *  column's LEFT edge — the start of the columns, past the drag-handle gutter
   *  that sits to the left of it. Parking at the container's left edge instead
   *  put the divider's hit strip on top of that gutter, swallowing the row
   *  hover and hiding the row drag handle. */
  const settle = useCallback(() => {
    if (draggingRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const bounds = measure();
    if (bounds.length === 0) return;
    if (frozenPropertyId) {
      const target = bounds.find((b) => b.propId === frozenPropertyId);
      place(target?.x ?? bounds[0].x);
    } else {
      // Unfrozen: park at the first column's left edge, not the table's left
      // edge — clears the drag-handle gutter.
      const firstProp = visibleProperties[0];
      const firstEl = firstProp
        ? container.querySelector<HTMLElement>(
            `.db-th[data-prop-id="${firstProp.id}"]`,
          )
        : null;
      const startX = firstEl
        ? firstEl.getBoundingClientRect().left
        : container.getBoundingClientRect().left;
      place(startX);
    }
  }, [frozenPropertyId, measure, place, containerRef, visibleProperties]);

  // Pushes to the DOM, never setState — no cascading render.
  useLayoutEffect(settle, [settle]);

  // Fixed positioning doesn't follow content, so re-place on any scroll or
  // resize. capture:true catches ancestor scrollers, not just window.
  useEffect(() => {
    let raf: number | null = null;
    const schedule = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        settle();
      });
    };
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [settle]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    boundsRef.current = measure();
    draggingRef.current = true;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const bounds = boundsRef.current;
    if (bounds.length === 0) return;
    // Follow the pointer freely — snapping on every move makes the drag feel
    // notchy. The boundary is only resolved on release.
    const min = bounds[0].x - 40;
    const max = bounds[bounds.length - 1].x;
    place(Math.min(max, Math.max(min, e.clientX)));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    const bounds = boundsRef.current;
    if (bounds.length === 0) return;

    // Resolve to the nearest boundary now, on release.
    const px = e.clientX;
    let nearest = bounds[0];
    for (const b of bounds) {
      if (Math.abs(b.x - px) < Math.abs(nearest.x - px)) nearest = b;
    }
    const next = px < bounds[0].x - 24 ? null : nearest.propId;

    // settle() runs from the layout effect once frozenPropertyId updates; if
    // it didn't change, snap back here since no re-render is coming.
    if (next !== frozenPropertyId) onFreeze(next);
    else settle();
  };

  // Nothing frozen → no divider at all. A freeze is created from the property
  // menu; the divider only exists to show/adjust an existing freeze.
  if (!frozenPropertyId) return null;

  return createPortal(
    <div
      ref={elRef}
      className="db-freeze-divider"
      data-dragging={dragging || undefined}
      data-active={frozenPropertyId ? true : undefined}
      data-hovered={hovering || undefined}
      contentEditable={false}
      title="Drag horizontally to freeze columns"
      role="separator"
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <span
        className="db-freeze-divider__hit"
        onPointerEnter={(e) => {
          setHovering(true);
          placeHandle(e.clientY);
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) placeHandle(e.clientY);
        }}
        onPointerLeave={() => setHovering(false)}
      />
      <span ref={handleRef} className="db-freeze-divider__handle" />
      <span className="db-freeze-divider__line" />
    </div>,
    document.body,
  );
}
