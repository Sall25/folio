import type { Editor } from "@tiptap/core";
import type { Fragment, Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

// Drop a block on the left or right edge of another block to put the two
// side by side: the target and the dragged blocks become a new columns block
// (two columns, half each). Works on the page's top-level blocks; blocks
// already in columns have their own drop zones (column-view.tsx), which add
// a column to the row instead.
//
// While a block from the drag handle is over an edge, a vertical line marks
// the side it will land on, and the usual horizontal drop line is hidden
// (body.column-edge-hover), so only one of the two shows.

const EDGE_MIN = 24;
const EDGE_MAX = 64;
const EDGE_SHARE = 0.12;
// Blocks that never sit in a column.
const NOT_IN_COLUMNS = new Set(["title", "columnBlock", "column"]);

type Side = "left" | "right";
type Hover = { pos: number; side: Side };

// Set while a block is being dragged from the handle (drag-handle.tsx).
let dragging = false;
document.addEventListener("draghandle:dragstart", () => {
  dragging = true;
});
document.addEventListener("draghandle:dragend", () => {
  dragging = false;
});

/** The range being moved: the drag handle selects the dragged block (or
 *  blocks) when the drag starts. */
function movedRange(view: EditorView): { from: number; to: number } {
  const { from, to } = view.state.selection;
  return { from, to };
}

/** The top-level block at the pointer and the edge it's on, if any. */
function hoverAt(
  view: EditorView,
  editor: Editor,
  x: number,
  y: number,
): Hover | null {
  if (editor.storage.paragraph?.isDatabasePage) return null;

  const box = view.dom.getBoundingClientRect();
  const hit = view.posAtCoords({
    left: Math.min(Math.max(x, box.left + 1), box.right - 1),
    top: y,
  });
  if (!hit) return null;

  const { doc } = view.state;
  const $hit = doc.resolve(hit.pos);
  if ($hit.depth < 1) return null;
  const { columnBlock } = view.state.schema.nodes;
  // Containers that keep their own rules: a column's blocks use the column
  // drop zones (column-view), list items and table cells don't take columns.
  const SKIP_PARENTS = new Set([
    "column",
    "listItem",
    "taskItem",
    "tableCell",
    "tableHeader",
  ]);

  let pos = -1;
  let node: PMNode | null = null;
  for (let d = $hit.depth; d >= 1; d--) {
    const candidate = $hit.node(d);
    const parent = $hit.node(d - 1);
    const index = $hit.index(d - 1);
    if (!candidate.isBlock || NOT_IN_COLUMNS.has(candidate.type.name)) continue;
    if (SKIP_PARENTS.has(parent.type.name)) continue;
    // The parent's schema must allow a columns block in this child's place.
    if (!parent.canReplaceWith(index, index + 1, columnBlock)) continue;
    pos = $hit.before(d);
    node = candidate;
    break;
  }
  if (!node || pos < 0) return null;

  const dom = view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) return null;
  const rect = dom.getBoundingClientRect();
  if (y < rect.top || y > rect.bottom) return null;

  const edge = Math.min(Math.max(rect.width * EDGE_SHARE, EDGE_MIN), EDGE_MAX);
  // Left: just inside the block's left edge (left of it is where the drag
  // handle is, so a plain move up or down stays a plain move). Right: near
  // the right edge or past it.
  const side: Side | null =
    x >= rect.left && x < rect.left + edge
      ? "left"
      : x > rect.right - edge
        ? "right"
        : null;
  if (!side) return null;

  // Not onto the blocks being dragged.
  const moved = movedRange(view);
  if (pos >= moved.from && pos < moved.to) return null;

  return { pos, side };
}

/** The dragged blocks, when they can go in a column. */
function draggedBlocks(content: Fragment, openStart: number): Fragment | null {
  if (openStart !== 0 || content.childCount === 0) return null;
  let ok = true;
  content.forEach((child) => {
    if (!child.isBlock || NOT_IN_COLUMNS.has(child.type.name)) ok = false;
  });
  return ok ? content : null;
}

function isEmptyColumn(column: PMNode): boolean {
  if (column.childCount === 0) return true;
  if (column.childCount > 1) return false;
  const only = column.child(0);
  return only.type.name === "paragraph" && only.content.size === 0;
}

/**
 * The blocks were dragged out of a column and left it empty (nothing, or
 * the one empty paragraph a column keeps at its end): drop the
 * column, and the share it had goes to the others. A row left with one
 * column isn't a row any more, so it's replaced by that column's blocks.
 */
function closeEmptyColumn(tr: Transaction, at: number) {
  const $at = tr.doc.resolve(Math.min(at, tr.doc.content.size));
  const column = $at.parent;
  if (column.type.name !== "column" || !isEmptyColumn(column)) return;
  const rowDepth = $at.depth - 1;
  const row = $at.node(rowDepth);
  if (row.type.name !== "columnBlock") return;
  const rowPos = $at.before(rowDepth);
  const columnIndex = $at.index(rowDepth);

  const rest: PMNode[] = [];
  row.forEach((child, _offset, index) => {
    if (index !== columnIndex) rest.push(child);
  });

  if (rest.length <= 1) {
    const blocks: PMNode[] = [];
    rest[0]?.forEach((block) => blocks.push(block));
    // The empty paragraph a column keeps at its end isn't content.
    const last = blocks[blocks.length - 1];
    if (
      blocks.length > 1 &&
      last.type.name === "paragraph" &&
      last.content.size === 0
    )
      blocks.pop();
    if (blocks.length === 0)
      blocks.push(tr.doc.type.schema.nodes.paragraph.create());
    tr.replaceWith(rowPos, rowPos + row.nodeSize, blocks);
    return;
  }

  const width = `${Math.round((100 / rest.length) * 10) / 10}%`;
  const columns = rest.map((child) =>
    child.type.create({ ...child.attrs, width }, child.content, child.marks),
  );
  tr.replaceWith(
    rowPos,
    rowPos + row.nodeSize,
    row.type.create(row.attrs, columns),
  );
}

export function columnEdgeDropPlugin(editor: Editor) {
  let hover: Hover | null = null;
  let line: HTMLDivElement | null = null;

  const clear = () => {
    hover = null;
    line?.remove();
    line = null;
    document.body.classList.remove("column-edge-hover");
  };

  const show = (view: EditorView, next: Hover) => {
    hover = next;
    const dom = view.nodeDOM(next.pos) as HTMLElement | null;
    if (!dom) return clear();
    const rect = dom.getBoundingClientRect();
    if (!line) {
      line = document.createElement("div");
      line.className = "column-edge-line";
      document.body.appendChild(line);
    }
    line.style.top = `${rect.top}px`;
    line.style.height = `${rect.height}px`;
    line.style.left = `${next.side === "left" ? rect.left - 6 : rect.right + 2}px`;
    document.body.classList.add("column-edge-hover");
  };

  return new Plugin({
    key: new PluginKey("columnEdgeDrop"),

    view(view) {
      // Capture phase, before the drop line's own listener: over an edge we
      // take the event so only the vertical line shows.
      const onDragOver = (event: DragEvent) => {
        if (!dragging || !editor.isEditable) return clear();
        // Over a column's own drop zone: column.ts handles that.
        const target = event.target as HTMLElement | null;
        if (target?.closest?.("[data-drop-zone]")) return clear();

        const next = hoverAt(view, editor, event.clientX, event.clientY);
        if (!next) return clear();
        event.preventDefault();
        event.stopImmediatePropagation();
        show(view, next);
      };
      const onDragLeave = (event: DragEvent) => {
        const to = event.relatedTarget as Node | null;
        if (!to || !view.dom.contains(to)) clear();
      };
      const onEnd = () => clear();

      view.dom.addEventListener("dragover", onDragOver, true);
      view.dom.addEventListener("dragleave", onDragLeave);
      document.addEventListener("dragend", onEnd);
      document.addEventListener("drop", onEnd);
      return {
        destroy() {
          clear();
          view.dom.removeEventListener("dragover", onDragOver, true);
          view.dom.removeEventListener("dragleave", onDragLeave);
          document.removeEventListener("dragend", onEnd);
          document.removeEventListener("drop", onEnd);
        },
      };
    },

    props: {
      handleDrop(view, event, slice, moved) {
        const at = hover;
        clear();
        if (!at || !moved) return false;
        // The pointer may have moved since the last dragover.
        const now = hoverAt(view, editor, event.clientX, event.clientY);
        if (!now || now.pos !== at.pos || now.side !== at.side) return false;

        const blocks = draggedBlocks(slice.content, slice.openStart);
        const { state } = view;
        const target = state.doc.nodeAt(at.pos);
        const { column, columnBlock } = state.schema.nodes;
        if (!blocks || !target || !column || !columnBlock) return false;

        const half = "50%";
        const targetColumn = column.create({ width: half }, target);
        const draggedColumn = column.create({ width: half }, blocks);
        const row: PMNode = columnBlock.create(
          null,
          at.side === "left"
            ? [draggedColumn, targetColumn]
            : [targetColumn, draggedColumn],
        );

        const source = movedRange(view);
        const tr = state.tr;
        tr.replaceWith(at.pos, at.pos + target.nodeSize, row);
        // Then remove the blocks from where they were, through the mapping
        // of the step above, so the right range goes.
        const from = tr.mapping.map(source.from);
        const to = tr.mapping.map(source.to);
        if (to > from) {
          tr.delete(from, to);
          closeEmptyColumn(tr, from);
        }
        tr.setMeta("uiEvent", "drop");

        event.preventDefault();
        view.dispatch(tr.scrollIntoView());
        return true;
      },
    },
  });
}
