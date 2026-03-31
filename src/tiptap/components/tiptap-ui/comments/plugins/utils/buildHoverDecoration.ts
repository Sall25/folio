import { Decoration, DecorationSet } from "@tiptap/pm/view"
import type { Comment } from "../../comment/types"
import type { Node } from "@tiptap/pm/model"


export function buildHoverDecoration(doc: Node, comment: Comment) {

  return DecorationSet.create(doc, [
    Decoration.inline(comment.anchor.from, comment.anchor.to, {
      class: 'comment-anchor-hover',
      'data-comment-id': comment.id
    })
  ])
}