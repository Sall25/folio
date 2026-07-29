import { useMemo } from "react";
import type { Editor } from "@tiptap/core";
import { MessageSquareText, ListFilter, X } from "lucide-react";
import { useThreadsByPage } from "src/hooks/use-threads";
import { useThreadState } from "../comments/context/useThreadState";
import { scrollToThread } from "../comments/extensions/utils/scrollToThread";
import { DiscussionThreadItem } from "./discussion-thread-item";
import "./discussion-pane.scss";

// Per-page discussion pane. Replaces the right gutter (the floating thread
// cards) while open. Lists ALL of the current page's threads — inline
// (anchor != null) and page-level (anchor == null). Clicking one scrolls to it
// and makes it active via the existing selectThread path.
export function DiscussionPane({
  editor,
  pageId,
  onClose,
}: {
  editor: Editor | null;
  pageId: string | null;
  onClose: () => void;
}) {
  const { data: threads = [] } = useThreadsByPage(pageId);
  const { onClickThread, onResolveActiveThreadCollisions } = useThreadState();

  // Stable order: inline threads by document position, then page-level.
  const ordered = useMemo(() => {
    const inline = threads
      .filter((t) => t.anchor != null)
      .sort((a, b) => (a.anchor!.from ?? 0) - (b.anchor!.from ?? 0));
    const pageLevel = threads.filter((t) => t.anchor == null);
    return [...inline, ...pageLevel];
  }, [threads]);

  const handleSelect = (threadId: string, isPageLevel: boolean) => {
    onClickThread?.(threadId);
    if (isPageLevel) {
      // Page-level threads live in the page-comment node — scroll to it.
      const node = document.querySelector('[data-type="page-comment"]');
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      scrollToThread(threadId);
    }
    onResolveActiveThreadCollisions?.(threadId);
  };

  return (
    <div className="discussion-pane">
      <div className="discussion-pane__header">
        <span className="discussion-pane__title">Comments</span>
        <div className="discussion-pane__header-actions">
          <button
            type="button"
            className="discussion-pane__icon-btn"
            title="Filter"
            disabled
          >
            <ListFilter size={16} />
          </button>
          <button
            type="button"
            className="discussion-pane__icon-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="discussion-pane__body">
        {ordered.length === 0 ? (
          <div className="discussion-pane__empty">
            <MessageSquareText size={28} strokeWidth={1.5} />
            <p>No comments yet</p>
          </div>
        ) : (
          ordered.map((thread) => (
            <DiscussionThreadItem
              key={thread.id}
              thread={thread}
              editor={editor}
              onSelect={() => handleSelect(thread.id, thread.anchor == null)}
            />
          ))
        )}
      </div>
    </div>
  );
}
