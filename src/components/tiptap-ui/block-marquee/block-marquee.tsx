import { useEffect } from "react";
import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import type { Node as PMNode, ResolvedPos } from "@tiptap/pm/model";
// Installed with @tiptap/extension-drag-handle (its peer dependency).
import { NodeRangeSelection } from "@tiptap/extension-node-range";
import "./block-marquee.scss";

// Drag-box selection, like Notion: press in the empty space around the
// text (the page margin, the gap between blocks) and drag a box; every
// block it touches is selected. The selection is a whole-block selection
// (see BlockSelection), so Delete, copy / cut, typing and dragging a handle
// all act on those blocks.
//
// A text selection that leaves the block it started in turns into the same
// whole-block selection: every block from the first to the one under the
// pointer. Back in the first block it's just that block, until the button
// is released.
//
// Everything runs on DOM listeners added here and plain variables: nothing
// re-renders while the box is drawn. The editor is only told the new
// selection when the set of touched blocks changes.

/** Where a drag may start (the editor's page area). */
const SURFACES = ".landing-page-surface, .simple-editor-center";

/** Things in that area that keep their own mouse behaviour. */
const EXCLUDE = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "label",
  "[role='button']",
  "[contenteditable='false']",
  ".drag-handle",
  ".column-drag-handle",
  ".block-comment-handle",
  ".tiptap-toolbar",
  ".cover-header-wrapper",
  ".landing-page-head",
  "[data-radix-popper-content-wrapper]",
  "[data-no-marquee]",
].join(",");

/** Blocks whose text selection stays text: they have their own range
 *  selection (tables, databases) or aren't content (the title). */
const TEXT_ONLY = new Set(["title", "database", "tableWrapper", "table"]);

/** Lists: a box or a drag inside one picks its items, not the whole list. */
const LISTS = new Set(["bulletList", "orderedList", "taskList"]);

/** Pixels the pointer must move before a press becomes a drag-box. */
const THRESHOLD = 5;
/** Distance from the edge of the scroll area where auto-scroll starts. */
const EDGE = 48;

function scrollParentOf(el: HTMLElement): HTMLElement {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (
      /(auto|scroll|overlay)/.test(overflowY) &&
      p.scrollHeight > p.clientHeight
    ) {
      return p;
    }
  }
  return (document.scrollingElement as HTMLElement) ?? document.documentElement;
}

export function BlockMarquee({ editor }: { editor: Editor | null }) {
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const view = editor.view;

    let pressing = false;
    let active = false;
    let onEditorPadding = false;
    let startX = 0;
    let startY = 0; // in scroll-content coordinates
    let pointerX = 0;
    let pointerY = 0;
    let scroller: HTMLElement = document.documentElement;
    let box: HTMLDivElement | null = null;
    let frame = 0;
    let lastRange = "";
    // A press in the text: the top-level block it started in, and whether
    // the selection has turned into a block selection.
    let textAnchor = -1;
    let textBlocks = false;

    const scrollTop = () =>
      scroller === document.scrollingElement
        ? window.scrollY
        : scroller.scrollTop;

    /** The document position under the pointer (kept inside the
     *  editor's width, so the margins count), or -1. */
    const posAt = (x: number, y: number): number => {
      const box = view.dom.getBoundingClientRect();
      const hit = view.posAtCoords({
        left: Math.min(Math.max(x, box.left + 1), box.right - 1),
        top: y,
      });
      return hit ? hit.pos : -1;
    };

    /** Where blocks are picked from: the column `$pos` is in, else the page. */
    const containerDepth = ($pos: ResolvedPos, upTo = $pos.depth) => {
      let depth = upTo;
      while (
        depth > 0 &&
        $pos.node(depth).type.name !== "column" &&
        !LISTS.has($pos.node(depth).type.name)
      )
        depth--;
      return depth;
    };

    type Blocks = { from: number; to: number; depth: number };

    /** The block holding `pos`, in its column or on the page. */
    const blockOf = (pos: number): Blocks | null => {
      const $pos = view.state.doc.resolve(pos);
      const depth = containerDepth($pos);
      if ($pos.depth <= depth) return null;
      const node = $pos.node(depth + 1);
      if (TEXT_ONLY.has(node.type.name)) return null;
      return { from: $pos.before(depth + 1), to: $pos.after(depth + 1), depth };
    };

    /**
     * The blocks from the one holding `a` to the one holding `b`, side by
     * side in the nearest place that holds both: the same column, else the
     * page. Null when `a` and `b` are in the same block.
     */
    const blocksBetween = (a: number, b: number): Blocks | null => {
      const { doc } = view.state;
      const $a = doc.resolve(a);
      const $b = doc.resolve(b);
      const depth = containerDepth($a, $a.sharedDepth(b));
      if ($a.depth <= depth || $b.depth <= depth) return null;
      const aStart = $a.before(depth + 1);
      const bStart = $b.before(depth + 1);
      if (aStart === bStart) return null;
      const first = doc.nodeAt(Math.min(aStart, bStart));
      const last = doc.nodeAt(Math.max(aStart, bStart));
      if (!first || !last) return null;
      if (TEXT_ONLY.has(first.type.name) || TEXT_ONLY.has(last.type.name))
        return null;
      return {
        from: Math.min(aStart, bStart),
        to: Math.max(aStart, bStart) + last.nodeSize,
        depth,
      };
    };

    const selectRange = ({ from, to, depth }: Blocks) => {
      const key = `${from}:${to}:${depth}`;
      if (key === lastRange) return;
      lastRange = key;
      const { doc } = view.state;
      view.dispatch(
        view.state.tr.setSelection(
          NodeRangeSelection.create(doc, from, to, depth),
        ),
      );
    };

    /** Text turned into blocks: from the first block to the pointer's. */
    const selectFromText = () => {
      const over = posAt(pointerX, pointerY);
      if (over === -1) return;
      const range = blocksBetween(textAnchor, over) ?? blockOf(textAnchor);
      if (range) selectRange(range);
    };

    /** A point in a column's empty space, not on one of its blocks. */
    const isColumnSpace = (x: number, y: number) => {
      const hit = view.posAtCoords({ left: x, top: y });
      if (!hit || hit.inside < 0) return false;
      const name = view.state.doc.nodeAt(hit.inside)?.type.name;
      return name === "column" || name === "columnBlock";
    };

    const touches = (rect: DOMRect, r: DOMRect) =>
      rect.top < r.bottom &&
      rect.bottom > r.top &&
      rect.left < r.right &&
      rect.right > r.left;

    /** Inside a columns block: the blocks the box touches when it's all in
     *  one column, else the columns it touches. */
    const blocksInColumn = (
      rowPos: number,
      row: PMNode,
      rect: DOMRect,
    ): Blocks | null => {
      const columns: number[] = [];
      row.forEach((_column, offset) => {
        const pos = rowPos + 1 + offset;
        const dom = view.nodeDOM(pos);
        if (
          dom instanceof HTMLElement &&
          touches(rect, dom.getBoundingClientRect())
        )
          columns.push(pos);
      });
      if (columns.length === 0) return null;
      // Several columns: those columns, as whole columns.
      if (columns.length > 1) {
        const last = columns[columns.length - 1];
        const lastColumn = view.state.doc.nodeAt(last);
        if (!lastColumn) return null;
        return {
          from: columns[0],
          to: last + lastColumn.nodeSize,
          depth: view.state.doc.resolve(columns[0]).depth,
        };
      }
      const columnPos = columns[0];
      const column = view.state.doc.nodeAt(columnPos);
      if (!column) return null;
      let from = -1;
      let to = -1;
      column.forEach((block, offset) => {
        const pos = columnPos + 1 + offset;
        const dom = view.nodeDOM(pos);
        if (!(dom instanceof HTMLElement)) return;
        const r = dom.getBoundingClientRect();
        // Across the column's whole width, like the page's blocks.
        if (rect.top < r.bottom && rect.bottom > r.top) {
          if (from === -1) from = pos;
          to = pos + block.nodeSize;
        }
      });
      if (from === -1) return null;
      return { from, to, depth: view.state.doc.resolve(from).depth };
    };

    /** The items of the list at `listPos` the box touches (nested lists
     *  inside an item come with it). */
    const itemsInList = (
      listPos: number,
      list: PMNode,
      rect: DOMRect,
    ): Blocks | null => {
      let from = -1;
      let to = -1;
      list.forEach((item, offset) => {
        const pos = listPos + 1 + offset;
        const dom = view.nodeDOM(pos);
        if (!(dom instanceof HTMLElement)) return;
        const r = dom.getBoundingClientRect();
        if (rect.top < r.bottom && rect.bottom > r.top) {
          if (from === -1) from = pos;
          to = pos + item.nodeSize;
        }
      });
      if (from === -1) return null;
      return { from, to, depth: view.state.doc.resolve(from).depth };
    };

    const select = (rect: DOMRect) => {
      const { doc } = view.state;
      const editorBox = view.dom.getBoundingClientRect();
      let from = -1;
      let to = -1;
      doc.forEach((node, offset) => {
        if (node.type.name === "title") return;
        const dom = view.nodeDOM(offset);
        if (!(dom instanceof HTMLElement)) return;
        const r = dom.getBoundingClientRect();
        // A block counts across the editor's full width, so a box drawn in
        // the margin next to it selects it.
        const left = Math.min(r.left, editorBox.left);
        const right = Math.max(r.right, editorBox.right);
        const touches =
          rect.top < r.bottom &&
          rect.bottom > r.top &&
          rect.left < right &&
          rect.right > left;
        if (!touches) return;
        if (from === -1) from = offset;
        to = offset + node.nodeSize;
      });
      // Only a columns block, and the box inside one of its columns: the
      // blocks it touches in that column.
      const only = from === -1 ? null : doc.nodeAt(from);
      if (only?.type.name === "columnBlock" && to === from + only.nodeSize) {
        const inner = blocksInColumn(from, only, rect);
        if (inner) return selectRange(inner);
      }
      // Only one list, and the box inside it: the items it touches.
      if (only && LISTS.has(only.type.name) && to === from + only.nodeSize) {
        const items = itemsInList(from, only, rect);
        if (items) return selectRange(items);
      }
      const key = `${from}:${to}:0`;
      if (key === lastRange) return;
      lastRange = key;
      if (from === -1) {
        // Nothing touched (yet): no block selected.
        const $start = doc.resolve(view.state.selection.from);
        view.dispatch(view.state.tr.setSelection(TextSelection.near($start)));
        return;
      }
      view.dispatch(
        view.state.tr.setSelection(NodeRangeSelection.create(doc, from, to, 0)),
      );
    };

    const draw = () => {
      frame = 0;
      if (!active || !box) return;

      // Auto-scroll near the top / bottom of the scroll area.
      const area =
        scroller === document.scrollingElement
          ? { top: 0, bottom: window.innerHeight }
          : scroller.getBoundingClientRect();
      let dy = 0;
      if (pointerY < area.top + EDGE)
        dy = -Math.ceil((area.top + EDGE - pointerY) / 4);
      else if (pointerY > area.bottom - EDGE)
        dy = Math.ceil((pointerY - (area.bottom - EDGE)) / 4);
      if (dy) {
        if (scroller === document.scrollingElement) window.scrollBy(0, dy);
        else scroller.scrollTop += dy;
      }

      const top = startY - scrollTop();
      const rect = new DOMRect(
        Math.min(startX, pointerX),
        Math.min(top, pointerY),
        Math.abs(pointerX - startX),
        Math.abs(pointerY - top),
      );
      Object.assign(box.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
      select(rect);

      // Keep scrolling while the pointer rests at an edge.
      if (dy) frame = requestAnimationFrame(draw);
    };

    // Text turned into blocks: scroll near the edges, like the box does.
    const scrollWhileSelecting = () => {
      frame = 0;
      if (!textBlocks) return;
      const area =
        scroller === document.scrollingElement
          ? { top: 0, bottom: window.innerHeight }
          : scroller.getBoundingClientRect();
      let dy = 0;
      if (pointerY < area.top + EDGE)
        dy = -Math.ceil((area.top + EDGE - pointerY) / 4);
      else if (pointerY > area.bottom - EDGE)
        dy = Math.ceil((pointerY - (area.bottom - EDGE)) / 4);
      if (!dy) return;
      if (scroller === document.scrollingElement) window.scrollBy(0, dy);
      else scroller.scrollTop += dy;
      selectFromText();
      frame = requestAnimationFrame(scrollWhileSelecting);
    };

    const onMove = (e: MouseEvent) => {
      // Only the real pointer: the drag handle sends made-up mousemoves to
      // place itself on a selection, which would yank the box.
      if (!pressing || !e.isTrusted) return;
      pointerX = e.clientX;
      pointerY = e.clientY;

      if (textAnchor !== -1) {
        if (!textBlocks) {
          // Still inside the first block: an ordinary text selection.
          const over = posAt(pointerX, pointerY);
          if (over === -1 || !blocksBetween(textAnchor, over)) return;
          textBlocks = true;
          lastRange = "";
          window.getSelection()?.removeAllRanges();
          document.body.classList.add("is-marquee-selecting");
        }
        selectFromText();
        if (!frame) frame = requestAnimationFrame(scrollWhileSelecting);
        return;
      }

      if (!active) {
        const top = startY - scrollTop();
        if (Math.hypot(pointerX - startX, pointerY - top) < THRESHOLD) return;
        active = true;
        lastRange = "";
        box = document.createElement("div");
        box.className = "block-marquee";
        document.body.appendChild(box);
        document.body.classList.add("is-marquee-selecting");
      }
      if (!frame) frame = requestAnimationFrame(draw);
    };

    const finish = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      box?.remove();
      box = null;
      document.body.classList.remove("is-marquee-selecting");
      pressing = false;
      textAnchor = -1;
    };

    const onUp = (e: MouseEvent) => {
      const wasActive = active;
      const wasTextBlocks = textBlocks;
      const range = lastRange;
      active = false;
      textBlocks = false;
      finish();
      if (editor.isDestroyed) return;
      if (wasTextBlocks) {
        // The editor's own mouseup may set a text selection from what's
        // left of the browser's; put the blocks back after it.
        const [from, to, depth] = range.split(":").map(Number);
        requestAnimationFrame(() => {
          if (editor.isDestroyed || !(to > from)) return;
          const { doc } = view.state;
          if (to > doc.content.size) return;
          view.dispatch(
            view.state.tr.setSelection(
              NodeRangeSelection.create(doc, from, to, depth || 0),
            ),
          );
          view.focus();
        });
        return;
      }
      if (wasActive) {
        // Keys (Delete, Ctrl+C…) go to the editor from here.
        view.focus();
        return;
      }
      // A plain click on the editor's own padding: place the cursor there,
      // as the browser would have.
      if (onEditorPadding) {
        const hit = view.posAtCoords({ left: e.clientX, top: e.clientY });
        if (hit) {
          const $pos = view.state.doc.resolve(hit.pos);
          view.dispatch(view.state.tr.setSelection(TextSelection.near($pos)));
        }
        view.focus();
      }
    };

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!editor.isEditable || editor.isDestroyed) return;
      const target = e.target as Element | null;
      if (!target) return;
      const surface = view.dom.closest(SURFACES) ?? view.dom.parentElement;
      if (!surface?.contains(target)) return;
      if (target.closest(EXCLUDE)) return;
      // The editor's own padding, or the empty space of a column (below its
      // blocks, between columns): a press there draws a box too.
      onEditorPadding =
        target === view.dom || isColumnSpace(e.clientX, e.clientY);
      // Inside the text: normal editing, watched in case the selection
      // leaves the block it started in.
      if (view.dom.contains(target) && !onEditorPadding) {
        if (e.shiftKey) return;
        const anchor = posAt(e.clientX, e.clientY);
        if (anchor === -1) return;
        const $anchor = view.state.doc.resolve(anchor);
        if ($anchor.depth < 1 || TEXT_ONLY.has($anchor.node(1).type.name))
          return;
        scroller = scrollParentOf(view.dom);
        pressing = true;
        active = false;
        textAnchor = anchor;
        textBlocks = false;
        pointerX = e.clientX;
        pointerY = e.clientY;
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return;
      }

      // Stop the browser from starting a text selection.
      e.preventDefault();
      scroller = scrollParentOf(view.dom);
      pressing = true;
      active = false;
      startX = e.clientX;
      startY = e.clientY + scrollTop();
      pointerX = e.clientX;
      pointerY = e.clientY;
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };

    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      finish();
    };
  }, [editor]);

  return null;
}
