import type React from "react"
import type { Thread } from "../types"
import { ThreadContext } from "./threadContext"

interface ThreadsProviderProps {
  children: React.ReactNode
  threads: Thread[]
  selectedThreads: Thread[]
  selectedThread: Thread | null
  onClickThread?: (threadId: string) => unknown
  onUpdateComment?: (threadId: string) => unknown
  onDeleteThread?: (threadId: string) => unknown
  onResolveThread?: (threadId: string) => unknown
  onUnresolveThread?: (threadId: string) => unknown
  onHoverThread?: (threadId: string) => unknown
  onLeaveThread?: (threadId: string) => unknown
}

export const ThreadsProvider = ({
  children,
  threads = [],
  selectedThreads = [],
  selectedThread = null,
  onClickThread = () => { },
  onDeleteThread = () => { },
  onUpdateComment = () => { },
  onResolveThread = () => { },
  onUnresolveThread = () => { },
  onHoverThread = () => { },
  onLeaveThread = () => { }

}: ThreadsProviderProps) => {

  return <ThreadContext.Provider
    value={{
      threads,
      selectedThreads,
      selectedThread,

      deleteThread: onDeleteThread,
      resolveThread: onResolveThread,
      unresolveThread: onUnresolveThread,
      onClickThread: onClickThread,
      onUpdateComment,
      onHoverThread,
      onLeaveThread
    }}
  >
    {children}
  </ThreadContext.Provider >
}
