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
import { offset } from "@floating-ui/dom";
import type { NormalizedNestedOptions } from "@tiptap/extension-drag-handle";
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
};

function getColumnElement(editor: Editor, pos: number): Element | null {
  if (pos === -1) return null;
  const node = editor.view.nodeDOM(pos);
  if (!node) return null;
  const el = node instanceof Element ? node : (node as Node).parentElement;
  return el?.closest('[data-type="column"]') ?? null;
}

export function DragHandle({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("paragraph");
  const [pos, setPos] = useState(-1);
  const isDraggingRef = useRef(false);
  const targetRef = useRef(target);
  const posRef = useRef(pos);
  //  Track the current column element for virtual element clamping
  const [columnEl, setColumnEl] = useState<Element | null>(null);

  const onAction = useCallback(() => {
    editor?.commands.unlockDragHandle();
    setOpen(false);
  }, [editor]);

  const handleNodeChange = useCallback(
    ({ node, pos: newPos }: { node: PMNode | null; pos: number }) => {
      if (newPos === -1 || node === null) return;

      const newTarget = NODE_LABELS[node.type.name] ?? "paragraph";

      if (newPos !== posRef.current) {
        posRef.current = newPos;
        setPos(newPos);

        // ✅ Update the column reference whenever the node changes
        setColumnEl(editor ? getColumnElement(editor, newPos) : null);
      }

      if (newTarget !== targetRef.current) {
        targetRef.current = newTarget;
        setTarget(newTarget);
      }
    },
    [editor],
  );

  // Track column resize state
  const isColumnResizingRef = useRef(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const { isResizing } = (e as CustomEvent<{ isResizing: boolean }>).detail;
      isColumnResizingRef.current = isResizing;

      // Directly toggle visibility on the handle DOM element
      // avoids a React rerender entirely
      const handleEl = document.querySelector(".drag-handle");
      if (handleEl instanceof HTMLElement) {
        handleEl.style.opacity = isResizing ? "0" : "";
        handleEl.style.pointerEvents = isResizing ? "none" : "";
      }
    };

    document.addEventListener("column:resize", handler);
    return () => document.removeEventListener("column:resize", handler);
  }, []);

  const nestedOptions = useMemo(
    () => ({
      enabled: true,
      edgeDetection: {
        threshold: -16,
        edges: ["left"],
        strength: 500,
      },
      rules: [
        {
          id: "deprioritize-column",
          evaluate: ({ node }: { node: PMNode }) => {
            // Column should never be the drag target when its children are available
            // 1000+ effectively excludes it from selection
            if (node.type.name === "column" || node.type.name === "columnBlock")
              return 1000;
            return 0;
          },
        },
      ],
      // defaultRules: true,
      //allowedContainers: ["column"],
    }),
    [], // truly static — no deps needed
  );

  //  Virtual element that clamps the handle to the column's left edge
  // When not in a column, returns null (uses default positioning)
  const getReferencedVirtualElement = useCallback(() => {
    const colEl = columnEl;
    if (!colEl) return null;

    const colRect = colEl.getBoundingClientRect();

    return {
      getBoundingClientRect: () => ({
        // Pin X to the column's left edge
        x: colRect.left,
        left: colRect.left,
        right: colRect.left,
        // Keep Y dynamic by re-reading the column rect
        y: colRect.top,
        top: colRect.top,
        bottom: colRect.bottom,
        width: 0,
        height: colRect.height,
      }),
    };
  }, [columnEl]); // reads from ref — no deps needed

  if (!editor) return null;

  return (
    <TiptapDragHandle
      className="drag-handle"
      editor={editor}
      computePositionConfig={{
        placement: "left-start",
        // offset keeps the handle flush against the column edge
        // adjust the value to taste (negative = overlap, positive = gap)
        middleware: columnEl ? [offset({ mainAxis: 0, crossAxis: 0 })] : [],
      }}
      onNodeChange={handleNodeChange}
      getReferencedVirtualElement={
        columnEl ? getReferencedVirtualElement : undefined
      }
      onElementDragStart={() => {
        isDraggingRef.current = true;
        setOpen(false);
      }}
      onElementDragEnd={() => {
        isDraggingRef.current = false;
      }}
      // computePositionConfig={{ placement: "left-start" }}
      // onNodeChange={({ node, pos }) => {
      //   if (pos === -1 || node === null) return;
      //   setTarget(NODE_LABELS[node.type.name]);
      //   setPos(pos);
      // }}
      // onElementDragStart={() => {
      //   isDraggingRef.current = true;
      //   setOpen(false);
      // }}
      // onElementDragEnd={() => {
      //   isDraggingRef.current = false;
      // }}
      nestedOptions={nestedOptions as unknown as NormalizedNestedOptions}
      // nestedOptions={{
      //   enabled: true,
      //   edgeDetection: { threshold: -16, edges: ["left"], strength: 500 },
      //   rules: [],
      //   defaultRules: true,
      //   allowedContainers: ["column"],
      // }}
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
              />
            )}
          </ColorDropdownProvider>
        </DropdownMenu>
      </CardItemGroup>
    </TiptapDragHandle>
  );
}
