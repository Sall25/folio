/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Editor } from "@tiptap/core";
import { DragHandle as TiptapDragHandle } from "./drag-handle-extension-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DragHandleMenu } from "./drag-handle-menu/drag-handle-menu";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";

import "./drag-handle.scss";
import { ColorDropdownProvider } from "../color-dropdown-menu/color-dropdown-provider";
import { Node } from "@tiptap/pm/model";
import type { NormalizedNestedOptions } from "@tiptap/extension-drag-handle";
import { createPortal } from "react-dom";
import { recordSelection } from "src/features/database/utils/record-selection-store";
import { RecordDragMenu } from "src/features/database/components/record-drag-menu";
import { GripVerticalIcon } from "src/components/tiptap-icons";
import { useTranslation } from "react-i18next";
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

const nestedOptions = {
  enabled: true,
  edgeDetection: {
    threshold: -80,
    edges: ["left"],
    strength: 500,
  },

  rules: [
    {
      id: "preferNodeLabels",
      evaluate: ({
        node,
        // parent,
        // depth,
      }: {
        node: Node;
        parent: Node | null;
        depth: number;
      }) => {
        const name = node.type.name;
        if (name === "column" || name === "columnBlock" || name === "title") {
          return 1000;
        }

        if (
          name === "bulletList" ||
          name === "orderedList" ||
          name === "taskList" ||
          name === "blockquote" ||
          name === "databaseRecord" ||
          name === "table" ||
          name === "callout" ||
          name === "container"
          // name === "column"
        ) {
          return -200;
        }
        return 500; // Small penalty for other nodes
      },
    },
  ],
};

export function DragHandle({ editor }: { editor: Editor | null }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("paragraph");
  const [hideHandle, setHideHandle] = useState(false);
  const isDraggingRef = useRef(false);
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
      fn({ y, rects, elements }) {
        if (!editor || targetRef.current === "Record") return {};
        const block = editor.view.nodeDOM(posRef.current);
        if (!(block instanceof HTMLElement)) return {};
        const top = elements.reference.getBoundingClientRect().top;
        const middle = firstLineMiddle(block);
        return { y: y + (middle - top) - rects.floating.height / 2 };
      },
    };
    return { placement: "left-start", middleware: [centerOnFirstLine] };
  }, [editor]);

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
              align="center"
              sideOffset={4}
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
      } ${hideHandle ? "hide" : ""}`}
      editor={editor}
      computePositionConfig={computePositionConfig}
      onNodeChange={({ node, pos: newPos }) => {
        if (newPos === -1 || node === null) {
          // Handle detached from any node — no record is hovered.
          recordSelection.setHovered(null);
          return;
        }

        const newTarget = NODE_LABELS[node.type.name] ?? "paragraph";

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
        );

        // Only update refs/state when values actually change to avoid
        // unnecessary re-renders on every cursor move
        if (newPos !== posRef.current) {
          posRef.current = newPos;
        }

        if (newTarget !== targetRef.current) {
          targetRef.current = newTarget;
          setTarget(newTarget);
        }
      }}
      onElementDragStart={() => {
        isDraggingRef.current = true;
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
        editor.view.dom.classList.remove("is-dragging");

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
          title={t("dragHandle.addHint")}
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
                <GripVerticalIcon className="tiptap-button-icon" />
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
          </ColorDropdownProvider>
        </DropdownMenu>
      </CardItemGroup>
    </TiptapDragHandle>
  );
}
