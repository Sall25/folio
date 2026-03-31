import type { Editor } from "@tiptap/core";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ThreadsProvider } from "../context/threadProvider";
import { getCommentThreadState } from "../extensions/utils/getCommentThreadState";

import type { Thread } from "../types";

export function ThreadSidebarBase({ editor, children }: { editor: Editor | null, children: ReactNode }) {

  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThreads, setSelectedThreads] = useState<Thread[]>([])
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)


  const deleteTread = useCallback((threadId: string) => {
    if (!editor) return

    editor.commands.removeThread(threadId)

  }, [editor])

  const onClickThread = useCallback((threadId: string) => {
    if (!editor) return

    editor.commands.unselectThread()

    editor.commands.selectThread(threadId)
  }, [editor])

  const onHoverThread = useCallback((threadId: string) => {
    if (!editor) return

    editor.commands.hoverThread(threadId)
  }, [editor])

  const onLeaveThread = useCallback((threadId: string) => {
    if (!editor) return

    editor.commands.hoverOffThread(threadId)
  }, [editor])

  const onResolveThread = useCallback((threadId: string) => {
    if (!editor) return

    editor.commands.resolveThread(threadId)
  }, [editor])

  const onUnresolveThread = useCallback((threadId: string) => {
    if (!editor) return

    editor.commands.unresolveThread(threadId)
  }, [editor])

  useEffect(() => {
    if (!editor) return

    const update = () => {
      const state = getCommentThreadState(editor)
      if (!state) return

      setThreads(state.threads)
      setSelectedThreads(state.selectedThreads)
      setSelectedThread(state.selectedThread)
    }

    editor.on('transaction', update)

    return () => {
      editor.off('transaction', update)
    }
  }, [editor])


  return (
    <ThreadsProvider
      threads={threads}
      selectedThreads={selectedThreads}
      selectedThread={selectedThread}
      onDeleteThread={deleteTread}
      onClickThread={onClickThread}
      onHoverThread={onHoverThread}
      onLeaveThread={onLeaveThread}
      onResolveThread={onResolveThread}
      onUnresolveThread={onUnresolveThread}
    >
      {children}

    </ThreadsProvider>
  )
}