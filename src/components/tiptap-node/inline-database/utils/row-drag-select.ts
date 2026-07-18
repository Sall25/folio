import { recordSelection } from "./record-selection-store";

type RowRect = { id: string; top: number; bottom: number };

const DRAG_THRESHOLD = 4; // px before a press becomes a drag

let rows: RowRect[] = [];
let anchorIndex: number | null = null;
let base: string[] = [];
let dbId: string | null = null;
let startRecordId: string | null = null;
let startY = 0;
let armed = false; // pointer is down, not yet a drag
let dragging = false; // movement exceeded the threshold

function measureRows(gridEl: HTMLElement): RowRect[] {
  return Array.from(
    gridEl.querySelectorAll<HTMLElement>(".db-record[data-record-id]"),
  )
    .map((el) => {
      const box =
        (el.closest(".react-renderer.node-databaseRecord") as HTMLElement) ??
        el;
      const r = box.getBoundingClientRect();
      return { id: el.dataset.recordId!, top: r.top, bottom: r.bottom };
    })
    .filter((r) => r.bottom > r.top)
    .sort((a, b) => a.top - b.top);
}

function indexAtY(y: number): number | null {
  if (rows.length === 0) return null;
  if (y <= rows[0].top) return 0;
  if (y >= rows[rows.length - 1].bottom) return rows.length - 1;
  const i = rows.findIndex((r) => y >= r.top && y <= r.bottom);
  return i === -1 ? null : i;
}

function apply(currentIndex: number) {
  if (!dbId || anchorIndex === null) return;
  const [start, end] =
    anchorIndex <= currentIndex
      ? [anchorIndex, currentIndex]
      : [currentIndex, anchorIndex];
  const range = rows.slice(start, end + 1).map((r) => r.id);
  // Union with whatever was selected before the drag started, so dragging
  // adds to the selection instead of replacing it.
  recordSelection.set(dbId, Array.from(new Set([...base, ...range])));
}

function onMove(e: PointerEvent) {
  if (!armed) return;
  if (!dragging) {
    if (Math.abs(e.clientY - startY) < DRAG_THRESHOLD) return;
    dragging = true;
    console.log("[dragselect] drag started");
    document.body.classList.add("db-row-dragselect");
  }
  const i = indexAtY(e.clientY);
  console.log("[dragselect] move", e.clientY, "→ index", i);
  if (i !== null) apply(i);
}

function onUp() {
  if (!armed) return;

  // No movement → it was a click, not a drag. Toggle just this row.
  if (!dragging && dbId && startRecordId) {
    recordSelection.toggle(dbId, startRecordId);
  }

  armed = false;
  dragging = false;
  anchorIndex = null;
  dbId = null;
  startRecordId = null;
  rows = [];
  document.body.classList.remove("db-row-dragselect");
  document.removeEventListener("pointermove", onMove);
  document.removeEventListener("pointerup", onUp);
  document.removeEventListener("pointercancel", onUp);
}

/**
 * Press-and-drag across rows to select a range; a plain click toggles one row.
 *
 * Not built on document/ProseMirror selection: a selection spanning
 * databaseRecord nodes has no meaningful PM representation, and maintaining a
 * custom Selection class through every transaction is a large ongoing cost.
 * We hit-test row rects instead — which is also what Notion does.
 *
 * `rowEl` is the row's own .db-record element; the grid is derived from it, so
 * this works even though the checkbox is portaled to document.body.
 */
export function beginRowDragSelect(
  databaseId: string,
  recordId: string,
  rowEl: HTMLElement | null,
  e: React.PointerEvent,
) {
  const grid = rowEl?.closest(".db-node-grid") as HTMLElement | null;
  console.log("[dragselect] down", { rowEl, grid, recordId });
  if (!grid) return console.warn("[dragselect] no grid — selector wrong");

  e.preventDefault();
  e.stopPropagation();

  rows = measureRows(grid);
  const index = rows.findIndex((r) => r.id === recordId);
  console.log("[dragselect] rows", rows.length, "index", index);
  if (index === -1) return console.warn("[dragselect] row not in measured set");

  // const grid = rowEl?.closest(".db-node-grid") as HTMLElement | null;
  // if (!grid) return;

  // // Stop PM from starting a text selection / node drag under us.
  // e.preventDefault();
  // e.stopPropagation();

  // rows = measureRows(grid);
  // const index = rows.findIndex((r) => r.id === recordId);
  // if (index === -1) return;

  dbId = databaseId;
  startRecordId = recordId;
  anchorIndex = index;
  startY = e.clientY;
  base = [...recordSelection.get(databaseId)];
  armed = true;
  dragging = false;

  // Deliberately NOT applying here — that's what made every click replace the
  // selection. Nothing changes until we know it's a drag (onMove) or a
  // click (onUp).

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}
