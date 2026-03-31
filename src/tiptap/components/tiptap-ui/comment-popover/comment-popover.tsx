import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/tiptap-ui-primitive/popover";
import type { Editor } from "@tiptap/core";
import { CommentButton } from "../comment-button";
import { Card } from "@/components/tiptap-ui-primitive/card";
import { useState } from "react";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { MessageSquare, MessageSquareMore } from "lucide-react";
import "./comment-popover.scss";

export function CommentPopover({ editor }: { editor: Editor | null }) {
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (!comment.trim()) return;
    editor?.commands.submitThread(comment);
    setComment("");
    setOpen(false);
  };

  const handleCancel = () => {
    const draftId = editor?.storage.commentThreadExtension.draftId;
    if (!draftId) return;
    editor?.commands.removeThread(draftId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* <CommentButton editor={editor!} /> */}
        <Button
          variant="ghost"
          onPointerDown={() => editor?.commands.draftThread()}
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
