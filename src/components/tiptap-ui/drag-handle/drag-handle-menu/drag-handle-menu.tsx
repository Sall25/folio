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
      {/* `target` is both the human label (title) AND the branch key: Menu shows
          the record menu when target is the databaseRecord label ("Record"),
          and the node-formatting menu otherwise. */}
      <Menu
        onAction={onAction}
        editor={editor}
        title={target}
        target={target}
      />
    </DropdownMenuContent>
  );
}
