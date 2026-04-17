import type { Editor } from "@tiptap/core";
import { DragHandle as TiptapDragHandle } from "./drag-handle-extension-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Node, Node as PMNode } from "@tiptap/pm/model";
import type { NormalizedNestedOptions } from "@tiptap/extension-drag-handle";

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
        parent,
        depth,
      }: {
        node: Node;
        parent: Node | null;
        depth: number;
      }) => {
        const name = node.type.name;
        if (name === "column" || name === "columnBlock") {
          return 1000;
        }
        // if (parent?.type.name === "column") {
        //   return -250;
        // }
        if (
          name === "bulletList" ||
          name === "orderedList" ||
          name === "taskList" ||
          name === "blockquote" ||
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

  const handleNodeChange = useCallback(
    ({ node, pos: newPos }: { node: PMNode | null; pos: number }) => {
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
    },
    [],
  );

  if (!editor) return null;

  return (
    <TiptapDragHandle
      className={`drag-handle`}
      editor={editor}
      computePositionConfig={{
        placement: "left-start",
      }}
      onNodeChange={handleNodeChange}
      onElementDragStart={() => {
        isDraggingRef.current = true;

        setOpen(false);
      }}
      onElementDragEnd={() => {
        isDraggingRef.current = false;

        const pos = posRef.current;
        if (pos === -1 || !editor) return;

        // Give ProseMirror a tick to finish the drop transaction
        requestAnimationFrame(() => {
          const node = editor.state.doc.nodeAt(pos);

          // If the wrapper still exists but has no table children, delete it
          if (node?.type.name === "tableWrapper") {
            editor.chain().setNodeSelection(pos).deleteSelection().run();
          }
        });
      }}
      // onElementDragEnd={() => {
      //   isDraggingRef.current = false;
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

            {open && (
              <DragHandleMenu
                onAction={onAction}
                target={target}
                editor={editor}
                side="left"
                sideOffset={0}
              />
            )}
          </ColorDropdownProvider>
        </DropdownMenu>
      </CardItemGroup>
    </TiptapDragHandle>
  );
}
