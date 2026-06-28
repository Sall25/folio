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

  if (positionedThreads.length === 0) {
    return <label className="label"></label>;
  }

  if (!editor) return null;

  return (
    <div className="threads-group">
      {positionedThreads.map((t, index) => (
        <ThreadsListItem
          key={index}
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
