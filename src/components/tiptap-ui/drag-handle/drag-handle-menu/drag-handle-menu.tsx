import { DropdownMenuContent } from "src/components/tiptap-ui-primitive/dropdown-menu";
import type { Editor } from "@tiptap/core";

import Menu from "src/components/tiptap-ui/menu";
import "./drag-handle-menu.scss";

interface DragHandleMenuProps {
  editor: Editor;
  target: string;
  onAction?: () => void;
  side?: "right" | "top" | "bottom" | "left";
  sideOffset?: number;
}

export function DragHandleMenu(props: DragHandleMenuProps) {
  const { target, editor, onAction, side, sideOffset } = props;

  return (
    <DropdownMenuContent
      className="drag-handle-menu-content"
      align="center"
      side={side}
      sideOffset={sideOffset}
      //side={side ?? "left"}
    >
      <Menu onAction={onAction} editor={editor} title={target} />
    </DropdownMenuContent>
  );
}
