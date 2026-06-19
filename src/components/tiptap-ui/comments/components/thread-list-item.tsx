import { useCallback, useEffect, useRef } from "react";
import { useThreadState } from "../context/useThreadState.js";
import { CommentCard } from "./comment-card.js";
import { ThreadCard } from "./thread-card.js";
import { ThreadComposer } from "./thread-composer.js";
import type { PositionedThread, Thread } from "src/types";
import type { Editor } from "@tiptap/core";

import Button, {
  ButtonGroup,
} from "src/components/tiptap-ui-primitive/button/button.js";
import { scrollToThread } from "../extensions/utils/scrollToThread.js";

import "./thread-list-item.scss";
import { Check, RotateCw, Trash } from "lucide-react";
import { ThreadComposerSubmit } from "./thread-composer-submit.js";
import { useCommentsByThread } from "src/hooks/use-comments.js";
import { useDeleteComment } from "src/hooks/use-delete-comment.js";
import { usePatchComment } from "src/hooks/use-patch-comment.js";
import { patchComment } from "src/api/comments.js";

interface ThreadListItemProps {
  thread: Thread;
  editor: Editor;
  active: boolean;
  open: boolean;
  layout: PositionedThread;
}

export const ThreadsListItem = ({
  thread,
  active,
  open,
  layout,
}: ThreadListItemProps) => {
  const {
    onClickThread,
    deleteThread,
    onHoverThread,
    onLeaveThread,
    resolveThread,
    unresolveThread,
    onSelectedThreadChange,
    onResolveActiveThreadCollisions,
    requestReflow,
  } = useThreadState();

  const itemRef = useRef<HTMLDivElement | null>(null);

  // Re-resolve collisions whenever this card's own height changes
  // (textarea auto-grow, a reply rendering, open/close). measureAllThreads
  // caches heights, so without this the stale heights leave cards overlapping.
  useEffect(() => {
    const el = itemRef.current;
    if (!el || !requestReflow) return;

    const observer = new ResizeObserver(() => {
      requestReflow();
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [requestReflow]);

  const classNames = ["threadsList--item"];

  if (active || open) {
    classNames.push("threadsList--item--active");
  }

  const { data: comments } = useCommentsByThread(thread?.id ?? null);
  const deleteComment = useDeleteComment();
  const updateComment = usePatchComment(({ id, patch }) =>
    patchComment(id, patch),
  );
  const firstComment = comments?.[0];

  const handleDeleteClick = useCallback(() => {
    if (!thread) return;
    deleteThread?.(thread.id);
  }, [thread, deleteThread]);

  const handleResolveClick = useCallback(() => {
    if (!thread) return;
    resolveThread?.(thread.id);
  }, [thread, resolveThread]);

  const handleUnresolveClick = useCallback(() => {
    if (!thread) return;
    unresolveThread?.(thread.id);
  }, [thread, unresolveThread]);

  return (
    <>
      {thread && thread.status === "drafted" && (
        <span
          ref={itemRef}
          style={{
            position: "absolute",
            top: layout.resolvedTop,
            background: "aqua",
            right: 25,
          }}
        >
          <ThreadComposerSubmit threadId={thread.id} />
        </span>
      )}
      {thread && thread.status !== "drafted" && (
        <div
          ref={itemRef}
          data-thread-list-item-id={thread.id}
          className="thread-list-item"
          style={{
            top: layout.resolvedTop,
            right: 25,
            width: "280px",
          }}
          tabIndex={0}
          onMouseEnter={() => onHoverThread?.(thread.id)}
          onMouseLeave={() => onLeaveThread?.(thread.id)}
        >
          <ThreadCard
            id={thread.id}
            active={active}
            open={open}
            onClick={
              !open
                ? (threadId: string) => {
                    onClickThread?.(threadId);
                    scrollToThread(threadId);
                    onResolveActiveThreadCollisions(threadId);
                  }
                : null
            }
            onClickOutside={() => {
              onSelectedThreadChange(null);
            }}
          >
            {open ? (
              <>
                <div className="header-group">
                  <ButtonGroup orientation="horizontal">
                    {thread.status === "active" ? (
                      <Button
                        type="button"
                        role="menuitem"
                        variant="ghost"
                        onClick={handleResolveClick}
                      >
                        <Check size={12} />
                        <span>Resolve</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        role="menuitem"
                        variant="ghost"
                        onClick={handleUnresolveClick}
                      >
                        <RotateCw size={12} />
                        <span>Unresolve</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      role="menuitem"
                      variant="ghost"
                      onClick={handleDeleteClick}
                    >
                      <Trash size={12} />
                      <span>Delete</span>
                    </Button>
                  </ButtonGroup>
                </div>

                {thread.status === "resolved" ? (
                  <div className="hint">💡 Resolved at</div>
                ) : null}

                <div className="comments-group">
                  {comments?.map((comment) => (
                    <CommentCard
                      key={comment.id}
                      name={comment.personId}
                      content={comment.body}
                      createdAt={comment.createdAt}
                      deleted={false}
                      onEdit={(val) => {
                        updateComment.mutate({
                          id: comment.id,
                          patch: { body: val },
                        });
                      }}
                      onDelete={() => {
                        deleteComment.mutate(comment.id);
                      }}
                      showActions={true}
                    />
                  ))}
                </div>
                <div className="reply-group">
                  <ThreadComposer threadId={thread.id} />
                </div>
              </>
            ) : null}

            {!open && firstComment ? (
              <div className="comments-group">
                <CommentCard
                  key={firstComment.id}
                  name={firstComment.personId}
                  content={firstComment.body}
                  createdAt={firstComment.createdAt}
                  deleted={false}
                  onDelete={() => {
                    deleteComment.mutate(firstComment.id);
                  }}
                  onEdit={() => {}}
                  showActions={false}
                />
                <div className="comments-count">
                  <label style={{ marginLeft: "10px" }}>
                    {Math.max(0, comments.length - 1) || 0}{" "}
                    {(comments.length - 1 || 0) === 1 ? "reply" : "replies"}
                  </label>
                </div>
              </div>
            ) : null}
          </ThreadCard>
        </div>
      )}
    </>
  );
};
