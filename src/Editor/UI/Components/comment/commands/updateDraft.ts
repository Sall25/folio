import type { RawCommands } from "@tiptap/core"
import { getCommentSectionState } from "../plugins/utils"

export const updateDraft: RawCommands['updateDraft'] =
  (text) =>
    ({ editor, tr, dispatch }) => {
      const currentCommentId = editor.storage.commentExtension.currentCommentId
      if (!currentCommentId) return false

      const viewState = getCommentSectionState(editor)
      viewState.comments.forEach(c => {
        if (c.id === currentCommentId) {
          c.draft = { text }
        }
      })

      // if (dispatch) {
      //   dispatch(
      //     tr.setMeta('updateDraft', { id: currentCommentId, text })
      //   )
      // }
      return true
    }