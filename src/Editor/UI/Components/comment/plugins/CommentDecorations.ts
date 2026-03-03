import { Plugin, PluginKey } from "@tiptap/pm/state"
import { DecorationSet } from "@tiptap/pm/view"
import { buildDecorations } from "./utils/buildDecorations"
import type { Editor } from "@tiptap/core"
import { getCommentSectionState } from "./utils"

export const commentDecorationsKey = new PluginKey("commentDecorations")

export const CommentDecorations = (editor: Editor) =>
  new Plugin({
    key: commentDecorationsKey,

    state: {
      init(_, { doc }) {
        return DecorationSet.create(doc, [])
      },

      apply(tr, old, _, newState) {
        const viewState = getCommentSectionState(editor)

        return buildDecorations(newState.doc, viewState.comments)
      },
    },

    props: {
      decorations(state) {
        return this.getState(state)
      },
    },
  })