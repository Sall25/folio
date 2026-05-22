import type { Editor } from "@tiptap/core";
import { ThreadsListItem } from "./thread-list-item.js";
import type { PositionedThread } from "../types/index.js";
import { useCommentThreadState } from "../hooks/useCommentThreadState.js";

interface ThreadsListProps {
  editor: Editor | null;
  positionedThreads: PositionedThread[];
  pageId: number;
}

export const ThreadsList = ({
  editor,
  positionedThreads,
  pageId,
}: ThreadsListProps) => {
  const state = useCommentThreadState(editor);

  if (positionedThreads.length === 0) {
    return <label className="label"></label>;
  }

  if (!editor) return null;

  if (!state) return null;

  const { threads, selectedThreads, selectedThread } = state;

  return (
    <div className="threads-group">
      {positionedThreads.map((t, index) => (
        <ThreadsListItem
          key={index}
          thread={threads.find((thread) => thread.id === t.id)!}
          active={
            selectedThreads.some((thread) => thread.id === t.id) ||
            selectedThread?.id === t.id
          }
          open={selectedThread?.id === t.id}
          editor={editor}
          layout={t}
          pageId={pageId}
        />
      ))}
    </div>
  );
};
