import type { Thread } from "../types"


export type ThreadContextType = {
  threads: Thread[]
  selectedThreads: Thread[]
  selectedThread: Thread | null

  onClickThread?: (threadId: string) => unknown
  deleteThread?: (threadId: string) => unknown
  resolveThread?: (threadId: string) => unknown
  unresolveThread?: (threadId: string) => unknown
  onUpdateComment?: (threadId: string, commentId: string, newText: string) => unknown
  onHoverThread?: (threadId: string) => unknown
  onLeaveThread?: (threadId: string) => unknown
}