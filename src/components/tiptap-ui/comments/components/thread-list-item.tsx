import { useCallback, useMemo } from "react";

import { useThreadState } from "../context/useThreadState.js";
import { CommentCard } from "./comment-card.js";
import { ThreadCard } from "./thread-card.js";
import { ThreadComposer } from "./thread-composer.js";
import type { PositionedThread, Thread } from "../types/index.js";
import type { Editor } from "@tiptap/core";

import Button, {
  ButtonGroup,
} from "src/components/tiptap-ui-primitive/button/button.js";
import { scrollToThread } from "../extensions/utils/scrollToThread.js";

import "./thread-list-item.scss";
import { Check, RotateCw, Trash } from "lucide-react";
import { ThreadComposerSubmit } from "./thread-composer-submit.js";

interface ThreadListItemProps {
  thread: Thread;
  editor: Editor;
  active: boolean;
  open: boolean;
  layout: PositionedThread;
  pageId: number;
}

export const ThreadsListItem = ({
  thread,
  editor,
  active,
  open,
  layout,
  pageId,
}: ThreadListItemProps) => {
  const {
    onClickThread,
    deleteThread,
    onHoverThread,
    onLeaveThread,
    resolveThread,
    unresolveThread,
  } = useThreadState();
  const classNames = ["threadsList--item"];

  if (active || open) {
    classNames.push("threadsList--item--active");
  }

  const comments = useMemo(() => thread.comments, [thread]);

  const firstComment = comments?.[0];

  const handleDeleteClick = useCallback(() => {
    deleteThread?.(thread.id);
  }, [thread.id, deleteThread]);

  const handleResolveClick = useCallback(() => {
    resolveThread?.(thread.id);
  }, [thread.id, resolveThread]);

  const handleUnresolveClick = useCallback(() => {
    unresolveThread?.(thread.id);
  }, [thread.id, unresolveThread]);

  // if (thread.status === "drafted") return null;

  return (
    <>
      {thread.status === "drafted" && (
        <span
          style={{
            position: "absolute",
            top: layout.anchorTop,
            transform: `translateY(${layout.resolvedTop - layout.anchorTop}px)`,
          }}
        >
          <ThreadComposerSubmit
            pageId={pageId}
            editor={editor}
            threadId={thread.id}
          />
        </span>
      )}
      {thread.status !== "drafted" && (
        <div
          data-thread-list-item-id={thread.id}
          className="thread-list-item"
          style={{
            top: layout.anchorTop,
            transform: `translateY(${layout.resolvedTop - layout.anchorTop}px)`,
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
                  }
                : null
            }
            onClickOutside={() => {
              editor.commands.unselectThread();
            }}
            // onClickOutside
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
                        {/* ✓ Resolve */}
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
                        {/* ⟲ Unresolve */}
                      </Button>
                    )}
                    <Button
                      type="button"
                      role="menuitem"
                      variant="ghost"
                      onClick={handleDeleteClick}
                    >
                      {/* × Delete */}
                      <Trash size={12} />
                      <span>Delete</span>
                    </Button>
                  </ButtonGroup>
                </div>

                {thread.status === "resolved" ? (
                  <div className="hint">💡 Resolved at</div>
                ) : null}

                <div className="comments-group">
                  {comments.map((comment) => (
                    <CommentCard
                      key={comment.id}
                      name={comment.authorId}
                      content={comment.text}
                      createdAt={comment.createdAt}
                      deleted={false}
                      onEdit={(val) => {
                        editor.commands.updateComment(
                          thread.id,
                          comment.id,
                          val,
                        );
                      }}
                      onDelete={() => {
                        editor.commands.removeComment(thread.id, comment.id);
                      }}
                      showActions={true}
                    />
                  ))}
                </div>
                <div className="reply-group">
                  <ThreadComposer editor={editor} threadId={thread.id} />
                </div>
              </>
            ) : null}

            {!open && firstComment ? (
              <div className="comments-group">
                <CommentCard
                  key={firstComment.id}
                  name={firstComment.authorId}
                  content={firstComment.text}
                  createdAt={firstComment.createdAt}
                  deleted={false}
                  onDelete={() => {
                    editor.commands.removeComment(thread.id, firstComment.id);
                  }}
                  onEdit={() => {
                    // if (val) {
                    //   editComment(firstComment.id, val)
                    // }
                  }}
                  showActions={false}
                />
                <div className="comments-count">
                  <label
                    style={{
                      marginLeft: "10px",
                    }}
                  >
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
