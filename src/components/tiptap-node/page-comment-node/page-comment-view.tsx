import { useState, useEffect } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useThreadsByPage } from "src/hooks/use-threads";
import { useCommentsByThread } from "src/hooks/use-comments";
import { useCreateThread } from "src/hooks/use-create-thread";
import { useCreateComment } from "src/hooks/use-create-comment";
import { useCurrentPerson } from "src/hooks/use-session";
import { usePersonNames } from "src/hooks/use-person-names";
import { makeThread } from "src/utils/make-thread";
import { makeComment } from "src/utils/make-comment";
import { CommentCard } from "src/components/tiptap-ui/comments/components/comment-card";
import "./page-comment-view.scss";
import { useDeleteComment } from "src/hooks/use-delete-comment";
import { usePatchComment } from "src/hooks/use-patch-comment";
import { patchComment } from "src/api/comments";

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
      {comments.map((c) => (
        <CommentCard
          key={c.id}
          name={resolveName(c.personId)}
          content={c.body}
          createdAt={c.createdAt}
          deleted={false}
          onEdit={(val) =>
            updateComment.mutate({ id: c.id, patch: { body: val } })
          }
          onDelete={() => deleteComment.mutate(c.id)}
          showActions={c.personId === person?.id}
          showReply={true}
          onReply={() => setReplyOpen(true)}
        />
      ))}
      {replyOpen && (
        <PageCommentReply
          threadId={threadId}
          onDone={() => setReplyOpen(false)}
        />
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
  const [body, setBody] = useState("");
  const { person } = useCurrentPerson();
  const createComment = useCreateComment();

  const submit = () => {
    if (!body.trim() || !person) return;
    createComment.mutate({
      comment: makeComment({ threadId, text: body, authorId: person.id }),
      threadId,
    });
    setBody("");
    onDone();
  };

  return (
    <textarea
      className="page-comment__reply"
      rows={1}
      autoFocus
      value={body}
      placeholder="Reply…"
      onChange={(e) => setBody(e.target.value)}
      onBlur={() => !body.trim() && onDone()}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submit();
        }
        if (e.key === "Escape") onDone();
      }}
    />
  );
}

function PageCommentComposer({
  pageId,
  onDone,
}: {
  pageId: string;
  onDone: () => void;
}) {
  const [body, setBody] = useState("");
  const { person } = useCurrentPerson();
  const createThread = useCreateThread();
  const createComment = useCreateComment();

  const submit = async () => {
    if (!body.trim() || !person) return;
    // Thread born on submit, with its first comment — never before.
    const thread = makeThread({ pageId, anchor: null, status: "open" });
    await createThread.mutateAsync(thread);
    createComment.mutate({
      comment: makeComment({
        threadId: thread.id,
        text: body,
        authorId: person.id,
      }),
      threadId: thread.id,
    });
    setBody("");
    onDone();
  };

  return (
    <div className="page-comment__composer">
      <textarea
        rows={1}
        autoFocus
        value={body}
        placeholder="Add a comment…"
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => !body.trim() && onDone()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") onDone();
        }}
      />
    </div>
  );
}
