import type { RawCommands } from "@tiptap/core"
import type { CommentMessage } from "../types"
import { commentSectionPluginKey } from "../../plugins/CommentSection"

export const replyComment: RawCommands['replyComment'] =
  (id: string, text: string, authorId: string) =>
    ({ state, dispatch }) => {
      const message: CommentMessage = {
        id: crypto.randomUUID(),
        authorId,
        text,
        createdAt: Date.now(),
      }


      if (dispatch) {
        dispatch(
          state.tr.setMeta(commentSectionPluginKey, {
            type: 'reply',
            id,
            message,
          })
        )
      }

      return true
    }