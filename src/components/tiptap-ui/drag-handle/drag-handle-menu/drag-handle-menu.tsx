import { DropdownMenuContent } from "src/components/tiptap-ui-primitive/dropdown-menu";
import type { Editor } from "@tiptap/core";

import Menu from "src/components/tiptap-ui/menu";
import "./drag-handle-menu.scss";

interface DragHandleMenuProps {
  editor: Editor;
  target: string;
  onAction?: () => void;
  side?: "right" | "top" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

export function DragHandleMenu(props: DragHandleMenuProps) {
  const { target, editor, onAction, side, align, sideOffset } = props;

  return (
    <DropdownMenuContent
      className="drag-handle-menu-content"
      align={align ?? "center"}
      side={side}
      sideOffset={sideOffset}
      collisionPadding={8}
      // Closed: back to the editor (not to the grip), so Backspace, Escape
      // or Ctrl+C act on the blocks still selected. Unless an action moved
      // focus somewhere on purpose (the comment box, say).
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        const active = document.activeElement;
        if (!active || active === document.body) editor.view.focus();
      }}
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
