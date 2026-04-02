import type { Editor } from "@tiptap/core";
import { DragHandle as TiptapDragHandle } from "./drag-handle-extension-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { Node as PMNode } from "@tiptap/pm/model";

const NODE_LABELS: Record<string, string> = {
  paragraph: "Text",
  heading: "Heading",
  bulletList: "Bullet List",
  orderedList: "Numbered List",
  taskList: "To-do List",
  blockquote: "Blockquote",
  codeBlock: "Code Block",
  horizontalRule: "Separator",
  table: "Table",
  tableWrapper: "Table",
  tocNode: "Table of Contents",
  figure: "Image",
  columnBlock: "Columns",
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
      className="drag-handle"
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
      }}
    >
      <CardItemGroup orientation="horizontal">
        <Button type="button" variant="ghost" role="button" tabIndex={-1}>
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
