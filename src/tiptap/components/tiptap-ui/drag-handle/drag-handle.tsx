import type { Editor } from "@tiptap/core";
import { DragHandle as TiptapDragHandle } from "./drag-handle-extension-react";
import { useCallback, useRef, useState } from "react";
import { DragHandleMenu } from "./drag-handle-menu/drag-handle-menu";
import { CardItemGroup } from "@/components/tiptap-ui-primitive/card";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { GripVertical, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/tiptap-ui-primitive/dropdown-menu";

import "./drag-handle.scss";
import { ColorDropdownProvider } from "../color-dropdown-menu/color-dropdown-provider";
import { offset } from "@floating-ui/dom";

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

// export function DragHandle({ editor }: { editor: Editor | null }) {
//   const [open, setOpen] = useState(false);
//   const [target, setTarget] = useState("paragraph");
//   const [pos, setPos] = useState(-1);
//   const isDraggingRef = useRef(false);

//   const onAction = useCallback(() => {
//     console.log("onAction", Date.now());
//     editor?.commands.unlockDragHandle();
//     setOpen(false);

//     console.log("unlocked");
//   }, [editor]);

//   if (!editor) return null;

//   return (
//     <TiptapDragHandle
//       className="drag-handle"
//       editor={editor}
//       computePositionConfig={{ placement: "left-start" }}
//       onNodeChange={({ node, pos }) => {
//         // // Use the ref — not the stale `open` closure value

//         if (pos === -1 || node === null) {
//           return;
//         }

//         setTarget(NODE_LABELS[node.type.name]);

//         setPos(pos);
//       }}
//       onElementDragStart={() => {
//         isDraggingRef.current = true;
//         setOpen(false);
//       }}
//       onElementDragEnd={() => {
//         isDraggingRef.current = false;
//       }}
//     >
//       <CardItemGroup orientation="horizontal">
//         <Button type="button" variant="ghost" role="button" tabIndex={-1}>
//           <Plus className="tiptap-button-icon" />
//         </Button>
//         <DropdownMenu
//           open={open}
//           onOpenChange={(next) => {
//             if (isDraggingRef.current) return;

//             if (next) {
//               editor.commands.lockDragHandle();
//             } else {
//               editor.commands.unlockDragHandle();
//               console.log("onOpenChange");
//             }

//             setOpen(next);
//           }}
//         >
//           <ColorDropdownProvider>
//             <DropdownMenuTrigger asChild>
//               <Button
//                 type="button"
//                 variant="ghost"
//                 role="button"
//                 tabIndex={-1}
//                 draggable={true}
//                 onPointerDownCapture={() => {
//                   editor.commands.setNodeSelection(pos);
//                 }}
//                 onDragStart={(e) => {
//                   // Forward to the container element so the plugin's dragstart fires
//                   const container = e.currentTarget.closest(
//                     ".drag-handle",
//                   ) as HTMLElement;
//                   if (!container) return;
//                   container.draggable = true;
//                   container.dispatchEvent(
//                     new DragEvent("dragstart", {
//                       bubbles: true,
//                       cancelable: true,
//                       dataTransfer: e.nativeEvent.dataTransfer,
//                     }),
//                   );
//                   // Re-disable so accidental clicks on the container don't drag
//                   requestAnimationFrame(() => {
//                     container.draggable = false;
//                   });
//                 }}
//                 onDragEnd={(e) => {
//                   // Forward dragend the same way
//                   const container = e.currentTarget.closest(
//                     ".drag-handle",
//                   ) as HTMLElement;
//                   container?.dispatchEvent(
//                     new DragEvent("dragend", { bubbles: true }),
//                   );
//                 }}
//               >
//                 <GripVertical className="tiptap-button-icon" />
//               </Button>
//             </DropdownMenuTrigger>
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
//     </TiptapDragHandle>
//   );
// }

export function DragHandle({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("paragraph");
  const [pos, setPos] = useState(-1);
  const isDraggingRef = useRef(false);

  const onAction = useCallback(() => {
    editor?.commands.unlockDragHandle();
    setOpen(false);
  }, [editor]);

  if (!editor) return null;

  return (
    <TiptapDragHandle
      className="drag-handle"
      editor={editor}
      computePositionConfig={{ placement: "left-start" }}
      onNodeChange={({ node, pos }) => {
        if (pos === -1 || node === null) return;
        setTarget(NODE_LABELS[node.type.name]);
        setPos(pos);
      }}
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
              />
            )}
          </ColorDropdownProvider>
        </DropdownMenu>
      </CardItemGroup>
    </TiptapDragHandle>
  );
}
