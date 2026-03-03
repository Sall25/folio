import type { RawCommands } from "@tiptap/core"
import type { Comment } from "../types"
import { commentSectionPluginKey } from "../plugins/CommentSection"

export const addComment: RawCommands['addComment'] =
  (authorId: string) =>
    ({ editor, state, dispatch }) => {
      const { from, to } = state.selection
      if (from === to) return false

      const comment: Comment = {
        id: crypto.randomUUID(),
        anchor: { from, to },
        status: 'active',
        createdAt: Date.now(),
        authorId,
        messages: [],
        draft: { text: '' }
      }

      editor.storage.commentExtension.currentCommentId = comment.id
      editor.storage.commentExtension.currentUserId = comment.authorId

      console.log('currentCommentId', editor.storage.commentExtension.currentCommentId)

      
      if (dispatch) {
        dispatch(
          state.tr.setMeta(commentSectionPluginKey, {
            type: 'add',
            comment,
          }).setMeta('commentUpdated', { id: comment.id })
        )
      }

      return true
    }