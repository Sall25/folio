import { useState, useEffect, Fragment } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useThreadsByPage } from "src/hooks/use-threads";
import { useCommentsByThread } from "src/hooks/use-comments";
import { useDeleteComment } from "src/hooks/use-delete-comment";
import { usePatchComment } from "src/hooks/use-patch-comment";
import { patchComment } from "src/api/comments";
import { useCreateThread } from "src/hooks/use-create-thread";
import { useCreateComment } from "src/hooks/use-create-comment";
import { useCurrentPerson } from "src/hooks/use-session";
import { usePersonNames } from "src/hooks/use-person-names";
import { makeThread } from "src/utils/make-thread";
import { makeComment } from "src/utils/make-comment";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { CommentCard } from "src/components/tiptap-ui/comments/components/comment-card";
import {
  CommentMentionEditor,
  type CommentEditorRef,
} from "src/components/tiptap-ui/comments/editor";

import { ArrowUp } from "lucide-react";
import { useRef } from "react";
import "./page-comment-view.scss";

// Page-level comments (Notion style). Renders NOTHING until there's either an
// existing page comment or the user explicitly opens the composer (via the
// page-top "Comment" button, which fires a "folio:open-page-comment" event).
// No empty thread is ever created — a thread is born only on submit.
export function PageCommentView({ node }: NodeViewProps) {
  const pageId = node.attrs.pageId as string;
  const { data: threads = [] } = useThreadsByPage(pageId);
  const resolveName = usePersonNames();

  const pageThreads = threads.filter((t) => t.anchor === null);

  // The composer is hidden until the user asks for it. It's revealed by the
  // page-top Comment button dispatching this event (see FloatingActions).
  const [composerOpen, setComposerOpen] = useState(false);
  useEffect(() => {
    const open = () => setComposerOpen(true);
    document.addEventListener("folio:open-page-comment", open);
    return () => document.removeEventListener("folio:open-page-comment", open);
  }, []);

  // Nothing to show: no page comments AND composer not requested → render
  // nothing at all (an empty NodeViewWrapper keeps the node mounted so the
  // event listener stays alive, but takes no visual space).
  const showAnything = pageThreads.length > 0 || composerOpen;

  return (
    <NodeViewWrapper
      className={`page-comment${showAnything ? "" : " is-empty"}`}
      contentEditable={false}
      data-type="page-comment"
    >
      {pageThreads.length > 0 && (
        <div className="page-comment__threads">
          {pageThreads.map((thread) => (
            <PageThread
              key={thread.id}
              threadId={thread.id}
              resolveName={resolveName}
            />
          ))}
        </div>
      )}

      {composerOpen && (
        <PageCommentComposer
          pageId={pageId}
          onDone={() => setComposerOpen(false)}
        />
      )}
    </NodeViewWrapper>
  );
}

function PageThread({
  threadId,
  resolveName,
}: {
  threadId: string;
  resolveName: (id: string) => string;
}) {
  const { data: comments = [] } = useCommentsByThread(threadId);
  const { person } = useCurrentPerson();
  const [replyOpen, setReplyOpen] = useState(false);

  const deleteComment = useDeleteComment();
  const updateComment = usePatchComment(({ id, patch }) =>
    patchComment(id, patch),
  );

  // A thread with no comments shouldn't exist; guard so we never render an
  // orphaned reply box.
  if (comments.length === 0) return null;

  return (
    <div className="page-comment__thread">
      {comments.map((c, i) => (
        <Fragment key={c.id}>
          {i > 0 && <Spacer orientation="vertical" size={4} />}
          <CommentCard
            name={resolveName(c.personId)}
            content={c.body}
            createdAt={c.createdAt}
            deleted={false}
            onEdit={(val) =>
              updateComment.mutate({ id: c.id, patch: { body: val } })
            }
            onDelete={() => deleteComment.mutate(c.id)}
            showActions={c.personId === person?.id}
          />
        </Fragment>
      ))}
      {replyOpen ? (
        <PageCommentReply
          threadId={threadId}
          onDone={() => setReplyOpen(false)}
        />
      ) : (
        <button
          type="button"
          className="page-comment__reply-trigger"
          onClick={() => setReplyOpen(true)}
        >
          Reply
        </button>
      )}
    </div>
  );
}

function PageCommentReply({
  threadId,
  onDone,
}: {
  threadId: string;
  onDone: () => void;
}) {
  const { person } = useCurrentPerson();
  const createComment = useCreateComment();
  const editorRef = useRef<CommentEditorRef>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const submit = (json: import("@tiptap/core").JSONContent) => {
    if (!person) return;
    createComment.mutate({
      comment: makeComment({
        threadId,
        text: JSON.stringify(json),
        authorId: person.id,
      }),
      threadId,
    });
    onDone();
  };

  return (
    <div className="page-comment__reply">
      <CommentMentionEditor
        ref={editorRef}
        autoFocus
        placeholder="Reply…"
        onSubmit={submit}
        onEmptyChange={setIsEmpty}
      />
      <button
        type="button"
        className="page-comment__submit"
        disabled={isEmpty}
        onClick={() => editorRef.current?.submit()}
      >
        <ArrowUp size={16} />
      </button>
    </div>
  );
}

function PageCommentComposer({
  pageId,
  onDone,
}: {
  pageId: string;
  onDone: () => void;
}) {
  const { person } = useCurrentPerson();
  const createThread = useCreateThread();
  const createComment = useCreateComment();
  const editorRef = useRef<CommentEditorRef>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const submit = async (json: import("@tiptap/core").JSONContent) => {
    if (!person) return;
    // Thread born on submit, with its first comment — no empty threads.
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
    <div className="page-comment__composer">
      <CommentMentionEditor
        ref={editorRef}
        autoFocus
        placeholder="Add a comment…"
        onSubmit={submit}
        onEmptyChange={setIsEmpty}
      />
      <button
        type="button"
        className="page-comment__submit"
        disabled={isEmpty}
        onClick={() => editorRef.current?.submit()}
      >
        <ArrowUp size={16} />
      </button>
    </div>
  );
}
