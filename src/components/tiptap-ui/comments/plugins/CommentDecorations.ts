import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import { buildDecorations } from "./utils/buildDecorations"
import type { Editor } from "@tiptap/core"
import { getCommentSectionState } from "./utils"
import { buildHoverDecoration } from "./utils/buildhoverDecoration"
import { buildActiveDecoration } from "./utils/buildActiveDecoration"

export const commentDecorationsKey = new PluginKey("commentDecorations")

export const CommentDecorations = (editor: Editor) =>
  new Plugin({
    key: commentDecorationsKey,

    state: {
      init(_, { doc }) {
        return DecorationSet.create(doc, [])
      },

      apply(tr) {
        const viewState = getCommentSectionState(editor)

        if (tr.getMeta('comment-hover')) {
          const { commentId } = tr.getMeta('comment-hover')
          const comment = viewState.comments.find(c => c.id === commentId)

          if (comment) {
            return buildHoverDecoration(tr.doc, comment)
          }
        }

        // cursor hover inside anchor
        const pos = tr.selection.from

        const hoveredComment  = viewState.comments.find(c =>
          pos >= c.anchor.from && pos <= c.anchor.to
        )

        if (hoveredComment) {
          return buildHoverDecoration(tr.doc, hoveredComment)
        }

        return buildDecorations(tr.doc, viewState.comments)
      }
    },


    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    view(editorView) {
      return {
        update(view, prevState) {
          const { state } = view

          if (state.selection.from === prevState.selection.from) return

          const viewState = getCommentSectionState(editor)
          const pos = state.selection.from

          const activeComment = viewState.comments.find(c =>
            pos >= c.anchor.from && pos <= c.anchor.to
          )

          if (activeComment) {
            view.dispatch(
              state.tr.setMeta('active-comment', {
                activeId: activeComment.id
              })
            )
          }
        }
      }
    },

    props: {
      decorations(state) {
        return this.getState(state)
      },
    },
  })