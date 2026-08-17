import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { Editor } from "@tiptap/core";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { useRef, useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { MessageSquareMore } from "lucide-react";
import "./comment-popover.scss";
import { useActivePageState } from "src/components/tiptap-templates/simple/context/active-page-context";
import { submitThread } from "../comments/extensions/utils/submitThread";
import { removeThread } from "../comments/extensions/utils/removeThread";
import { draftThread } from "../comments/extensions/utils/draftThread";

export function CommentPopover({ editor }: { editor: Editor | null }) {
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const { activePageId } = useActivePageState();

  // Remember the id of the draft we created, so cancel removes the right one.
  const draftIdRef = useRef<string | null>(null);

  const handleSubmit = () => {
    if (!comment.trim() || !editor || !activePageId) return;
    submitThread(editor, comment, activePageId);
    setComment("");
    draftIdRef.current = null;
    setOpen(false);
  };

  const handleCancel = () => {
    if (!editor) return;
    const threadId =
      draftIdRef.current ??
      editor.storage.commentThreadExtension?.draftId ??
      null;
    if (threadId) removeThread(editor, threadId);
    draftIdRef.current = null;
    setComment("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          // CRITICAL: capture the selection on mousedown WITH preventDefault,
          // BEFORE the popover opens and focus moves to the textarea. Radix's
          // trigger opens on pointer/click and collapses the editor selection;
          // by then draftThread would read an empty {from:X,to:X} range and the
          // thread gets no width → no decoration. preventDefault keeps focus in
          // the editor so the live selection survives, and we draft here.
          onMouseDown={(e) => {
            if (!activePageId || !editor) return;
            if (editor.state.selection.empty) {
              // Nothing selected — don't create a zero-width thread. Let the
              // popover not open (or you could toast "select text first").
              e.preventDefault();
              return;
            }
            e.preventDefault(); // keep the editor selection from collapsing
            draftThread(editor, activePageId);
            draftIdRef.current =
              editor.storage.commentThreadExtension?.draftId ?? null;
            setOpen(true); // open manually since we prevented the default
          }}
        >
          <MessageSquareMore className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={8}>
        <Card className="comment-popover-content">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            rows={1}
            autoFocus
            style={{
              resize: "vertical",
              width: "100%",
              minHeight: "32px",
              fontSize: "13px",
              lineHeight: "1.5",
              border: "0.5px solid var(--tt-border-color)",
              borderRadius: "var(--tt-radius-md)",
              outline: "none",
              padding: "6px 8px",
              boxSizing: "border-box",
              fontFamily: "var(--font-ui)",
              background: "var(--comment-textarea-bg-color)",
              color: "inherit",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                handleCancel();
              }
            }}
          />
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}
          >
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!comment.trim()}>
              Save
            </Button>
          </div>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
