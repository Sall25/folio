import type { Node as PMNode } from "@tiptap/pm/model";
import { DragHandle } from "./drag-handle-extension-react";
import type { Editor } from "@tiptap/core";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import type { NormalizedNestedOptions } from "@tiptap/extension-drag-handle";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { GripHorizontal, GripVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { ColorDropdownProvider } from "../color-dropdown-menu/color-dropdown-provider";
import { DragHandleMenu } from "./drag-handle-menu/drag-handle-menu";
import { PluginKey } from "@tiptap/pm/state";

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

// At the top of the file, outside the component
const COLUMN_DRAG_HANDLE_KEY = new PluginKey("ColumnDragHandlePlugin");

export function ColumnDragHandle({ editor }: { editor: Editor | null }) {
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

  // Track column resize state
  const isColumnResizingRef = useRef(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const { isResizing } = (e as CustomEvent<{ isResizing: boolean }>).detail;
      isColumnResizingRef.current = isResizing;
      const handleEl = document.querySelector(".column-drag-handle");
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
            if (node.type.name === "column" || node.type.name === "columnBlock")
              return 1000;
            return 0;
          },
        },
      ],
      //defaultRules: true,
      allowedContainers: ["column"],
    }),
    [], // truly static — no deps needed
  );

  if (!editor) return null;

  return (
    <DragHandle
      pluginKey={COLUMN_DRAG_HANDLE_KEY}
      className="column-drag-handle"
      editor={editor}
      computePositionConfig={{
        placement: "right",
      }}
      onNodeChange={handleNodeChange}
      onElementDragStart={() => {
        isDraggingRef.current = true;
        setOpen(false);
      }}
      onElementDragEnd={() => {
        isDraggingRef.current = false;
      }}
      nestedOptions={nestedOptions as unknown as NormalizedNestedOptions}
    >
      <CardItemGroup orientation="horizontal">
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
                side="right"
                sideOffset={40}
              />
            )}
          </ColorDropdownProvider>
        </DropdownMenu>
      </CardItemGroup>
    </DragHandle>
  );
}

// export function ColumnDragHandle({ editor }: { editor: Editor | null }) {
//   const [open, setOpen] = useState(false);
//   const [target, setTarget] = useState("paragraph");
//   const isDraggingRef = useRef(false);
//   const targetRef = useRef(target);
//   const posRef = useRef<number>(-1);

//   const onAction = useCallback(() => {
//     setOpen(false);
//     editor?.commands.unlockDragHandle();
//   }, [editor]);

//   const handleNodeChange = useCallback(
//     ({
//       node,
//       pos: newPos,
//       editor: e,
//     }: {
//       node: PMNode | null;
//       pos: number;
//       editor: Editor;
//     }) => {
//       if (newPos === -1 || node === null) return;

//       // Only activate for direct children of a column
//       const $pos = e.state.doc.resolve(newPos);
//       if ($pos.parent.type.name !== "column") return;

//       const newTarget = NODE_LABELS[node.type.name] ?? "paragraph";

//       if (newPos !== posRef.current) {
//         posRef.current = newPos;
//       }

//       if (newTarget !== targetRef.current) {
//         targetRef.current = newTarget;
//         setTarget(newTarget);
//       }
//     },
//     [],
//   );

//   useEffect(() => {
//     const handler = (e: Event) => {
//       const { isResizing } = (e as CustomEvent<{ isResizing: boolean }>).detail;
//       const handleEl = document.querySelector(".drag-handle");
//       if (handleEl instanceof HTMLElement) {
//         handleEl.style.opacity = isResizing ? "0" : "";
//         handleEl.style.pointerEvents = isResizing ? "none" : "";
//       }
//     };
//     document.addEventListener("column:resize", handler);
//     return () => document.removeEventListener("column:resize", handler);
//   }, []);

//   if (!editor) return null;

//   return (
//     <DragHandle
//       pluginKey={COLUMN_DRAG_HANDLE_KEY} // ✅ stable reference, never changes
//       className="column-drag-handle"
//       editor={editor}
//       computePositionConfig={{ placement: "left" }}
//       onNodeChange={handleNodeChange}
//       onElementDragStart={() => {
//         isDraggingRef.current = true;
//         setOpen(false);
//       }}
//       onElementDragEnd={() => {
//         isDraggingRef.current = false;
//       }}
//       // ✅ No nestedOptions at all — filtering is done in onNodeChange
//     >
//       <CardItemGroup orientation="horizontal">
//         <DropdownMenu
//           open={open}
//           onOpenChange={(next) => {
//             if (isDraggingRef.current) return;
//             if (next) {
//               editor.commands.lockDragHandle();
//             } else {
//               editor.commands.unlockDragHandle();
//             }
//             setOpen(next);
//           }}
//         >
//           <ColorDropdownProvider>
//             <DropdownMenuTrigger asChild>
//               <span
//                 style={{
//                   width: 0,
//                   height: 0,
//                   overflow: "hidden",
//                   display: "block",
//                 }}
//               />
//             </DropdownMenuTrigger>

//             <Button
//               type="button"
//               variant="ghost"
//               role="button"
//               tabIndex={-1}
//               onPointerDown={() => {
//                 editor.commands.setNodeSelection(posRef.current);
//               }}
//               onClick={() => {
//                 if (isDraggingRef.current) return;
//                 editor.commands.lockDragHandle();
//                 setOpen((v) => !v);
//               }}
//               style={{ cursor: "grab", pointerEvents: open ? "none" : "auto" }}
//             >
//               <GripHorizontal className="tiptap-button-icon" />
//             </Button>

//             {open && (
//               <DragHandleMenu
//                 onAction={onAction}
//                 target={target}
//                 editor={editor}
//               />
//             )}
//           </ColorDropdownProvider>
//         </DropdownMenu>
//       </CardItemGroup>
//     </DragHandle>
//   );
// }
