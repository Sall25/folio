import { useRef, useState } from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import { useTranslation } from "react-i18next";
import { ArrowUp, Check, X } from "src/components/icons";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import type { ID, Thread } from "src/types";
import { useCommentsByThread } from "src/hooks/use-comments";
import { useCreateComment } from "src/hooks/use-create-comment";
import { usePatchComment } from "src/hooks/use-patch-comment";
import { useDeleteComment } from "src/hooks/use-delete-comment";
import { usePatchThread } from "src/hooks/use-patch-thread";
import { useDeleteThread } from "src/hooks/use-delete-thread";
import { patchComment } from "src/api/comments";
import { patchThread } from "src/api/threads";
import { useCurrentPerson } from "src/hooks/use-session";
import { usePersonNames } from "src/hooks/use-person-names";
import { makeComment } from "src/utils/make-comment";
import { newId } from "src/lib/id";
import { useActivePageState } from "src/features/pages/context/active-page-context";
import { commentThreadPluginKey } from "../extensions";
import { CommentMentionEditor, type CommentEditorRef } from "../editor";
import { CommentCard } from "./comment-card";
import "./comment-thread-popover.scss";
import { anchorText, useNotifyMentions } from "../utils";
import { useToggleCommentReaction } from "src/hooks/use-toggle-comment-reaction";

// An existing thread: its comments (quote on the first one), reactions,
// resolve / re-open, edit / delete, and an "Add a comment…" reply row.
// Shared by the inline comment popover and the discussion pane so both look
// and behave the same.
export function ThreadConversation({
  editor,
  thread,
  onClose,
}: {
  editor: Editor | null;
  thread: Thread;
  /** Called when the thread leaves view: resolved, or its last comment deleted. */
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const { data: comments = [] } = useCommentsByThread(thread.id);
  const { person } = useCurrentPerson();
  const { activePage } = useActivePageState();
  const resolveName = usePersonNames();
  const createComment = useCreateComment();
  const notifyMentions = useNotifyMentions();
  const updateComment = usePatchComment(({ id, patch }) =>
    patchComment(id, patch),
  );
  const deleteComment = useDeleteComment();
  const deleteThread = useDeleteThread();
  const mutateThread = usePatchThread(({ id, patch }) =>
    patchThread(id, patch),
  );
  const editorRef = useRef<CommentEditorRef>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const quote = anchorText(editor, thread.id, thread.anchor);
  const resolved = thread.status === "resolved";
  const suggestion = thread.suggestion ?? null;
  const pending = !!suggestion && suggestion.state === "pending" && !resolved;
  const [stale, setStale] = useState(false);

  const react = useToggleCommentReaction();

  // Accept: replace the anchored text with the suggestion ("" deletes it),
  // then resolve. Refuses when the text changed since it was suggested, so an
  // old suggestion never overwrites newer edits.
  const acceptSuggestion = () => {
    if (!suggestion || !editor || editor.isDestroyed) return;
    const live = commentThreadPluginKey
      .getState(editor.state)
      ?.threads.find((th) => th.id === thread.id)?.anchor;
    if (!live || live.to <= live.from) {
      setStale(true);
      return;
    }
    const current = editor.state.doc.textBetween(live.from, live.to, " ");
    if (current.trim() !== suggestion.original.trim()) {
      setStale(true);
      return;
    }
    editor.view.dispatch(
      editor.state.tr.insertText(suggestion.text, live.from, live.to),
    );
    mutateThread.mutate({
      id: thread.id,
      patch: {
        status: "resolved",
        suggestion: { ...suggestion, state: "accepted" },
      },
    });
    onClose?.();
  };

  const rejectSuggestion = () => {
    if (!suggestion) return;
    mutateThread.mutate({
      id: thread.id,
      patch: {
        status: "resolved",
        suggestion: { ...suggestion, state: "rejected" },
      },
    });
    onClose?.();
  };

  const suggestionActions = pending ? (
    <div className="comment__suggestion-actions">
      <button
        type="button"
        className="ctp__action ctp__action--accept"
        onClick={acceptSuggestion}
        disabled={!editor}
      >
        <Check size={14} />
        {t("comments.accept", "Accept")}
      </button>
      <button type="button" className="ctp__action" onClick={rejectSuggestion}>
        <X size={14} />
        {t("comments.reject", "Reject")}
      </button>
      {stale && (
        <span className="comment__suggestion-error">
          {t(
            "comments.suggestionStale",
            "The text changed since this was suggested.",
          )}
        </span>
      )}
    </div>
  ) : null;

  const toggleResolved = () => {
    mutateThread.mutate({
      id: thread.id,
      patch: { status: resolved ? "open" : "resolved" },
    });
    // A resolved comment leaves the page (its highlight goes away).
    if (!resolved) onClose?.();
  };

  // Deleting the last comment deletes the thread (and its highlight).
  const removeComment = (commentId: ID) => {
    if (comments.length <= 1) {
      deleteThread.mutate({ id: thread.id });
      onClose?.();
    } else {
      deleteComment.mutate(commentId);
    }
  };

  const reply = (json: JSONContent) => {
    if (!person) return;
    const commentId = newId();
    createComment.mutate({
      comment: makeComment({
        id: commentId,
        threadId: thread.id,
        text: JSON.stringify(json),
        authorId: person.id,
      }),
      threadId: thread.id,
    });
    notifyMentions(json, commentId, thread.id);
    setIsEmpty(true);
  };

  return (
    <div className="ctp">
      <div className="ctp__comments">
        {comments.map((c, i) => (
          <CommentCard
            key={c.id}
            name={resolveName(c.personId)}
            content={c.body}
            createdAt={c.createdAt}
            deleted={false}
            quote={i === 0 && !suggestion ? quote : undefined}
            suggestion={i === 0 ? suggestion : undefined}
            suggestionActions={i === 0 ? suggestionActions : undefined}
            reactions={c.reactions}
            authorId={c.personId}
            commentId={c.id}
            pageId={thread.pageId}
            pageTitle={activePage?.title}
            threadId={thread.id}
            onReact={(emoji, next) => react.mutate({ id: c.id, emoji, next })}
            onEdit={(val) =>
              updateComment.mutate({ id: c.id, patch: { body: val } })
            }
            onDelete={() => removeComment(c.id)}
            onResolve={i === 0 ? toggleResolved : undefined}
            resolved={resolved}
            showActions={c.personId === person?.id}
          />
        ))}
      </div>

      {!resolved && (
        <div className="ctp__composer ctp__composer--reply">
          <Avatar
            size="sm"
            src={person?.avatarUrl ?? undefined}
            name={person?.name ?? ""}
          />
          <CommentMentionEditor
            ref={editorRef}
            placeholder={t("comments.addComment", "Add a comment…")}
            onSubmit={reply}
            onEmptyChange={setIsEmpty}
          />
          {!isEmpty && (
            <button
              type="button"
              className="ctp__send"
              aria-label={t("comments.send", "Send")}
              onClick={() => {
                editorRef.current?.submit();
                editorRef.current?.clear();
              }}
            >
              <ArrowUp size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
