import { DropdownMenuContent } from "src/components/tiptap-ui-primitive/dropdown-menu";
import type { Editor } from "@tiptap/core";

import Menu from "src/components/tiptap-ui/menu";
import "./drag-handle-menu.scss";

interface DragHandleMenuProps {
  editor: Editor;
  target: string;
  onAction?: () => void;
}

export function DragHandleMenu(props: DragHandleMenuProps) {
  const { target, editor, onAction } = props;

  return (
    <DropdownMenuContent
      className="drag-handle-menu-content"
      align="center"
      side="left"
    >
      <Menu onAction={onAction} editor={editor} title={target} />
    </DropdownMenuContent>
  );
}
