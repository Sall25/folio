import type { Editor } from "@tiptap/core";
import { useCallback, useRef, useState } from "react";
import { MessageSquarePlus } from "src/components/icons";
import { DragHandle as TiptapDragHandle } from "../../../components/tiptap-ui/drag-handle/drag-handle-extension-react";
import { normalizeNestedOptions } from "@tiptap/extension-drag-handle";

// Top-level blocks only (what the plugin does when given nothing).
const NO_NESTED = normalizeNestedOptions(false);
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useActivePageState } from "src/features/pages/context/active-page-context";
import "./block-comment-handle.scss";
import { draftThread } from "../extensions/utils/draftThread";

// A floating comment affordance at the RIGHT edge of the hovered block (Notion
// style). Reuses the drag-handle plugin's block tracking, but positioned on the
// right with its own pluginKey so it's independent of the left drag handle.
export function BlockCommentHandle({ editor }: { editor: Editor | null }) {
  const [pos, setPos] = useState(-1);
  const posRef = useRef(pos);
  const { activePageId } = useActivePageState();

  const onCommentBlock = useCallback(() => {
    if (!editor || posRef.current === -1 || !activePageId) return;
    editor.commands.setNodeSelection(posRef.current);
    draftThread(editor, activePageId);
  }, [editor, activePageId]);

  if (!editor) return null;

  return (
    <TiptapDragHandle
      className="block-comment-handle"
      editor={editor}
      pluginKey="blockCommentHandle"
      nestedOptions={NO_NESTED}
      computePositionConfig={{ placement: "right-start" }}
      onNodeChange={({ pos: newPos }) => {
        posRef.current = newPos;
        setPos(newPos);
      }}
    >
      <Button
        type="button"
        size="small"
        variant="ghost"
        className="block-comment-handle__button"
        tabIndex={-1}
        draggable={false}
        onClick={onCommentBlock}
        tooltip="Comment"
        style={{ background: "transparent" }}
      >
        <MessageSquarePlus className="tiptap-button-icon" />
      </Button>
    </TiptapDragHandle>
  );
}
