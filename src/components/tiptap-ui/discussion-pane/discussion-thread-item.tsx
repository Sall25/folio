import { useState } from "react";
import type { Editor } from "@tiptap/core";
import type { Thread } from "src/types";
import { useCommentsByThread } from "src/hooks/use-comments";
import { usePersonNames } from "src/hooks/use-person-names";
import { useCurrentPerson } from "src/hooks/use-session";
import { CommentCard } from "../comments/components/comment-card";
import { ThreadComposer } from "../comments/components/thread-composer";

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

  const first = comments[0];
  const replyCount = Math.max(0, comments.length - 1);

  if (!first) return null; // no comments — don't render an empty thread

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
