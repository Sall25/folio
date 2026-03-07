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

  //const messagesRef = useRef<HTMLDivElement | null>(null)

  return (
    <div
      className="comment-thread"
      data-active={active}
      style={{
        position: "absolute",
        top: layout.resolvedTop,
        //height: messagesRef?.current?.style.height, //?? layout.height,
        height: 'fit-content',
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