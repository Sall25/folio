import type { Editor } from '@tiptap/core'
import { ThreadsListItem } from './thread-list-item.js'
import type { PositionedThread } from '../types/index.js'
import { useCommentThreadState } from '../hooks/useCommentThreadState.js'

interface ThreadsListProps {
  editor: Editor | null
  positionedThreads: PositionedThread[]
}

export const ThreadsList = ({ editor, positionedThreads }: ThreadsListProps) => {
  const state = useCommentThreadState(editor)


  if (positionedThreads.length === 0) {
    return <label className="label">No threads.</label>
  }

  if (!editor) return null

  if (!state) return null

  const { threads, selectedThreads, selectedThread } = state


  return (
    <div className="threads-group">
      {positionedThreads.map(t => (
        <ThreadsListItem
          key={t.id}
          thread={threads.find(thread => thread.id === t.id)!}
          active={selectedThreads.some(thread => thread.id === t.id) || selectedThread?.id === t.id}
          open={selectedThread?.id === t.id}
          editor={editor}
          layout={t}
        />
      ))}
    </div>
  )
}