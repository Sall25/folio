import type { Editor } from "@tiptap/core";
import { useCallback, useRef, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { DragHandle as TiptapDragHandle } from "../drag-handle/drag-handle-extension-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useCreateThread } from "src/hooks/use-create-thread";
import { useActivePageState } from "src/components/tiptap-templates/simple/context/active-page-context";
import { draftNodeThread } from "./draft-node-thread";
import "./block-comment-handle.scss";

// A floating comment affordance at the RIGHT edge of the hovered block (Notion
// style). Reuses the drag-handle plugin's block tracking, but positioned on the
// right with its own pluginKey so it's independent of the left drag handle.
export function BlockCommentHandle({ editor }: { editor: Editor | null }) {
  const [pos, setPos] = useState(-1);
  const posRef = useRef(pos);
  const createThread = useCreateThread();
  const { activePageId } = useActivePageState();

  const onCommentBlock = useCallback(() => {
    if (!editor || posRef.current === -1 || !activePageId) return;
    draftNodeThread(editor, pos, activePageId, (t) =>
      createThread.mutateAsync(t),
    );
  }, [editor, activePageId, createThread, pos]);

  if (!editor) return null;

  return (
    <TiptapDragHandle
      className="block-comment-handle"
      editor={editor}
      pluginKey="blockCommentHandle"
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
