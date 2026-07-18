import { useCallback, useEffect, useRef } from "react";
import { recordSelection } from "../utils/record-selection-store";

type RowRect = { id: string; top: number; bottom: number };

/**
 * Click-and-drag across rows to select them, like dragging over text.
 *
 * Deliberately NOT built on document/ProseMirror selection: a selection
 * spanning databaseRecord nodes has no meaningful PM representation, and
 * keeping a custom Selection class mapped through every transaction is a large
 * ongoing cost. Instead we intercept the pointer and hit-test row rects.
 */
export function useRowDragSelect(
  databaseId: string | null,
  gridEl: HTMLElement | null,
) {
  const rowsRef = useRef<RowRect[]>([]);
  const anchorIndexRef = useRef<number | null>(null);
  const baseRef = useRef<string[]>([]);
  const draggingRef = useRef(false);

  /** Measure painted rows: skips filtered-out (display:none → zero rect) and
   *  respects the view's visual order rather than document order. */
  const measureRows = useCallback((): RowRect[] => {
    if (!gridEl) return [];
    return Array.from(
      gridEl.querySelectorAll<HTMLElement>(".db-record[data-record-id]"),
    )
      .map((el) => {
        const box =
          (el.closest(
            ".react-renderer.node-databaseRecord",
          ) as HTMLElement | null) ?? el;
        const r = box.getBoundingClientRect();
        return { id: el.dataset.recordId!, top: r.top, bottom: r.bottom };
      })
      .filter((r) => r.bottom > r.top)
      .sort((a, b) => a.top - b.top);
  }, [gridEl]);

  const indexAtY = useCallback((y: number) => {
    const rows = rowsRef.current;
    if (rows.length === 0) return null;
    if (y <= rows[0].top) return 0;
    if (y >= rows[rows.length - 1].bottom) return rows.length - 1;
    const i = rows.findIndex((r) => y >= r.top && y <= r.bottom);
    return i === -1 ? null : i;
  }, []);

  const apply = useCallback(
    (currentIndex: number) => {
      if (!databaseId || anchorIndexRef.current === null) return;
      const a = anchorIndexRef.current;
      const [start, end] =
        a <= currentIndex ? [a, currentIndex] : [currentIndex, a];
      const range = rowsRef.current.slice(start, end + 1).map((r) => r.id);
      recordSelection.set(
        databaseId,
        Array.from(new Set([...baseRef.current, ...range])),
      );
    },
    [databaseId],
  );

  const beginDrag = useCallback(
    (recordId: string, e: React.PointerEvent) => {
      if (!databaseId) return;

      // Stop PM from starting a text selection / node drag under us.
      e.preventDefault();
      e.stopPropagation();

      rowsRef.current = measureRows();
      const index = rowsRef.current.findIndex((r) => r.id === recordId);
      if (index === -1) return;

      anchorIndexRef.current = index;
      // Additive with shift/ctrl/cmd; otherwise the drag replaces the selection.
      baseRef.current =
        e.shiftKey || e.metaKey || e.ctrlKey
          ? [...recordSelection.get(databaseId)]
          : [];
      draggingRef.current = true;
      document.body.classList.add("db-row-dragselect");

      apply(index);
    },
    [databaseId, measureRows, apply],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const i = indexAtY(e.clientY);
      if (i !== null) apply(i);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      anchorIndexRef.current = null;
      document.body.classList.remove("db-row-dragselect");
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.body.classList.remove("db-row-dragselect");
    };
  }, [indexAtY, apply]);

  return { beginDrag };
}
