/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Editor } from "@tiptap/core";
import { DragHandle as TiptapDragHandle } from "./drag-handle-extension-react";
import { useCallback, useRef, useState } from "react";
import { DragHandleMenu } from "./drag-handle-menu/drag-handle-menu";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { GripVertical, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";

import "./drag-handle.scss";
import { ColorDropdownProvider } from "../color-dropdown-menu/color-dropdown-provider";
import { Node } from "@tiptap/pm/model";
import type { NormalizedNestedOptions } from "@tiptap/extension-drag-handle";
import { createPortal } from "react-dom";

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
  figure: "Image",
  columnBlock: "Columns",
  column: "Column",
  database: "Database",
  title: "Title",
  pageLink: "Page",
  databaseRecord: "Record",
};

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
        if (name === "column" || name === "columnBlock") {
          return 1000;
        }

        if (
          name === "bulletList" ||
          name === "orderedList" ||
          name === "taskList" ||
          name === "blockquote" ||
          name === "databaseRecord" ||
          name === "table"
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
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("paragraph");
  const [pos, setPos] = useState(-1);
  const isDraggingRef = useRef(false);
  const targetRef = useRef(target);
  const posRef = useRef(pos);

  const onAction = useCallback(() => {
    setOpen(false);
    editor?.commands.unlockDragHandle();
  }, [editor]);

  if (!editor) return null;

  return (
    <TiptapDragHandle
      className={`drag-handle`}
      editor={editor}
      computePositionConfig={{
        placement: "left-start",
      }}
      onNodeChange={({ node, pos: newPos }) => {
        if (newPos === -1 || node === null) return;

        const newTarget = NODE_LABELS[node.type.name] ?? "paragraph";

        if (newPos !== posRef.current) {
          posRef.current = newPos;
          setPos(newPos);
        }

        if (newTarget !== targetRef.current) {
          targetRef.current = newTarget;
          setTarget(newTarget);
        }
      }}
      onElementDragStart={() => {
        isDraggingRef.current = true;
        setOpen(false);
        editor.view.dom.classList.add("is-dragging");

        // Emit drag start with the node pos
        document.dispatchEvent(
          new CustomEvent("draghandle:dragstart", {
            detail: { pos: posRef.current },
          }),
        );
      }}
      onElementDragEnd={() => {
        isDraggingRef.current = false;

        editor.view.dom.classList.remove("is-dragging");

        document.dispatchEvent(
          new CustomEvent("draghandle:dragend", {
            detail: { pos: posRef.current },
          }),
        );

        const pos = posRef.current;
        if (pos === -1 || !editor) return;

        requestAnimationFrame(() => {
          const { state } = editor.view;

          // Check for empty columns and clean them up
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

          // Process each affected columnBlock
          const processedBlocks = new Set<number>();

          for (const { columnBlockPos } of emptyColumnPositions) {
            if (processedBlocks.has(columnBlockPos)) continue;
            processedBlocks.add(columnBlockPos);

            const { state: currentState, dispatch } = editor.view;
            const columnType = currentState.schema.nodes.column;
            const columnBlockType = currentState.schema.nodes.columnBlock;
            const paragraphType = currentState.schema.nodes.paragraph;

            // Re-read the current columnBlock from current state
            const currentBlockNode = currentState.doc.nodeAt(columnBlockPos);
            if (
              !currentBlockNode ||
              currentBlockNode.type.name !== "columnBlock"
            )
              continue;

            // Filter out empty columns
            const remainingColumns: any[] = [];
            currentBlockNode.forEach((col: any) => {
              const isEmpty =
                col.childCount === 0 ||
                (col.childCount === 1 && col.child(0).textContent === "");
              if (!isEmpty) remainingColumns.push(col);
            });

            const tr = currentState.tr;

            if (remainingColumns.length === 0) {
              // All columns empty — replace the whole columnBlock with a paragraph
              tr.replaceWith(
                columnBlockPos,
                columnBlockPos + currentBlockNode.nodeSize,
                paragraphType.create(),
              );
            } else if (remainingColumns.length === 1) {
              // One column left — unwrap it, put its content directly in the doc
              const soleColumn = remainingColumns[0];
              tr.replaceWith(
                columnBlockPos,
                columnBlockPos + currentBlockNode.nodeSize,
                soleColumn.content.size > 0
                  ? soleColumn.content
                  : paragraphType.create(),
              );
            } else {
              // Redistribute widths among remaining columns
              const newWidth = `${Math.round(100 / remainingColumns.length)}%`;
              const resized = remainingColumns.map((col: any) =>
                columnType.create({ width: newWidth }, col.content),
              );
              tr.replaceWith(
                columnBlockPos,
                columnBlockPos + currentBlockNode.nodeSize,
                columnBlockType.create({}, resized),
              );
            }

            dispatch(tr);
          }

          // Original tableWrapper cleanup
          const node = editor.state.doc.nodeAt(pos);
          if (node?.type.name === "tableWrapper") {
            editor.chain().setNodeSelection(pos).deleteSelection().run();
          }
        });
      }}
      // onElementDragEnd={() => {
      //   isDraggingRef.current = false;

      //   editor.view.dom.classList.remove("is-dragging");

      //   document.dispatchEvent(
      //     new CustomEvent("draghandle:dragend", {
      //       detail: { pos: posRef.current },
      //     }),
      //   );

      //   const pos = posRef.current;
      //   if (pos === -1 || !editor) return;

      //   requestAnimationFrame(() => {
      //     const node = editor.state.doc.nodeAt(pos);
      //     if (node?.type.name === "tableWrapper") {
      //       editor.chain().setNodeSelection(pos).deleteSelection().run();
      //     }
      //   });
      // }}

      nestedOptions={nestedOptions as unknown as NormalizedNestedOptions}
    >
      <CardItemGroup orientation="horizontal">
        <Button
          className="plus-button"
          type="button"
          variant="ghost"
          role="button"
          tabIndex={-1}
          draggable={false}
        >
          <Plus className="tiptap-button-icon" />
        </Button>

        <DropdownMenu
          open={open}
          onOpenChange={(next) => {
            if (isDraggingRef.current) return;
            if (next) {
              editor.commands.lockDragHandle();
            } else {
              editor.commands.unlockDragHandle();
            }
            setOpen(next);
          }}
        >
          <ColorDropdownProvider>
            {/* Hidden anchor — only used for menu positioning */}
            <DropdownMenuTrigger asChild>
              <span
                style={{
                  width: 0,
                  height: 0,
                  overflow: "hidden",
                  display: "block",
                }}
              />
            </DropdownMenuTrigger>

            {/* Grip is a plain button — nothing intercepts its pointer events */}
            <Button
              type="button"
              variant="ghost"
              role="button"
              className="grip-button"
              tabIndex={-1}
              onPointerDown={() => {
                editor.commands.setNodeSelection(pos);
              }}
              onClick={() => {
                if (isDraggingRef.current) return;
                editor.commands.lockDragHandle();
                setOpen((v) => !v);
              }}
              style={{
                cursor: "grab",
                pointerEvents: open ? "none" : "auto",
              }}
            >
              <GripVertical className="tiptap-button-icon" />
            </Button>

            {open &&
              createPortal(
                <DragHandleMenu
                  onAction={onAction}
                  target={target}
                  editor={editor}
                  side="left"
                  sideOffset={0}
                />,
                document.body,
              )}
          </ColorDropdownProvider>
        </DropdownMenu>
      </CardItemGroup>
    </TiptapDragHandle>
  );
}
