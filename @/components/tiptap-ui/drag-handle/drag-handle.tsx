import type { Editor } from "@tiptap/core";
import { DragHandle as TiptapDragHandle } from "./drag-handle-extension-react";
import { useCallback, useState } from "react";
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

export function DragHandle({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("paragraph");
  const [pos, setPos] = useState(-1);

  const onAction = useCallback(() => {
    setOpen(false);
    editor?.commands.unlockDragHandle();
  }, [editor]);

  if (!editor) return null;

  return (
    <TiptapDragHandle
      className="drag-handle"
      editor={editor}
      computePositionConfig={{ placement: "left-start" }}
      onNodeChange={({ node, pos }) => {
        // // Use the ref — not the stale `open` closure value

        if (pos === -1 || node === null) {
          return;
        }

        setTarget(NODE_LABELS[node.type.name]);

        setPos(pos);
      }}
    >
      <CardItemGroup orientation="horizontal">
        <Button type="button" variant="ghost" role="button" tabIndex={-1}>
          <Plus className="tiptap-button-icon" />
        </Button>
        <DropdownMenu
          open={open}
          onOpenChange={(next) => {
            if (next) {
              editor.commands.lockDragHandle();
            } else {
              editor.commands.unlockDragHandle();
            }

            setOpen(next);
          }}
        >
          <ColorDropdownProvider>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                role="button"
                tabIndex={-1}
                onPointerDownCapture={() => {
                  editor.commands.setNodeSelection(pos);
                }}
              >
                <GripVertical className="tiptap-button-icon" />
              </Button>
            </DropdownMenuTrigger>
            <DragHandleMenu
              onAction={onAction}
              target={target}
              editor={editor}
            />
          </ColorDropdownProvider>
        </DropdownMenu>
      </CardItemGroup>
    </TiptapDragHandle>
  );
}
