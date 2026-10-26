/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Editor } from "@tiptap/core";
import { DragHandle as TiptapDragHandle } from "./drag-handle-extension-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditorState } from "@tiptap/react";
import { DragHandleMenu } from "./drag-handle-menu/drag-handle-menu";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Plus } from "src/components/icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";

import "./drag-handle.scss";
import { ColorDropdownProvider } from "../color-dropdown-menu/color-dropdown-provider";
import { Node, ResolvedPos } from "@tiptap/pm/model";
import type { NormalizedNestedOptions } from "@tiptap/extension-drag-handle";
import { createPortal } from "react-dom";
import { recordSelection } from "src/features/database/utils/record-selection-store";
import { RecordDragMenu } from "src/features/database/components/record-drag-menu";
import { readDatabaseData } from "src/features/database/utils/database-bridge";
import type { DragStorage } from "src/features/database/extensions";
import { Trans, useTranslation } from "react-i18next";
import { insertBlockWithMenu } from "./insert-block";
import {
  extendSelectionToBlock,
  rangeContains,
  selectBlockRange,
  selectedBlockRange,
  startMultiBlockDrag,
  type BlockRange,
} from "./multi-block-drag";
import type { ComputePositionConfig, Middleware } from "@floating-ui/dom";
import { startDragAutoscroll } from "./drag-autoscroll";
import { NodeIconPickerHost } from "../node-icon-actions";

const NODE_LABELS: Record<string, string> = {
  paragraph: "Text",
  heading: "Heading",
  bulletList: "Bullet List",
  orderedList: "Numbered List",
  taskList: "To-do List",
  blockquote: "Blockquote",
  codeBlock: "Code Block",
  horizontalRule: "Separator",
  hr: "Seapartor",
  table: "Table",
  tableWrapper: "TableWrapper",
  tocNode: "Table of Contents",
  image: "Image",
  columnBlock: "Columns",
  column: "Column",
  database: "Database",
  title: "Title",
  pageLink: "Page",
  databaseRecord: "Record",
  callout: "Callout",
  ctaButton: "Button",
  container: "Container",
};

// The handle's library builds the drag image by copying the dragged block
// with every computed style inlined, element by element. For a big block
// (a database: hundreds of cells) that takes long enough for the browser to
// give up on the drag. Such a block gets a small stand-in to copy instead: a
// chip with its name. It runs just before the library's dragstart code, and
// everything is put back right after.
const HEAVY_BLOCK = 300; // elements

function lightenDragImage(editor: Editor, pos: number) {
  const view = editor.view;
  const dom = view.nodeDOM(pos);
  if (
    !(dom instanceof HTMLElement) ||
    dom.getElementsByTagName("*").length < HEAVY_BLOCK
  )
    return;

  const node = editor.state.doc.nodeAt(pos);
  const name =
    (node?.attrs.title as string | undefined)?.trim() ||
    NODE_LABELS[node?.type.name ?? ""] ||
    "Block";

  // Kept off screen; the chip itself is laid out normally so its computed
  // styles (which the library copies) are real.
  const holder = document.createElement("div");
  holder.style.cssText = "position: fixed; top: -10000px; left: 0;";
  const chip = document.createElement("div");
  chip.textContent = name;
  chip.style.cssText =
    "display: inline-block; padding: 6px 12px; border-radius: 8px;" +
    "font: 500 14px/1.4 system-ui, sans-serif; white-space: nowrap;" +
    "color: var(--tt-text-primary); background: var(--tt-bg-color);" +
    "box-shadow: 0 0 0 1px var(--tt-border-color), 0 4px 12px rgba(0,0,0,.12);";
  holder.appendChild(chip);
  document.body.appendChild(holder);

  const v = view as unknown as {
    nodeDOM: (p: number) => globalThis.Node | null;
  };
  const original = view.nodeDOM.bind(view);
  v.nodeDOM = (p: number) => (p === pos ? chip : original(p));
  setTimeout(() => {
    delete (v as { nodeDOM?: unknown }).nodeDOM; // back to the prototype's
    holder.remove();
  }, 0);
}

/**
 * Where the first line of text in a block sits, vertically (its middle, in
 * viewport pixels). Text in parts that aren't editable (a callout's icon, a
 * code block's language label) is skipped. A block without text (an empty
 * paragraph, an image) gives the middle of its first line box.
 */
function firstLineMiddle(block: HTMLElement): number {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
    acceptNode(text) {
      if (!text.textContent?.trim()) return NodeFilter.FILTER_SKIP;
      const fixed = text.parentElement?.closest('[contenteditable="false"]');
      return fixed && block.contains(fixed)
        ? NodeFilter.FILTER_SKIP
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  const text = walker.nextNode();
  if (text) {
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 1);
    const glyph = range.getClientRects()[0];
    if (glyph) return glyph.top + glyph.height / 2;
  }
  const style = getComputedStyle(block);
  const fontSize = parseFloat(style.fontSize) || 16;
  const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5;
  return (
    block.getBoundingClientRect().top +
    (parseFloat(style.paddingTop) || 0) +
    lineHeight / 2
  );
}

// Records of these views are rows: they get the handle (and its record
// menu). Cards and bars (board, gallery, calendar, timeline) have their own
// controls; the handle goes to the database itself there.
const ROW_VIEWS = new Set(["table", "list"]);

function basePenalty(
  editor: Editor | null,
  node: Node,
  parent: Node | null,
  isFirst: boolean,
) {
  const name = node.type.name;
  const parentName = parent?.type.name;
  if (name === "column" || name === "columnBlock" || name === "title") {
    return 1000;
  }

  // Parts of a block, never moved on their own: a table's rows and
  // cells (they have their own grips), a toggle's title and body, a
  // tab, a code group's file.
  if (
    name === "tableRow" ||
    name === "tableCell" ||
    name === "tableHeader" ||
    name === "appendixSummary" ||
    name === "tab" ||
    name === "codeGroupItem"
  ) {
    return 1000;
  }

  // A plain cell (just its text): the table is what's dragged. A cell
  // with blocks (a list, a callout, code…) gives each its own handle.
  if (
    (parentName === "tableCell" || parentName === "tableHeader") &&
    parent?.childCount === 1 &&
    name === "paragraph"
  ) {
    return 1000;
  }

  // A list item's first line is the item; a callout's first line is
  // the callout.
  if (
    isFirst &&
    (parentName === "listItem" ||
      parentName === "taskItem" ||
      (parentName === "callout" && name === "paragraph"))
  ) {
    return 1000;
  }

  // Items are dragged, not their whole list.
  if (name === "bulletList" || name === "orderedList" || name === "taskList") {
    return 1000;
  }

  if (name === "databaseRecord") {
    const databaseId = node.attrs.databaseId as string | null;
    const viewType =
      editor && databaseId
        ? readDatabaseData(editor, databaseId)?.view?.type
        : undefined;
    if (viewType && !ROW_VIEWS.has(viewType)) return 1000;
    // A row beats its database (below), so the handle stays on rows.
    return -300;
  }

  // A database over whatever it sits in.
  if (name === "database") return -250;

  // A quote moves as one block, its lines with it.
  if (name === "blockquote") return -200;

  return 500;
}

const makeNestedOptions = (editor: Editor | null) => ({
  enabled: true,
  edgeDetection: {
    threshold: -80,
    edges: ["left"],
    strength: 500,
  },

  // The innermost block under the pointer gets the handle (a list item, a
  // block in a callout or a table cell), Notion-style: every candidate scores
  // the same and the deepest wins, except the cases below. Scores are
  // penalties (1000 = never the handle's; negative = preferred).
  rules: [
    {
      id: "preferNodeLabels",
      evaluate: ({
        node,
        parent,
        isFirst,
        depth,
        $pos,
      }: {
        node: Node;
        parent: Node | null;
        isFirst: boolean;
        depth: number;
        $pos: ResolvedPos;
      }) => {
        const penalty = basePenalty(editor, node, parent, isFirst);
        if (penalty >= 1000) return penalty; // never a target: unchanged

        // Inside a toggle's content, at any depth: beat the edge rule, which
        // takes 500 × depth once the pointer moves left onto the handle.
        // Deeper blocks get a bigger bonus, so the innermost one still wins,
        // and the relative order of the other rules is kept.
        for (let d = depth - 1; d > 0; d--) {
          if ($pos.node(d).type.name === "appendixContent") {
            return penalty - (500 * depth - 400);
          }
        }
        return penalty;
      },
    },
  ],
});

/** Notion's grip: six small filled dots, two columns of three. */
function GripDotsIcon() {
  return (
    <svg
      className="tiptap-button-icon"
      width="10"
      height="16"
      viewBox="0 0 10 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="2.5" cy="3" r="1.5" />
      <circle cx="7.5" cy="3" r="1.5" />
      <circle cx="2.5" cy="8" r="1.5" />
      <circle cx="7.5" cy="8" r="1.5" />
      <circle cx="2.5" cy="13" r="1.5" />
      <circle cx="7.5" cy="13" r="1.5" />
    </svg>
  );
}

export function DragHandle({ editor }: { editor: Editor | null }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("paragraph");
  const [hideHandle, setHideHandle] = useState(false);
  // Flipped on every move to another block: switches the handle between two
  // identical fade-in animations, which restarts it (drag-handle.scss).
  const [fadeFlip, setFadeFlip] = useState(false);
  // The handle's block sits in a table cell: it's drawn as a solid chip a
  // little further out, clear of the row's grip on the table's border.
  const [inCell, setInCell] = useState(false);
  const inCellRef = useRef(false);
  const nestedOptions = useMemo(() => makeNestedOptions(editor), [editor]);
  const isDraggingRef = useRef(false);
  const stopAutoscrollRef = useRef<(() => void) | null>(null);
  const targetRef = useRef(target);
  const posRef = useRef(-1);
  // Set on pointer down when the grip is inside a selection of several
  // blocks: the drag then moves all of them.
  const multiRangeRef = useRef<BlockRange | null>(null);
  // Shift+click extends the selection; it doesn't open the menu.
  const shiftClickRef = useRef(false);
  const gripRef = useRef<HTMLButtonElement>(null);

  // The handle sits beside the block, centred on its first line of text —
  // not on the top of the block's box, which put it too high next to
  // headings (taller lines) and callouts / code blocks (padding, a header).
  // The library places it at the block's top-left ("left-start"); this
  // moves it down to the line. Database rows keep their own tuned spot.
  const computePositionConfig = useMemo<Partial<ComputePositionConfig>>(() => {
    const centerOnFirstLine: Middleware = {
      name: "centerOnFirstLine",
      fn({ x, y, rects, elements }) {
        if (!editor || targetRef.current === "Record") return {};
        const block = editor.view.nodeDOM(posRef.current);
        if (!(block instanceof HTMLElement)) return {};
        const ref = elements.reference.getBoundingClientRect();
        const middle = firstLineMiddle(block);
        const next = {
          x,
          y: y + (middle - ref.top) - rects.floating.height / 2,
        };

        // Blocks that reach back over their container (toggle, callout) carry a
        // transparent left border: put the grip beside the text, 12px short of it.
        const reach = parseFloat(getComputedStyle(block).borderLeftWidth) || 0;
        if (reach > 0) next.x = x + reach - 12;
        // Node-view blocks (page links…) are wrapped by Tiptap; the wrapper has no
        // border, so fall back to the container's known inset.
        else if (
          block.parentElement?.closest(".appendix-content") ||
          block.parentElement?.closest(".callout-content")
        )
          next.x = x + 16;

        // A database's box starts at the editor's far left (it spans the
        // full width so wide tables can scroll), so "left of the block" put
        // the handle under the sidebar. Anchor it beside the database's
        // visible content instead: its title/toolbar column, or the source
        // picker before it has a source.
        if (targetRef.current === "Database") {
          const content =
            block.querySelector<HTMLElement>(".db-sticky-left") ??
            block.querySelector<HTMLElement>(".top-level-block");
          if (content) {
            next.x = x + (content.getBoundingClientRect().left - ref.left);
          }
        }

        return next;
      },
    };
    return { placement: "left-start", middleware: [centerOnFirstLine] };
  }, [editor]);

  // ── Multi-block selection: the handle stays on its FIRST block ──────────
  // While several blocks are selected (marquee, Shift+click, a text
  // selection across blocks), the grip belongs to the selection, so it sits
  // beside the first selected block and doesn't follow the pointer. The
  // library has no "put the handle on this node" call, so we move it the way
  // it moves itself — a mousemove over that block, which its plugin handles
  // on the next frame — then lock it there. Cleared selection → unlocked.
  const multiFirstPos = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e ? (selectedBlockRange(e)?.from ?? null) : null,
  });
  const lockedForSelectionRef = useRef(false);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    // The open menu holds its own lock; re-anchor once it closes.
    if (open) return;

    if (multiFirstPos == null) {
      if (lockedForSelectionRef.current) {
        lockedForSelectionRef.current = false;
        editor.commands.unlockDragHandle();
      }
      return;
    }

    let cancelled = false;
    let tries = 0;
    const anchor = () => {
      if (cancelled || editor.isDestroyed) return;
      const block = editor.view.nodeDOM(multiFirstPos);
      if (!(block instanceof HTMLElement)) return;
      const rect = block.getBoundingClientRect();
      editor.commands.unlockDragHandle();
      editor.view.dom.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          clientX: rect.left + 4,
          clientY: rect.top + Math.min(rect.height / 2, 12),
        }),
      );
      // The plugin places the handle on the next frame; lock after it. A
      // real mousemove in that same frame can win — then try again.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (cancelled || editor.isDestroyed) return;
          if (posRef.current !== multiFirstPos && tries++ < 3) {
            anchor();
            return;
          }
          editor.commands.lockDragHandle();
          lockedForSelectionRef.current = true;
        }),
      );
    };
    anchor();
    return () => {
      cancelled = true;
    };
  }, [editor, multiFirstPos, open]);

  // Hide the drag handle while a column is being resized to avoid
  // it flickering or repositioning during the resize interaction
  const [isColumnResizing, setIsColumnResizing] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      setIsColumnResizing((e as CustomEvent).detail.isResizing);
    };
    document.addEventListener("column:resize", handler);
    return () => document.removeEventListener("column:resize", handler);
  }, []);

  // Clear the published hover on unmount so a stale record id can't leave a
  // checkbox visible after the handle goes away.
  useEffect(() => () => recordSelection.setHovered(null), []);

  // On the way from a block in a table cell to its handle, the pointer
  // crosses the cell's padding, the table's border and the margin — over
  // each, the table is the block under it, and the handle used to jump to
  // the table before it could be reached. Inside that corridor (from the
  // handle to the block's left edge, over the block's height) the handle
  // stays where it is.
  // The menu holds its own lock; the corridor below leaves it alone.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!editor) return;
    let corridorLocked = false;
    const release = () => {
      if (!corridorLocked) return;
      corridorLocked = false;
      editor.commands.unlockDragHandle();
    };
    const onMove = (e: MouseEvent) => {
      if (
        openRef.current ||
        lockedForSelectionRef.current ||
        isDraggingRef.current
      ) {
        corridorLocked = false; // someone else holds the lock now
        return;
      }
      if (!inCellRef.current) return release();
      const handle = editor.view.dom.parentElement?.querySelector<HTMLElement>(
        ".drag-handle.in-cell",
      );
      const block = editor.view.nodeDOM(posRef.current);
      if (!handle || !(block instanceof HTMLElement)) return release();
      const h = handle.getBoundingClientRect();
      const b = block.getBoundingClientRect();
      const inCorridor =
        e.clientX >= h.left - 4 &&
        e.clientX <= b.left + 8 &&
        e.clientY >= Math.min(h.top, b.top) - 4 &&
        e.clientY <= Math.max(h.bottom, b.bottom) + 4;
      if (inCorridor && !corridorLocked) {
        corridorLocked = true;
        editor.commands.lockDragHandle();
      } else if (!inCorridor) {
        release();
      }
    };
    document.addEventListener("mousemove", onMove, true);
    return () => {
      document.removeEventListener("mousemove", onMove, true);
      release();
    };
  }, [editor]);

  const onAction = useCallback(() => {
    setOpen(false);
    editor?.commands.unlockDragHandle();
  }, [editor]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (isDraggingRef.current) return;
      if (next) {
        editor?.commands.lockDragHandle();
      } else {
        editor?.commands.unlockDragHandle();
      }
      setOpen(next);
    },
    [editor],
  );

  const menu = useMemo(
    () =>
      open ? (
        target === "Record" ? (
          // Record menu: its OWN Popover (anchored to the grip), NOT the
          // DropdownMenu — its nested sub-popovers (icon/property/move) can't
          // open inside a Radix DropdownMenu's dismiss scope.
          <RecordDragMenu
            key={"record-drag-menu"}
            anchorRef={gripRef}
            onAction={onAction}
          />
        ) : (
          createPortal(
            <DragHandleMenu
              key={"drag-handle-menu"}
              onAction={onAction}
              target={target}
              editor={editor!}
              side="left"
              align="start"
              sideOffset={6}
            />,
            document.body,
          )
        )
      ) : null,
    [open, onAction, target, editor],
  );

  if (!editor) return null;

  return (
    <TiptapDragHandle
      className={`drag-handle ${isColumnResizing ? "hide" : "show"} ${
        target === "Record" ? "is-record" : ""
      } ${hideHandle ? "hide" : ""} ${inCell ? "in-cell" : ""} ${
        fadeFlip ? "fade-a" : "fade-b"
      }`}
      editor={editor}
      computePositionConfig={computePositionConfig}
      onNodeChange={({ node, pos: newPos }) => {
        if (newPos === -1 || node === null) {
          // Handle detached from any node — no record is hovered.
          recordSelection.setHovered(null);
          return;
        }

        const newTarget = NODE_LABELS[node.type.name] ?? "paragraph";

        const $node = editor.state.doc.resolve(newPos);
        let nowInCell = false;
        for (let d = $node.depth; d > 0; d--) {
          const n = $node.node(d).type.name;
          if (n === "tableCell" || n === "tableHeader") {
            nowInCell = true;
            break;
          }
        }
        inCellRef.current = nowInCell;
        setInCell(nowInCell);

        if (newTarget === "Record") {
          const hideHandle = node.attrs.hideHandle as boolean;

          setHideHandle(hideHandle);
        }

        // Publish which database record the handle is currently anchored to.
        // The handle already resolves nested-node ambiguity via nestedOptions,
        // so this is the authoritative "current row" — the row node views
        // subscribe to it to reveal their selection checkbox.
        recordSelection.setHovered(
          node.type.name === "databaseRecord"
            ? ((node.attrs.recordId as string | null) ?? null)
            : null,
          node.type.name === "databaseRecord"
            ? ((node.attrs.databaseId as string | null) ?? null)
            : null,
        );

        // Only update refs/state when values actually change to avoid
        // unnecessary re-renders on every cursor move
        if (newPos !== posRef.current) {
          posRef.current = newPos;
          setFadeFlip((f) => !f);
        }

        if (newTarget !== targetRef.current) {
          targetRef.current = newTarget;
          setTarget(newTarget);
        }
      }}
      onElementDragStart={() => {
        isDraggingRef.current = true;
        lightenDragImage(editor, posRef.current);
        stopAutoscrollRef.current?.();
        stopAutoscrollRef.current = startDragAutoscroll(editor);

        // A table / list row: the drag reorders the rows (board-drag.ts
        // reads draggingId and handles the drop) instead of moving the
        // record node around the page.
        if (targetRef.current === "Record") {
          const node = editor.state.doc.nodeAt(posRef.current);
          const recordId = node?.attrs.recordId as string | null | undefined;
          if (recordId) {
            (editor.storage.boardDrag as DragStorage).draggingId = recordId;
            document.body.classList.add("db-row-dragging");
          }
        }

        const range = multiRangeRef.current;
        if (range) {
          // Runs after the library's own dragstart handler (this listener is
          // on the document, the library's on the handle), so it has the
          // last word on what is dragged.
          document.addEventListener(
            "dragstart",
            (e) => startMultiBlockDrag(editor, e, range),
            { once: true },
          );
        }
        setOpen(false);
        editor.view.dom.classList.add("is-dragging");

        // Broadcast the dragged node's position so other parts of the app
        // (e.g. the column drop plugin) can reference it during the drag
        document.dispatchEvent(
          new CustomEvent("draghandle:dragstart", {
            detail: { pos: posRef.current },
          }),
        );
      }}
      onElementDragEnd={() => {
        isDraggingRef.current = false;
        document.body.classList.remove("db-row-dragging");
        editor.view.dom.classList.remove("is-dragging");
        stopAutoscrollRef.current?.();
        stopAutoscrollRef.current = null;

        // Broadcast drag end so the column drop plugin can clear globalDragNodePos
        document.dispatchEvent(
          new CustomEvent("draghandle:dragend", {
            detail: { pos: posRef.current },
          }),
        );

        const pos = posRef.current;
        if (pos === -1 || !editor) return;

        // Defer cleanup to the next frame so ProseMirror has fully settled
        // the drop and updated the document state
        requestAnimationFrame(() => {
          const { state } = editor.view;

          // Use the selection position after the drop rather than the stale
          // posRef, since ProseMirror moves the selection to the dropped node
          const $pos = state.doc.resolve(state.selection.from);

          // If the node was dropped inside a columnBlock, the column drop
          // plugin already handled the transaction — skip cleanup here
          const insideColumnBlock = Array.from({ length: $pos.depth }, (_, i) =>
            $pos.node(i + 1),
          ).some((n) => n.type.name === "columnBlock");

          if (insideColumnBlock) return;

          // Scan the document for columnBlocks that now have empty columns
          // as a result of the drag (the dragged content left a hole)
          const emptyColumnPositions: {
            columnPos: number;
            columnBlockPos: number;
            columnBlockNode: any;
          }[] = [];

          state.doc.forEach((node, offset) => {
            if (node.type.name === "columnBlock") {
              node.forEach((col, colOffset) => {
                const isEmpty =
                  col.childCount === 0 ||
                  (col.childCount === 1 && col.child(0).textContent === "");

                if (isEmpty) {
                  emptyColumnPositions.push({
                    columnPos: offset + 1 + colOffset,
                    columnBlockPos: offset,
                    columnBlockNode: node,
                  });
                }
              });
            }
          });

          if (emptyColumnPositions.length === 0) return;

          // Track which columnBlocks have already been processed to avoid
          // dispatching multiple transactions for the same block
          const processedBlocks = new Set<number>();

          for (const { columnBlockPos } of emptyColumnPositions) {
            if (processedBlocks.has(columnBlockPos)) continue;
            processedBlocks.add(columnBlockPos);

            const { state: currentState, dispatch } = editor.view;
            const columnType = currentState.schema.nodes.column;
            const columnBlockType = currentState.schema.nodes.columnBlock;
            const paragraphType = currentState.schema.nodes.paragraph;

            // Re-read the columnBlock from the current state since a previous
            // iteration may have mutated the document
            const currentBlockNode = currentState.doc.nodeAt(columnBlockPos);
            if (
              !currentBlockNode ||
              currentBlockNode.type.name !== "columnBlock"
            )
              continue;

            // Collect non-empty columns — these are the ones we keep
            const remainingColumns: any[] = [];
            currentBlockNode.forEach((col: any) => {
              const isEmpty =
                col.childCount === 0 ||
                (col.childCount === 1 && col.child(0).textContent === "");
              if (!isEmpty) remainingColumns.push(col);
            });

            const tr = currentState.tr;

            if (remainingColumns.length === 0) {
              // All columns are empty — replace the entire columnBlock with
              // a plain paragraph so the document stays valid
              tr.replaceWith(
                columnBlockPos,
                columnBlockPos + currentBlockNode.nodeSize,
                paragraphType.create(),
              );
            } else if (remainingColumns.length === 1) {
              // Only one column remains — unwrap it and lift its content
              // directly into the document, removing the columnBlock wrapper
              const soleColumn = remainingColumns[0];
              tr.replaceWith(
                columnBlockPos,
                columnBlockPos + currentBlockNode.nodeSize,
                soleColumn.content.size > 0
                  ? soleColumn.content
                  : paragraphType.create(),
              );
            } else {
              // Multiple columns remain — redistribute widths evenly and
              // rebuild the columnBlock without the empty column
              const newWidth = `${Math.round(100 / remainingColumns.length)}%`;
              const resized = remainingColumns.map((col: any) =>
                columnType.create({ width: newWidth }, col.content),
              );
              tr.replaceWith(
                columnBlockPos,
                columnBlockPos + currentBlockNode.nodeSize,
                columnBlockType.create({}, resized),
              );

              // Clear any stale px-based inline styles left over from a
              // previous resize so the new % widths can take effect via flex
              requestAnimationFrame(() => {
                editor.view.dom
                  .querySelectorAll('[data-type="column"]')
                  .forEach((el) => {
                    const htmlEl = el as HTMLElement;
                    htmlEl.style.width = "";
                    htmlEl.style.flexBasis = "";
                  });
              });
            }

            dispatch(tr);
          }

          // If the original drag position now holds a tableWrapper (e.g. a
          // table was dragged out of a column), remove it as it's now orphaned
          const node = editor.state.doc.nodeAt(pos);
          if (node?.type.name === "tableWrapper") {
            editor.chain().setNodeSelection(pos).deleteSelection().run();
          }
        });
      }}
      nestedOptions={nestedOptions as unknown as NormalizedNestedOptions}
    >
      {/* Positioned: the menu's anchor (below) is laid over the whole
          handle, + and grip. */}
      <CardItemGroup orientation="horizontal" style={{ position: "relative" }}>
        <Button
          className="plus-button"
          type="button"
          size="large"
          variant="ghost"
          role="button"
          tabIndex={-1}
          draggable={false}
          aria-label={t("dragHandle.add")}
          tooltip={
            <span className="drag-handle-tip">
              <Trans
                i18nKey="dragHandle.addTip"
                components={{ b: <b />, br: <br /> }}
              />
            </span>
          }
          // Keep the hovered block (and the editor's focus) on press.
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            insertBlockWithMenu(editor, posRef.current, e.altKey);
          }}
        >
          <Plus className="tiptap-button-icon" />
        </Button>

        {/* Not modal: the items with a submenu open it as a flyout
            (NavigableMenuItem, a popover of its own), and a modal menu
            keeps focus to itself, so the flyout's search box (Move to)
            couldn't be typed in. */}
        <DropdownMenu open={open} onOpenChange={handleOpenChange} modal={false}>
          <ColorDropdownProvider>
            {/* The grip. The menu's anchor (after it) is laid over the
                whole handle, + and grip: the menu opens to the side of the
                handle, in the page margin, its top level with the handle's
                — on the left, or on the right when the margin is too
                narrow (phones), and slid up or down to stay on screen. The
                anchor lets every pointer event through, so it can't get in
                the way of grabbing the grip. */}
            <span style={{ display: "inline-flex" }}>
              {/* Grip button — selecting the node on pointer down ensures
                  it's selected before the drag starts, giving ProseMirror
                  the right context for the drag operation */}
              <Button
                type="button"
                variant="ghost"
                role="button"
                size="large"
                ref={gripRef}
                className="grip-button"
                tabIndex={-1}
                aria-label={t("dragHandle.grip")}
                tooltip={
                  <span className="drag-handle-tip">
                    <Trans
                      i18nKey="dragHandle.gripTip"
                      components={{ b: <b />, br: <br /> }}
                    />
                  </span>
                }
                onPointerDown={(e) => {
                  const pos = posRef.current;
                  if (e.shiftKey && pos >= 0) {
                    shiftClickRef.current = true;
                    multiRangeRef.current = null;
                    extendSelectionToBlock(editor, pos);
                    return;
                  }
                  shiftClickRef.current = false;
                  // Inside a multi-block selection: keep it, as whole
                  // blocks, so dragging moves every selected block and the
                  // menu acts on all of them.
                  const range = selectedBlockRange(editor);
                  if (range && rangeContains(range, pos)) {
                    multiRangeRef.current = range;
                    // Anchored to the selection = locked, and a locked
                    // handle isn't draggable: free it for this press so the
                    // selection can be dragged (a click re-locks it via the
                    // menu; a drop changes the selection, which re-anchors).
                    if (lockedForSelectionRef.current) {
                      lockedForSelectionRef.current = false;
                      editor.commands.unlockDragHandle();
                    }
                    selectBlockRange(editor, range);
                    return;
                  }
                  multiRangeRef.current = null;
                  editor.commands.setNodeSelection(pos);
                }}
                onClick={() => {
                  if (shiftClickRef.current) {
                    shiftClickRef.current = false;
                    return;
                  }
                  if (isDraggingRef.current) return;
                  editor.commands.lockDragHandle();
                  setOpen((v) => !v);
                }}
                style={{
                  cursor: "grab",
                  // Disable pointer events while the menu is open so the
                  // grip doesn't interfere with menu item clicks
                  pointerEvents: open ? "none" : "auto",
                }}
              >
                <GripDotsIcon />
              </Button>
              <DropdownMenuTrigger asChild>
                <span
                  aria-hidden="true"
                  tabIndex={-1}
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                  }}
                />
              </DropdownMenuTrigger>
            </span>

            {menu}
            <NodeIconPickerHost editor={editor} />
          </ColorDropdownProvider>
        </DropdownMenu>
      </CardItemGroup>
    </TiptapDragHandle>
  );
}
