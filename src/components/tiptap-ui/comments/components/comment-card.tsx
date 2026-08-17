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
import { ReactionChips } from "./reaction-chips";
import { ReactionPicker } from "./reaction-picker";
import type { Reactions } from "src/types";
import { toggleReaction, parseReactions } from "src/lib/comment-reactions";
import { useCurrentPerson } from "src/hooks/use-session";
import { usePersonNames } from "src/hooks/use-person-names";
import { useNotificationActions } from "../../notification/notification-context";

interface CommentCardProps {
  name: string;
  createdAt: number;
  deleted: boolean;
  content: string;
  reactions?: unknown;
  authorId?: string;
  commentId?: string;
  pageId?: string;
  pageTitle?: string;
  threadId?: string;
  onEdit: (content: string) => void;
  onDelete: () => void;
  onReact?: (next: Reactions) => void;
  showActions: boolean;
  showReply?: boolean;
  onReply?: () => void;
}

export const CommentCard = ({
  name,
  createdAt,
  deleted,
  content,
  reactions: rawReactions,
  onEdit,
  onDelete,
  onReact,
  showActions,
  showReply,
  onReply,
  authorId,
  commentId,
  pageId,
  pageTitle,
  threadId,
}: CommentCardProps) => {
  const [isComposing, setIsComposing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const editRef = useRef<CommentEditorRef>(null);
  const { person } = useCurrentPerson();

  const reactions = parseReactions(rawReactions);

  const resolveName = usePersonNames();
  const { addNotification } = useNotificationActions();

  const handleToggleReaction = (emoji: string) => {
    if (!person || !onReact) return;

    // Was this an ADD (person not yet in this emoji's list)?
    const alreadyReacted = (reactions[emoji] ?? []).includes(person.id);
    onReact(toggleReaction(reactions, emoji, person.id));

    // Notify the comment author on ADD only, and never for reacting to your own
    // comment.
    if (!alreadyReacted && authorId && authorId !== person.id && commentId) {
      addNotification({
        type: "comment-mention", // reuse the comment notification type
        title: "Reaction on your comment",
        message: `${resolveName(person.id)} reacted ${emoji} to your comment.`,
        recipientId: authorId,
        dedupKey: `reaction:${commentId}:${person.id}:${emoji}`,
        sourcePageId: pageId,
        sourcePageTitle: pageTitle,
        targetNodeId: threadId,
      });
    }
  };

  // Seed the edit editor from the current content (JSON or legacy string).
  const initialJson: JSONContent | null = (() => {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object" && parsed.type === "doc") {
        return parsed;
      }
    } catch {
      /* legacy plain string */
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
    onEdit(JSON.stringify(json));
  };

  const commentWrapperClass: string[] = ["comment"];
  if (deleted) commentWrapperClass.push("deleted");

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
        <>
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
            <div className="comment-actions-cluster">
              {onReact && <ReactionPicker onPick={handleToggleReaction} />}
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
          </div>

          {onReact && (
            <div style={{ marginLeft: "4px" }}>
              <ReactionChips
                reactions={reactions}
                currentPersonId={person?.id}
                onToggle={handleToggleReaction}
              />
            </div>
          )}
        </>
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
