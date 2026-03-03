import { type RawCommands } from "@tiptap/core";
import { getCommentSectionState } from "../plugins/utils";

export const submitDraft: RawCommands['submitDraft'] =
  () =>
    ({ editor }) => {
      console.log('submit draft')
      const currentCommentId = editor.storage.commentExtension.currentCommentId
      const currentUserId = editor.storage.commentExtension.currentUserId
      if (!currentCommentId || !currentUserId) return false

      console.log('submit draft comment user id', currentUserId)

      const viewState = getCommentSectionState(editor)

      const c = viewState.comments.find(c => c.id === currentCommentId)
      if (!c?.draft) return false

      c.messages.push({
        id: crypto.randomUUID(),
        text: c.draft.text,
        authorId: currentUserId,
        createdAt: Date.now(),
      })

      c.draft = null


      // if (dispatch) {
      //   dispatch(
      //     tr.setMeta('submitDraft', { id: currentCommentId, authorId: currentUserId })
      //   )
      //   // editor.storage.commentExtension.currentCommentId = null
      //   // editor.storage.commentExtension.currentUserId = null
      // }
      return true
    }