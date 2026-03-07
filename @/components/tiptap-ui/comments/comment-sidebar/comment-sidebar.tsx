import { Editor } from "@tiptap/core"
import { Plugin } from "@tiptap/pm/state"
import { useEffect, useRef, useState } from "react"
import { CommentSectionPlugin, commentSectionPluginKey } from "../plugins/CommentSection"
import { getCommentSectionState } from "../plugins/utils"
import { Thread } from "../comment/components/thread"
import { CommentSidebarPlugin, commentSidebarPluginKey } from "../plugins/CommentSidebar"

import './comment-sidebar.scss'

export const CommentSidebar = ({ editor }: { editor: Editor | null }) => {
  const [viewState, setViewState] = useState(() => {
    if (!editor) return null
    return getCommentSectionState(editor)
  })
  const commentSectionPlugin = useRef<Plugin | null>(null)
  const commentSidebarPlugin = useRef<Plugin | null>(null)

  useEffect(() => {
    if (!editor) return

    const update = () => {
      console.log('comment thread update')
      setViewState(getCommentSectionState(editor))
    }

    if (!commentSectionPlugin.current) {
      commentSectionPlugin.current = CommentSectionPlugin().plugin
      editor.registerPlugin(commentSectionPlugin.current)
    }

    if (!commentSidebarPlugin.current) {
      commentSidebarPlugin.current = CommentSidebarPlugin({ editor }).plugin
      editor.registerPlugin(commentSidebarPlugin.current)
    }

    editor.on('transaction', update)

    return () => {
      editor.off('transaction', update)
      editor.unregisterPlugin(commentSectionPluginKey)
      editor.unregisterPlugin(commentSidebarPluginKey)
      commentSectionPlugin.current = null
      commentSidebarPlugin.current = null
    }
  }, [editor])



  if (!editor) return null

  return (
    <div className="comment-sidebar">
      {viewState && viewState.positioned.map(pos => {
        const comment = viewState.comments.find(c => c.id === pos.id)
        if (!comment) return null

        return (
          <Thread
            key={comment.id}
            comment={comment}
            layout={pos}
            active={comment.id === viewState.activeId}
            editor={editor}
          />
        )
      })}
    </div>
  )
}