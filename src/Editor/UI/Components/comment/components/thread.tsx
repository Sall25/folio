import { Editor } from "@tiptap/core"
import type { PositionedComment, Comment } from "../types"

import { Messages } from './messages'

export function Thread({
  comment,
  layout,
  active,
  editor,
}: {
  comment: Comment
  layout: PositionedComment
  active: boolean
  editor: Editor
}) {

  return (
    <div
      className="thread"
      data-active={active}
      style={{
        position: "absolute",
        top: layout.resolvedTop,
        height: layout.height,
        width: 280,
      }}
    >
      <Messages
        editor={editor}
        comment={comment}
      />
    </div>
  )
}