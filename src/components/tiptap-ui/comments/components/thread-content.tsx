import type { Editor } from "@tiptap/core";
import { Check, RotateCw, Trash2 } from "lucide-react";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import type { Thread } from "src/types";
import { useCommentsByThread } from "src/hooks/use-comments";
import { usePatchComment } from "src/hooks/use-patch-comment";
import { useDeleteComment } from "src/hooks/use-delete-comment";
import { usePatchThread } from "src/hooks/use-patch-thread";
import { useDeleteThread } from "src/hooks/use-delete-thread";
import { patchComment } from "src/api/comments";
import { patchThread } from "src/api/threads";
import { usePersonNames } from "src/hooks/use-person-names";
import { useCurrentPerson } from "src/hooks/use-session";
import { useActivePageState } from "src/components/tiptap-templates/simple/context/active-page-context";
import { CommentCard } from "./comment-card";
import { ThreadComposer } from "./thread-composer";
import "./thread-content.scss";

// Positioning-free thread content: header actions (resolve/unresolve/delete),
// the comments, and the reply composer. Used by the inline popover (and anywhere
// a thread should render without the sidebar's absolute-positioned card).
export function ThreadContent({
  thread,
  // editor,
  onDeleted,
}: {
  thread: Thread;
  editor?: Editor | null;
  onDeleted?: () => void;
}) {
  const { data: comments = [] } = useCommentsByThread(thread.id);
  const resolveName = usePersonNames();
  const { person } = useCurrentPerson();
  const { activePageId, activePage } = useActivePageState();

  const updateComment = usePatchComment(({ id, patch }) =>
    patchComment(id, patch),
  );
  const deleteComment = useDeleteComment();
  const mutateThread = usePatchThread(({ id, patch }) =>
    patchThread(id, patch),
  );
  const deleteThread = useDeleteThread();

  const resolve = () =>
    mutateThread.mutate({ id: thread.id, patch: { status: "resolved" } });
  const unresolve = () =>
    mutateThread.mutate({ id: thread.id, patch: { status: "active" } });
  const remove = () => {
    deleteThread.mutate({ id: thread.id });
    onDeleted?.();
  };

  return (
    <div className="thread-content">
      <div className="thread-content__header">
        <ButtonGroup orientation="horizontal">
          {thread.status === "resolved" ? (
            <Button
              size="small"
              type="button"
              variant="ghost"
              onClick={unresolve}
            >
              <RotateCw className="tiptap-button-icon" size={12} />
              <span className="tiptap-button-text">Unresolve</span>
            </Button>
          ) : (
            <Button
              size="small"
              type="button"
              variant="ghost"
              onClick={resolve}
            >
              <Check className="tiptap-button-icon" size={12} />
              <span className="tiptap-button-text">Resolve</span>
            </Button>
          )}
          <Button
            className="delete-thread-btn"
            size="small"
            type="button"
            variant="ghost"
            onClick={remove}
          >
            <Trash2 className="tiptap-button-icon" size={12} />
            <span className="tiptap-button-text">Delete</span>
          </Button>
        </ButtonGroup>
      </div>

      {thread.status === "resolved" && (
        <div className="thread-content__hint">Resolved</div>
      )}

      <div className="thread-content__comments">
        {comments.map((comment) => (
          <CommentCard
            key={comment.id}
            name={resolveName(comment.personId)}
            content={comment.body}
            createdAt={comment.createdAt}
            deleted={false}
            onEdit={(val) =>
              updateComment.mutate({ id: comment.id, patch: { body: val } })
            }
            onDelete={() => deleteComment.mutate(comment.id)}
            showActions={comment.personId === person?.id}
            reactions={comment.reactions}
            authorId={comment.personId}
            commentId={comment.id}
            pageId={activePageId ?? undefined}
            pageTitle={activePage?.title}
            threadId={thread.id}
            onReact={(next) =>
              updateComment.mutate({
                id: comment.id,
                patch: { reactions: next },
              })
            }
          />
        ))}
      </div>

      <div className="thread-content__reply">
        <ThreadComposer threadId={thread.id} />
      </div>
    </div>
  );
}
