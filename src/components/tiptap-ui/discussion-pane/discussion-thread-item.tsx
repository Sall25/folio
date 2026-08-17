import { useState } from "react";
import type { Editor } from "@tiptap/core";
import type { Thread } from "src/types";
import { useCommentsByThread } from "src/hooks/use-comments";
import { usePersonNames } from "src/hooks/use-person-names";
import { useCurrentPerson } from "src/hooks/use-session";
import { CommentCard } from "../comments/components/comment-card";
import { ThreadComposer } from "../comments/components/thread-composer";
import { usePatchComment } from "src/hooks/use-patch-comment";
import { patchComment } from "src/api/comments";
import { useActivePageState } from "src/components/tiptap-templates/simple/context/active-page-context";

// A thread row in the discussion pane. Collapsed by default (first comment +
// reply count); expands on click to show all comments + a reply box. Selecting
// it also scrolls to / activates the thread in the doc (via onSelect).
export function DiscussionThreadItem({
  thread,
  onSelect,
}: {
  thread: Thread;
  editor: Editor | null;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: comments = [] } = useCommentsByThread(thread.id);
  const resolveName = usePersonNames();
  const { person } = useCurrentPerson();
  const { activePage, activePageId } = useActivePageState();

  const first = comments[0];
  const replyCount = Math.max(0, comments.length - 1);

  const updateComment = usePatchComment(({ id, patch }) =>
    patchComment(id, patch),
  );

  if (!first) return null;

  return (
    <div
      className={`discussion-item${expanded ? " is-expanded" : ""}${
        thread.status === "resolved" ? " is-resolved" : ""
      }`}
      onClick={() => {
        onSelect();
        setExpanded((v) => !v);
      }}
    >
      {expanded ? (
        <>
          {comments.map((c) => (
            <CommentCard
              key={c.id}
              name={resolveName(c.personId)}
              content={c.body}
              createdAt={c.createdAt}
              deleted={false}
              onEdit={() => {}}
              onDelete={() => {}}
              showActions={c.personId === person?.id}
              reactions={c.reactions}
              onReact={(next) =>
                updateComment.mutate({ id: c.id, patch: { reactions: next } })
              }
              authorId={c.personId}
              commentId={c.id}
              pageId={activePageId ?? undefined}
              pageTitle={activePage?.title}
              threadId={thread.id}
            />
          ))}
          <div
            className="discussion-item__reply"
            onClick={(e) => e.stopPropagation()}
          >
            <ThreadComposer threadId={thread.id} />
          </div>
        </>
      ) : (
        <>
          <CommentCard
            name={resolveName(first.personId)}
            content={first.body}
            createdAt={first.createdAt}
            deleted={false}
            onEdit={() => {}}
            onDelete={() => {}}
            showActions={false}
          />
          {replyCount > 0 && (
            <span className="discussion-item__count">
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </span>
          )}
        </>
      )}
    </div>
  );
}
