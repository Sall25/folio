import type { RawCommands } from "@tiptap/core"
import { commentSectionPluginKey } from "../plugins/CommentSection"

export const removeComment: RawCommands['removeComment'] =
  (id: string) =>
    ({ state, dispatch }) => {

      if (dispatch) {
        dispatch(
          state.tr.setMeta(commentSectionPluginKey, {
            type: 'remove',
            id,
          }).setMeta('forceMeasure', true)
        )
      }

      return true
    }