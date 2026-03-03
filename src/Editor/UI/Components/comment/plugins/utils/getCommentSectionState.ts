import type { Editor } from "@tiptap/core"
import { commentSectionPluginKey } from "../CommentSection"
import { commentSidebarPluginKey } from "../CommentSidebar"
import type { CommentState } from "../CommentSection"
import type { CommentSidebarState } from "../CommentSidebar"

export function getCommentSectionState(editor: Editor) {
  const state = editor.state

  const commentData = commentSectionPluginKey.getState(state) as (CommentState | null)
  const sidebarData = commentSidebarPluginKey.getState(state) as (CommentSidebarState | null)

  if (!commentData || !sidebarData) {
    return { comments: [], positioned: [] }
  }

  return {
    comments: commentData.comments,
    positioned: sidebarData.positionedComments,
    activeId: sidebarData.activeCommentId,
  }
}