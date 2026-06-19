import type React from "react";
import type { ID, PositionedThread, Thread } from "src/types";
import { ThreadContext } from "./threadContext";
import type { Transaction } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";

interface ThreadsProviderProps {
  children: React.ReactNode;
  threads: Thread[];
  selectedThread: Thread | null;
  onSelectedThreadChange: (thread: Thread | null) => unknown;
  onClickThread?: (threadId: string) => unknown;
  onUpdateComment?: (threadId: string) => unknown;
  onDeleteThread?: (threadId: string) => unknown;
  onResolveThread?: (threadId: string) => unknown;
  onUnresolveThread?: (threadId: string) => unknown;
  onHoverThread?: (threadId: string) => unknown;
  onLeaveThread?: (threadId: string) => unknown;
  onMapThreads: (tr: Transaction) => unknown;
  onMeasureAllThreads: (editor: Editor) => unknown;
  onResolveThreadCollisions: () => unknown;
  onResolveActiveThreadCollisions: (threadId: ID) => unknown;
  positionedThreads: PositionedThread[];
  requestReflow: () => unknown;
}

export const ThreadsProvider = ({
  children,
  threads = [],
  positionedThreads = [],
  selectedThread = null,
  // onSelectedThreadChange: ()=>{},
  onClickThread = () => {},
  onDeleteThread = () => {},
  onUpdateComment = () => {},
  onResolveThread = () => {},
  onUnresolveThread = () => {},
  onHoverThread = () => {},
  onLeaveThread = () => {},
  onMapThreads,
  onMeasureAllThreads,
  onResolveActiveThreadCollisions,
  onResolveThreadCollisions,
  onSelectedThreadChange,
  requestReflow,
}: ThreadsProviderProps) => {
  return (
    <ThreadContext.Provider
      value={{
        threads,
        selectedThread,
        deleteThread: onDeleteThread,
        resolveThread: onResolveThread,
        unresolveThread: onUnresolveThread,
        onClickThread: onClickThread,
        onUpdateComment,
        onHoverThread,
        onLeaveThread,
        positionedThreads,
        onMapThreads,
        onMeasureAllThreads,
        onResolveActiveThreadCollisions,
        onResolveThreadCollisions,
        onSelectedThreadChange,
        requestReflow,
      }}
    >
      {children}
    </ThreadContext.Provider>
  );
};
