import { useState, useEffect, useRef } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { useTranslation } from "react-i18next";
import { ArrowUp, Check, RotateCcw } from "src/components/icons";
import { useThreadsByPage } from "src/hooks/use-threads";
import { useCommentsByThread } from "src/hooks/use-comments";
import { useDeleteComment } from "src/hooks/use-delete-comment";
import { usePatchComment } from "src/hooks/use-patch-comment";
import { patchComment } from "src/api/comments";
import { useCreateThread } from "src/hooks/use-create-thread";
import { useCreateComment } from "src/hooks/use-create-comment";
import { usePatchThread } from "src/hooks/use-patch-thread";
import { patchThread } from "src/api/threads";
import { useCurrentPerson } from "src/hooks/use-session";
import { usePersonNames } from "src/hooks/use-person-names";
import { makeThread } from "src/utils/make-thread";
import { makeComment } from "src/utils/make-comment";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { CommentCard } from "src/features/comments/components/comment-card";
import {
  CommentMentionEditor,
  type CommentEditorRef,
} from "src/features/comments/editor";
import { useActivePageState } from "src/features/pages/context/active-page-context";
import type { Thread } from "src/types";
import "./page-comment-view.scss";

// Page-level comments. Each thread is a discussion card: a header
// (Discussion · count, Resolve), the comments joined by a thread line, and a
// filled reply field at the bottom. Renders NOTHING until there's an existing
// page comment or the user opens the composer (the page-top "Comment" button
// fires "folio:open-page-comment"). A thread is born only on submit.
export function PageCommentView({ node }: NodeViewProps) {
  const { t } = useTranslation();
  const pageId = node.attrs.pageId as string;
  const { data: threads = [] } = useThreadsByPage(pageId);
  const [showResolved, setShowResolved] = useState(false);

  const pageThreads = threads.filter(
    (th) =>
      th.anchor === null && th.status !== "deleted" && th.status !== "drafted",
  );
  const openThreads = pageThreads.filter((th) => th.status !== "resolved");
  const resolvedThreads = pageThreads.filter((th) => th.status === "resolved");

  const [composerOpen, setComposerOpen] = useState(false);
  useEffect(() => {
    const open = () => setComposerOpen(true);
    document.addEventListener("folio:open-page-comment", open);
    return () => document.removeEventListener("folio:open-page-comment", open);
  }, []);

  const showAnything = pageThreads.length > 0 || composerOpen;

  return (
    <NodeViewWrapper
      className={`page-comment${showAnything ? "" : " is-empty"}`}
      contentEditable={false}
      data-type="page-comment"
    >
      {openThreads.length > 0 && (
        <div className="page-comment__threads">
          {openThreads.map((thread) => (
            <PageThread key={thread.id} thread={thread} />
          ))}
        </div>
      )}

      {composerOpen && (
        <PageCommentComposer
          pageId={pageId}
          onDone={() => setComposerOpen(false)}
        />
      )}

      {resolvedThreads.length > 0 && (
        <>
          <button
            type="button"
            className="page-comment__resolved-toggle"
            onClick={() => setShowResolved((v) => !v)}
          >
            {showResolved
              ? t("comments.hideResolved", "Hide resolved comments")
              : t("comments.showResolved", {
                  count: resolvedThreads.length,
                  defaultValue: "{{count}} resolved comments",
                })}
          </button>
          {showResolved && (
            <div className="page-comment__threads is-resolved">
              {resolvedThreads.map((thread) => (
                <PageThread key={thread.id} thread={thread} />
              ))}
            </div>
          )}
        </>
      )}
    </NodeViewWrapper>
  );
}

function PageThread({ thread }: { thread: Thread }) {
  const { t } = useTranslation();
  const { data: comments = [] } = useCommentsByThread(thread.id);
  const { person } = useCurrentPerson();
  const { activePage } = useActivePageState();
  const resolveName = usePersonNames();

  const deleteComment = useDeleteComment();
  const updateComment = usePatchComment(({ id, patch }) =>
    patchComment(id, patch),
  );
  const mutateThread = usePatchThread(({ id, patch }) =>
    patchThread(id, patch),
  );

  const resolved = thread.status === "resolved";
  const toggleResolved = () =>
    mutateThread.mutate({
      id: thread.id,
      patch: { status: resolved ? "open" : "resolved" },
    });

  if (comments.length === 0) return null;

  return (
    <Card
      className={`page-comment__thread${resolved ? " is-resolved" : ""}`}
      aria-label={t("comments.discussion", "Discussion")}
    >
      <div className="page-comment__head">
        <span className="page-comment__title">
          {t("comments.discussion", "Discussion")}
        </span>
        <span className="page-comment__count">{comments.length}</span>
        <span className="page-comment__spacer" />
        <Button
          type="button"
          variant="ghost"
          size="small"
          onClick={toggleResolved}
        >
          {resolved ? (
            <RotateCcw className="tiptap-button-icon" size={14} />
          ) : (
            <Check className="tiptap-button-icon" size={14} />
          )}
          <span className="tiptap-button-text">
            {resolved
              ? t("comments.reopen", "Re-open")
              : t("comments.resolve", "Resolve")}
          </span>
        </Button>
      </div>

      <div className="page-comment__list">
        {comments.map((c) => (
          <CommentCard
            key={c.id}
            name={resolveName(c.personId)}
            content={c.body}
            createdAt={c.createdAt}
            deleted={false}
            reactions={c.reactions}
            authorId={c.personId}
            commentId={c.id}
            pageId={thread.pageId}
            pageTitle={activePage?.title}
            threadId={thread.id}
            onReact={(next) =>
              updateComment.mutate({ id: c.id, patch: { reactions: next } })
            }
            onEdit={(val) =>
              updateComment.mutate({ id: c.id, patch: { body: val } })
            }
            onDelete={() => deleteComment.mutate(c.id)}
            showActions={c.personId === person?.id}
          />
        ))}
      </div>

      {!resolved && <PageCommentReply threadId={thread.id} />}
    </Card>
  );
}

// The filled "Reply…" field at the bottom of an open discussion.
function PageCommentReply({ threadId }: { threadId: string }) {
  const { t } = useTranslation();
  const { person } = useCurrentPerson();
  const createComment = useCreateComment();
  const editorRef = useRef<CommentEditorRef>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const submit = (json: JSONContent) => {
    if (!person) return;
    createComment.mutate({
      comment: makeComment({
        threadId,
        text: JSON.stringify(json),
        authorId: person.id,
      }),
      threadId,
    });
    setIsEmpty(true);
  };

  return (
    <div className="page-comment__footer">
      <div className="page-comment__field">
        <CommentMentionEditor
          ref={editorRef}
          placeholder={t("comments.replyPlaceholder", "Reply…")}
          onSubmit={submit}
          onEmptyChange={setIsEmpty}
        />
        <button
          type="button"
          className="page-comment__submit"
          aria-label={t("comments.send", "Send")}
          disabled={isEmpty}
          onClick={() => {
            editorRef.current?.submit();
            editorRef.current?.clear();
          }}
        >
          <ArrowUp size={15} />
        </button>
      </div>
    </div>
  );
}

// A new discussion: the same card, with only the field until it's sent.
function PageCommentComposer({
  pageId,
  onDone,
}: {
  pageId: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { person } = useCurrentPerson();
  const createThread = useCreateThread();
  const createComment = useCreateComment();
  const editorRef = useRef<CommentEditorRef>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const submit = async (json: JSONContent) => {
    if (!person) return;
    const thread = makeThread({ pageId, anchor: null, status: "open" });
    await createThread.mutateAsync(thread);
    createComment.mutate({
      comment: makeComment({
        threadId: thread.id,
        text: JSON.stringify(json),
        authorId: person.id,
      }),
      threadId: thread.id,
    });
    onDone();
  };

  return (
    <Card className="page-comment__thread page-comment__thread--new">
      <div className="page-comment__footer">
        <div className="page-comment__field">
          <CommentMentionEditor
            ref={editorRef}
            autoFocus
            placeholder={t("comments.addComment", "Add a comment…")}
            onSubmit={submit}
            onEmptyChange={setIsEmpty}
          />
          <button
            type="button"
            className="page-comment__submit"
            aria-label={t("comments.send", "Send")}
            disabled={isEmpty}
            onClick={() => editorRef.current?.submit()}
          >
            <ArrowUp size={15} />
          </button>
        </div>
      </div>
    </Card>
  );
}
