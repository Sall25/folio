import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Check, Edit, Ellipsis, RotateCcw, Trash } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card } from "src/components/tiptap-ui-primitive/card";
import type { JSONContent } from "@tiptap/core";
import "./comment-card.scss";
import { CommentBody } from "./comment-body";
import { CommentMentionEditor, type CommentEditorRef } from "../editor";
import { ReactionChips } from "./reaction-chips";
import { ReactionPicker } from "./reaction-picker";
import type { Reactions, ThreadSuggestion } from "src/types";
import { toggleReaction, parseReactions } from "src/lib/comment-reactions";
import { useCurrentPerson } from "src/hooks/use-session";
import { usePeopleById } from "src/hooks/use-people";
import { usePersonNames } from "src/hooks/use-person-names";
import { formatRelativeTime } from "src/utils/format-relative";
import { useNotificationActions } from "../../inbox/notification/notification-context";

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
  /** The commented text, shown as a quote under the header (first comment). */
  quote?: string;
  /** A suggested replacement: shown instead of the quote (old → new). */
  suggestion?: ThreadSuggestion | null;
  /** Rendered under the suggestion (Accept / Reject). */
  suggestionActions?: ReactNode;
  /** Shows the resolve / reopen button in the hover bar (thread's first comment). */
  onResolve?: () => void;
  resolved?: boolean;
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
  quote,
  suggestion,
  suggestionActions,
  onResolve,
  resolved = false,
  showActions,
  showReply,
  onReply,
  authorId,
  commentId,
  pageId,
  pageTitle,
  threadId,
}: CommentCardProps) => {
  const { t, i18n } = useTranslation();
  const [isComposing, setIsComposing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const editRef = useRef<CommentEditorRef>(null);
  const { person } = useCurrentPerson();
  // The author's real avatar — also for someone outside this workspace
  // (a former member, a guest), fetched by id when needed.
  const authorIds = useMemo(() => [authorId], [authorId]);
  const peopleById = usePeopleById(authorIds);
  const avatarUrl = authorId
    ? (peopleById.get(authorId)?.avatarUrl ?? undefined)
    : undefined;

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

  const hasReactions = Object.values(reactions).some(
    (ids) => (ids?.length ?? 0) > 0,
  );
  const hasBar =
    !deleted && !isComposing && (!!onReact || !!onResolve || showActions);
  const barVisible = hovered || menuOpen;

  const commentWrapperClass: string[] = ["comment"];
  if (deleted) commentWrapperClass.push("deleted");

  return (
    <div
      className={commentWrapperClass.join(" ")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="profile-group comment__head">
        <Avatar size="sm" src={avatarUrl} name={name} />
        <span className="comment__name">{name}</span>
        <span
          className="comment__time"
          title={new Date(createdAt).toLocaleString()}
        >
          {formatRelativeTime(createdAt, t, i18n.language)}
        </span>

        {hasBar && (
          <div
            className={`comment__bar${barVisible ? " is-visible" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {onReact && <ReactionPicker onPick={handleToggleReaction} />}
            {onResolve && (
              <button
                type="button"
                className="comment__bar-btn"
                title={
                  resolved
                    ? t("comments.reopen", "Re-open")
                    : t("comments.resolve", "Resolve")
                }
                aria-label={
                  resolved
                    ? t("comments.reopen", "Re-open")
                    : t("comments.resolve", "Resolve")
                }
                onClick={onResolve}
              >
                {resolved ? <RotateCcw size={15} /> : <Check size={15} />}
              </button>
            )}
            {showActions && (
              <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="comment__bar-btn"
                    title={t("comments.more", "More")}
                    aria-label={t("comments.more", "More")}
                  >
                    <Ellipsis size={15} />
                  </button>
                </PopoverTrigger>
                <PopoverPortal container={document.getElementById("root")}>
                  <PopoverContent
                    style={{ zIndex: 9999 }}
                    align="end"
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
                            onClick={() => {
                              setMenuOpen(false);
                              onReply?.();
                            }}
                          >
                            <span className="tiptap-button-text">
                              {t("comments.reply", "Reply")}
                            </span>
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
                            setMenuOpen(false);
                            setIsComposing(true);
                          }}
                        >
                          <Edit size={11} />
                          <span>{t("comments.edit", "Edit")}</span>
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
                              setMenuOpen(false);
                              onDelete();
                            }}
                          >
                            <Trash size={11} />
                            <span>{t("comments.delete", "Delete")}</span>
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
      </div>

      {suggestion && !deleted ? (
        <div className="comment__suggestion">
          {suggestion.original && (
            <div className="comment__suggestion-old">{suggestion.original}</div>
          )}
          {suggestion.text ? (
            <div className="comment__suggestion-new">{suggestion.text}</div>
          ) : (
            <div className="comment__suggestion-note">
              {t("comments.suggestDelete", "Delete this text")}
            </div>
          )}
          {suggestion.state !== "pending" && (
            <div className="comment__suggestion-note">
              {suggestion.state === "accepted"
                ? t("comments.suggestionAccepted", "Accepted")
                : t("comments.suggestionRejected", "Rejected")}
            </div>
          )}
          {suggestionActions}
        </div>
      ) : (
        quote && !deleted && <div className="comment__quote">{quote}</div>
      )}

      {deleted && (
        <div className="comment-content comment__body">
          <p>{t("comments.deleted", "Comment was deleted")}</p>
        </div>
      )}

      {!isComposing && !deleted && (
        <>
          {/* A suggestion can be posted without a note — no empty body. */}
          {content && (
            <div className="comment-content comment__body">
              <div className="comment-body-wrapper">
                <CommentBody body={content} />
              </div>
            </div>
          )}

          {onReact && hasReactions && (
            <div className="comment__reactions">
              <ReactionChips
                reactions={reactions}
                currentPersonId={person?.id}
                onToggle={handleToggleReaction}
              />
              <ReactionPicker onPick={handleToggleReaction} />
            </div>
          )}
        </>
      )}

      {isComposing && !deleted && (
        <div className="comment-edit comment__body">
          <CommentMentionEditor
            ref={editRef}
            autoFocus
            placeholder={t("comments.editPlaceholder", "Edit comment…")}
            initialContent={initialJson}
            onSubmit={handleEditSubmit}
          />
          <ButtonGroup orientation="horizontal">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsComposing(false)}
            >
              {t("comments.cancel", "Cancel")}
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => editRef.current?.submit()}
            >
              {t("comments.save", "Save")}
            </Button>
          </ButtonGroup>
        </div>
      )}
    </div>
  );
};
