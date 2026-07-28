import type { Editor } from "@tiptap/core";
import { ThreadsListItem } from "./thread-list-item.js";
import type { PositionedThread } from "src/types/types.js";
import { useThreadState } from "../context/useThreadState.js";

interface ThreadsListProps {
  editor: Editor | null;
  positionedThreads: PositionedThread[];
}

export const ThreadsList = ({
  editor,
  positionedThreads,
}: ThreadsListProps) => {
  const { threads, selectedThread } = useThreadState();

  // Inline threads only. Page-level threads (anchor === null) belong to the
  // page-comment node, never the sidebar. measureAllThreads already excludes
  // them, but guard here so a page-level thread can never render a card even
  // if it slipped into positionedThreads.
  const inline = positionedThreads.filter((t) => {
    const thread = threads.find((th) => th.id === t.id);
    return thread?.anchor != null; // has a real text anchor → inline
  });

  if (inline.length === 0) {
    return <label className="label"></label>;
  }

  if (!editor) return null;

  return (
    <div className="threads-group">
      {inline.map((t) => (
        <ThreadsListItem
          key={t.id}
          thread={threads.find((thread) => thread.id === t.id)!}
          active={selectedThread?.id === t.id}
          open={selectedThread?.id === t.id}
          editor={editor}
          layout={t}
        />
      ))}
    </div>
  );
};
