import { Decoration, DecorationSet } from "@tiptap/pm/view"
import type { Comment } from "../../comment/types"
import type { Node } from "@tiptap/pm/model"


export function buildActiveDecoration(doc: Node, comment: Comment) {

  return DecorationSet.create(doc, [
    Decoration.inline(comment.anchor.from, comment.anchor.to, {
      class: 'comment-anchor-active',
      'data-comment-id': comment.id
    })
  ])
}