import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ROW_HEIGHT, type CellUnit } from "../../hooks/use-timeline-layout";

// Dragging a card.
//
// Sideways it moves the record's dates, a column at a time — an hour, a day,
// a week or a month, whichever the timeframe draws. Up and down it moves the
// record's row, which is the same move the drag handle makes on the table
// beside the grid, and ends in the same place (reorderRecord).
//
// One gesture does both: where a card is dropped is a date and a row, and
// asking for two drags to say that would be worse. Nothing is written until
// the drop, and a drag that ends where it began writes nothing at all.
//
// The card is also a link — clicking it opens the record — so a press only
// becomes a drag after a few pixels, and a press that became one swallows
// the click that follows it.

/** How far the pointer moves before a press counts as a drag, in pixels. */
const THRESHOLD = 4;

export interface BarDragState {
  /** Columns moved, snapped. Positive is later. */
  columns: number;
  /** Rows moved, snapped. Positive is further down. */
  rows: number;
}

interface Options {
  /** Where this record sits in the view's order. */
  index: number;
  /** How many records there are, so a drag cannot leave the list. */
  rowCount: number;
  /** The width of a column in this timeframe. */
  cellWidth: number;
  unit: CellUnit;
  /** Dragging is off while the view is locked or the card is being resized. */
  disabled?: boolean;
  /** The drop. Called once, with whatever actually changed. */
  onDrop: (state: BarDragState) => void;
}

export function useTimelineBarDrag({
  index,
  rowCount,
  cellWidth,
  disabled,
  onDrop,
}: Options) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const [drag, setDrag] = useState<BarDragState | null>(null);

  /** Snapped to columns and rows, and kept inside the list. */
  const stateAt = (e: { clientX: number; clientY: number }): BarDragState => {
    const from = origin.current;
    if (!from) return { columns: 0, rows: 0 };
    const rows = Math.round((e.clientY - from.y) / ROW_HEIGHT);
    return {
      columns: Math.round((e.clientX - from.x) / cellWidth),
      rows: Math.max(-index, Math.min(rowCount - 1 - index, rows)),
    };
  };

  function onPointerDown(e: ReactPointerEvent) {
    // The right edge resizes; a cell in the card's property row is its own
    // control; the left button only.
    if (disabled || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest(".db-tl-bar__resize-handle, .db-tl-bar__props")) return;
    origin.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    // No pointer capture here. While an element holds the pointer, the
    // click that follows is delivered to THAT element — so capturing on
    // the way down sent every click to this box and the card inside it,
    // which is what opens the record, never saw one. The capture is taken
    // below, once the press has turned into a drag and there is no click
    // left to deliver.
  }

  function onPointerMove(e: ReactPointerEvent) {
    const from = origin.current;
    if (!from) return;
    if (
      !moved.current &&
      Math.abs(e.clientX - from.x) < THRESHOLD &&
      Math.abs(e.clientY - from.y) < THRESHOLD
    )
      return;
    if (!moved.current) {
      moved.current = true;
      // Now that it is a drag, the pointer belongs to this card: it keeps
      // receiving moves after it has been dragged off itself, and the drop
      // still arrives if it ends somewhere else entirely.
      const el = e.currentTarget as HTMLElement;
      if (typeof el.setPointerCapture === "function") {
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // A pointer that is already gone cannot be captured; the drag
          // still works from the events that do arrive.
        }
      }
    }
    // The caret has no business here: this is a card, not text.
    e.preventDefault();
    setDrag(stateAt(e));
  }

  function onPointerUp(e: ReactPointerEvent) {
    const was = moved.current;
    const state = stateAt(e);
    origin.current = null;
    setDrag(null);
    if (!was) return;
    if (state.columns !== 0 || state.rows !== 0) onDrop(state);
  }

  function onClickCapture(e: ReactPointerEvent | React.MouseEvent) {
    // The click that ends a drag is not a click on the card.
    if (!moved.current) return;
    moved.current = false;
    e.preventDefault();
    e.stopPropagation();
  }

  return {
    drag,
    isDragging: drag !== null,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onClickCapture,
    },
  };
}
