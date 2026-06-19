import type { Editor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import type { ID, PositionedThread, Thread } from "src/types";

export type ThreadContextType = {
  threads: Thread[];
  selectedThread: Thread | null;
  onSelectedThreadChange: (thread: Thread | null) => unknown;
  onClickThread?: (threadId: string) => unknown;
  deleteThread?: (threadId: string) => unknown;
  resolveThread?: (threadId: string) => unknown;
  unresolveThread?: (threadId: string) => unknown;
  onUpdateComment?: (
    threadId: string,
    commentId: string,
    newText: string,
  ) => unknown;
  onHoverThread?: (threadId: string) => unknown;
  onLeaveThread?: (threadId: string) => unknown;
  onMapThreads: (tr: Transaction) => unknown;
  onMeasureAllThreads: (editor: Editor) => unknown;
  onResolveThreadCollisions: () => unknown;
  onResolveActiveThreadCollisions: (threadId: ID) => unknown;
  positionedThreads: PositionedThread[];
  requestReflow: () => unknown;
};
