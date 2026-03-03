import { Decoration, DecorationSet } from "@tiptap/pm/view"
import type { Comment } from "../../types"
import type { Node } from "@tiptap/pm/model"


export function buildDecorations(doc: Node, comments: Comment[]) {
  const decos: Decoration[] = []

  for (const c of comments) {
    decos.push(
      Decoration.inline(c.anchor.from, c.anchor.to, {
        class: 'comment-anchor',
        "data-comment-id": c.id,
      })
    )
  }

  return DecorationSet.create(doc, decos)
}