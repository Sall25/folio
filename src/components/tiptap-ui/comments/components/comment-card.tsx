import { AvatarDemo } from "src/components/tiptap-ui-primitive/avatar";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Edit, Ellipsis, Trash } from "lucide-react";
import { useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import type { JSONContent } from "@tiptap/core";
import "./comment-card.scss";
import { CommentBody } from "./comment-body";
import { CommentMentionEditor, type CommentEditorRef } from "../editor";

interface CommentCardProps {
  name: string;
  createdAt: number;
  deleted: boolean;
  content: string;
  onEdit: (content: string) => void;
  onDelete: () => void;
  showActions: boolean;
  showReply?: boolean;
  onReply?: () => void;
}

export const CommentCard = ({
  name,
  createdAt,
  deleted,
  content,
  onEdit,
  onDelete,
  showActions,
  showReply,
  onReply,
}: CommentCardProps) => {
  const [isComposing, setIsComposing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const editRef = useRef<CommentEditorRef>(null);

  // Seed the edit editor from the current content. New comments are stringified
  // ProseMirror JSON; legacy comments are plain strings — wrap those as a
  // paragraph so they're still editable as rich text (and upgrade to JSON on
  // save).
  const initialJson: JSONContent | null = (() => {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object" && parsed.type === "doc") {
        return parsed;
      }
    } catch {
      /* not JSON — fall through to legacy handling */
    }
    return content
      ? {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: content }] },
          ],
        }
      : null;
  })();

  const handleEditSubmit = (json: JSONContent) => {
    setIsComposing(false);
    onEdit(JSON.stringify(json)); // store as stringified JSON, like new comments
  };

  const commentWrapperClass: string[] = ["comment"];
  if (deleted) {
    commentWrapperClass.push("deleted");
  }

  return (
    <div
      className={commentWrapperClass.join(" ")}
      onMouseOver={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="profile-group">
        <AvatarDemo />
        <div className="label-group">
          <label>{name}</label>
          <label>{new Date(createdAt).toLocaleTimeString()}</label>
        </div>
      </div>

      {deleted && (
        <div className="comment-content">
          <p>Comment was deleted</p>
        </div>
      )}

      {!isComposing && !deleted && (
        <div
          className="comment-content"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <div style={{ marginLeft: "4px" }} className="comment-body-wrapper">
            <CommentBody body={content} />
          </div>
          <Spacer orientation="horizontal" />
          {showActions && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  style={{
                    opacity: hovered ? 1 : 0,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  <Ellipsis className="tiptap-button-icon" />
                </Button>
              </PopoverTrigger>
              <PopoverPortal container={document.getElementById("root")}>
                <PopoverContent
                  style={{ zIndex: 9999 }}
                  align="center"
                  sideOffset={5}
                >
                  <Card
                    style={{
                      padding: "2px 5px",
                      borderRadius: "var(--tt-radius-sm)",
                    }}
                  >
                    <ButtonGroup orientation="vertical">
                      {showReply && (
                        <Button
                          type="button"
                          size="small"
                          variant="ghost"
                          className="page-comment__reply-trigger"
                          onClick={onReply}
                        >
                          <span className="tiptap-button-text"> Reply</span>
                        </Button>
                      )}
                      <Button
                        style={{ justifyContent: "flex-start" }}
                        variant="ghost"
                        size="small"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsComposing(true);
                        }}
                      >
                        <Edit size={11} />
                        <span>Edit</span>
                      </Button>
                      {onDelete && (
                        <Button
                          style={{
                            justifyContent: "flex-start",
                            minWidth: 100,
                          }}
                          size="small"
                          type="button"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete();
                          }}
                        >
                          <Trash size={11} />
                          <span>Delete</span>
                        </Button>
                      )}
                    </ButtonGroup>
                  </Card>
                </PopoverContent>
              </PopoverPortal>
            </Popover>
          )}
        </div>
      )}

      {isComposing && !deleted && (
        <div className="comment-edit">
          <CommentMentionEditor
            ref={editRef}
            autoFocus
            placeholder="Edit comment…"
            initialContent={initialJson}
            onSubmit={handleEditSubmit}
          />
          <ButtonGroup orientation="horizontal">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsComposing(false)}
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => editRef.current?.submit()}
            >
              Accept
            </Button>
          </ButtonGroup>
        </div>
      )}
    </div>
  );
};
