import type { Editor } from "@tiptap/core"
import { type Comment } from "../types"

import './messages.scss'
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { Card, CardItemGroup } from "@/components/tiptap-ui-primitive/card"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { ReplyBox } from "./replyBox"
//import { scrollToComment } from "../../plugins/utils"
import { Message } from "./message"
import { Separator } from "@/components/tiptap-ui-primitive/separator"
import { scrollToComment } from "../../plugins/utils"

function forceMeasure(editor: Editor) {
  editor.view.dispatch(
    editor.state.tr.setMeta('forceMeasure', true)
  )
}


interface MessagesProps {
  comment: Comment
  editor: Editor
}

function decorateHoveredComment(editor: Editor, commentId: string, open = true) {
  editor.view.dispatch(
    open ? editor.state.tr.setMeta('comment-hover', { commentId })
      : editor.state.tr.setMeta('comment-hover', null)
  )
}

export const Messages = forwardRef<HTMLDivElement | null, MessagesProps>((
  { comment, editor }, ref
) => {

  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)

  const handleClickInside = () => {

    scrollToComment(comment.id)

    // if (containerRef.current) {
    //   containerRef.current.scrollIntoView({
    //     behavior: 'smooth',
    //     block: 'start',
    //     inline: 'nearest'
    //   })
    // }

    setOpen(true)
  }

  useEffect(() => {
    forceMeasure(editor)
    if (open) {
      editor.view.dispatch(
        editor.state.tr.setMeta('active-comment', { activeId: comment.id })
      )
      decorateHoveredComment(editor, comment.id)
    }
  }, [open, editor, comment])


  useImperativeHandle(ref, () => containerRef.current!)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }

  }, [editor])

  return (
    <Card
      ref={(el) => {
        containerRef.current = el
      }}
      className="messages"
      data-comment-id={comment.id}
      data-comment-thread-id={comment.id}
      data-messages-open={open}
      onMouseDown={handleClickInside}
      onMouseOver={() => {
        decorateHoveredComment(editor, comment.id)
      }}
      onMouseLeave={() => {
        decorateHoveredComment(editor, comment.id, false)
      }}
    >
      {/* First messgae */}
      {comment.messages.slice(0, 1).map(m => (
        <CardItemGroup key={m.id}>
          <Message
            open={open}
            firstMessage={true}
            message={m}
            editor={editor}
          />
        </CardItemGroup>
      ))}
      {/* More messages */}
      {
        open && !comment.draft && (
          <CardItemGroup
          >
            {comment.messages.slice(1, comment.messages.length).map(m => (
              <CardItemGroup
                key={m.id}
              >
                <Separator
                  orientation="horizontal"
                />

                <Message
                  open={open}
                  firstMessage={false}
                  message={m}
                  editor={editor}
                />
              </CardItemGroup>
            ))}
            <ReplyBox
              onSubmit={(text) =>
                editor.commands.replyComment(comment.id, text, "You")
              }
              setOpen={setOpen}
            />
          </CardItemGroup>
        )
      }

      {comment.draft && (
        <CardItemGroup
          orientation="vertical"
          className="message-draft"
        >
          <input
            className='message-input'
            style={{
              maxWidth: '240px',
            }}
            autoFocus
            value={text}
            placeholder="Write a comment…"
            onChange={e => {
              setText(e.target.value)
              editor.commands.updateDraft(e.target.value)
            }}
          />

          <CardItemGroup
            orientation="horizontal"
          >
            <Button
              className="cancel-button"
              onClick={() => {
                const currentCommentId = editor.storage.commentExtension.currentCommentId
                if (!currentCommentId) return
                editor.commands.removeComment(currentCommentId)
              }}
            >
              Cancel
            </Button>
            <Button
              className="submit-button"
              onClick={() => {
                editor.commands.submitDraft()
              }}
            >
              Submit
            </Button>
          </CardItemGroup>
        </CardItemGroup>
      )}
    </Card>
  )
})
