import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Plus } from "src/components/icons";
import {
  ROW_HEIGHT,
  dayAt,
  daySpan,
  rowAt,
  rowTop,
  type TimelineRange,
} from "../../hooks/use-timeline-layout";

// The empty grid, made into a way of making a page.
//
// The table view puts "+ New page" on the row you hover, because there a row
// IS the page. A timeline row is a page's whole life, so hovering a row says
// nothing: what the click has to carry is a date. So the placeholder stands
// on the day under the pointer, and a drag across days sets both dates at
// once — which is the thing a timeline is for.
//
// It sits under the bars rather than over them: the bars come later in the
// gantt body, so they take their own pointer events and no placeholder ever
// appears on top of a record.

interface Pending {
  row: number;
  from: number;
  to: number;
}

interface TimelinePlaceholderProps {
  range: TimelineRange;
  /** Rows in the body, including the empty one under the last record. */
  rowCount: number;
  /** Make the page. The dates are whole days, start and end inclusive. */
  onCreate: (start: Date, end: Date, title: string) => void;
}

export function TimelinePlaceholder({
  range,
  rowCount,
  onCreate,
}: TimelinePlaceholderProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Pending | null>(null);
  const [drawing, setDrawing] = useState<Pending | null>(null);
  /** Set once the drag ends: the placeholder is now a title waiting to be
   *  typed. Nothing is made until it is. */
  const [naming, setNaming] = useState<Pending | null>(null);

  const dayCount = range.days.length;

  function cellAt(e: { clientX: number; clientY: number }): Pending | null {
    const box = layerRef.current?.getBoundingClientRect();
    if (!box) return null;
    const day = dayAt(e.clientX - box.left, dayCount);
    return { row: rowAt(e.clientY - box.top, rowCount), from: day, to: day };
  }

  function onMove(e: ReactPointerEvent) {
    if (naming) return;
    const cell = cellAt(e);
    if (!cell) return;
    if (drawing) {
      setDrawing({ ...drawing, to: cell.from });
      return;
    }
    setHover(cell);
  }

  function onDown(e: ReactPointerEvent) {
    if (naming || e.button !== 0) return;
    const cell = cellAt(e);
    if (!cell) return;
    // The caret has no business here: this is grid, not text.
    e.preventDefault();
    layerRef.current?.setPointerCapture(e.pointerId);
    setDrawing(cell);
    setHover(null);
  }

  function onUp(e: ReactPointerEvent) {
    if (!drawing) return;
    const cell = cellAt(e);
    const span = { ...drawing, to: cell ? cell.from : drawing.to };
    setDrawing(null);
    setNaming(span);
  }

  function commit(title: string) {
    const span = naming;
    setNaming(null);
    if (!span) return;
    const trimmed = title.trim();
    // An empty title means the page was never wanted: nothing is made, so
    // the grid doesn't fill up with Untitled every time a click slips.
    if (!trimmed) return;
    const from = Math.min(span.from, span.to);
    const to = Math.max(span.from, span.to);
    const start = range.days[from];
    const end = range.days[to];
    if (!start || !end) return;
    onCreate(start, end, trimmed);
  }

  const showing = naming ?? drawing ?? hover;
  const geo = showing ? daySpan(showing.from, showing.to) : null;

  return (
    <div
      ref={layerRef}
      className="db-tl-placeholder-layer"
      contentEditable={false}
      style={{ height: rowCount * ROW_HEIGHT }}
      onPointerMove={onMove}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={() => {
        if (!drawing && !naming) setHover(null);
      }}
    >
      {showing && geo && (
        <div
          className="db-tl-placeholder"
          data-state={naming ? "naming" : drawing ? "drawing" : "hover"}
          style={{
            left: geo.left + 2,
            width: geo.width - 4,
            top: rowTop(showing.row) + (ROW_HEIGHT - 24) / 2,
          }}
        >
          {naming ? (
            <input
              autoFocus
              type="text"
              className="db-tl-placeholder__title"
              placeholder="New page"
              aria-label="Title of the new page"
              onKeyDown={(e) => {
                // The editor is listening too; these keys are this input's.
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit(e.currentTarget.value);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setNaming(null);
                }
              }}
              onBlur={(e) => commit(e.target.value)}
            />
          ) : drawing ? (
            <span className="db-tl-placeholder__days">
              {geo.days} {geo.days === 1 ? "day" : "days"}
            </span>
          ) : (
            <>
              <Plus className="tiptap-button-icon" size={12} />
              {/* A day is 40px, so the words don't fit inside it. They spill
                  out to the right instead, the way a bar's title does, which
                  is the only way they are ever read. */}
              <span className="db-tl-placeholder__label">New page</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
