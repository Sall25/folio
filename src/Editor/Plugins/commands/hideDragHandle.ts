import type { RawCommands } from "@tiptap/core"
import { dragHandlePluginDefaultKey } from "@tiptap/extension-drag-handle"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    hideDragHandle: {
      hideDragHandle: () => ReturnType
    }
  }
}

export const hideDragHandle: RawCommands['hideDragHandle'] =
  () =>
    ({ tr, dispatch }) => {
      if (dispatch) {
        dispatch(
          tr.setMeta(dragHandlePluginDefaultKey, 'hideDragHandle')
        )
      }
      return true
    }