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

function forceMeasure(editor: Editor) {
  editor.view.dispatch(
    editor.state.tr.setMeta('forceMeasure', true)
  )
}

interface MessagesProps {
  comment: Comment
  editor: Editor
}

function expand(el: HTMLElement | null) {
  if (el) {
    el.style.maxHeight = `${el.scrollHeight + 160}px`
  }
  console.log('expanded')
}

function shrink(el: HTMLElement | null) {
  if (el) {
    el.style.maxHeight = '0px'
  }
}

export const Messages = forwardRef<HTMLDivElement | null, MessagesProps>((
  { comment, editor }, ref
) => {

  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const remainingMessagesRef = useRef<HTMLDivElement | null>(null)
  const replyRef = useRef<HTMLFormElement | null>(null)

  const handleClickInside = () => {

    requestAnimationFrame(() => {


      if (!remainingMessagesRef.current || !replyRef.current) return

      expand(remainingMessagesRef.current)
      expand(replyRef.current)

      setOpen(true)
      forceMeasure(editor)
    })
  }

  // useEffect(() => {
  //   const editorDom = editor.view.dom as HTMLElement | null
  //   if (!editorDom) return

  //   function handleClickOutside(e: MouseEvent) {

  //     if (!containerRef.current) return

  //     if (!containerRef.current.contains(e.target as Node)) {
  //       requestAnimationFrame(() => {
  //         if (!remainingMessagesRef.current || !replyRef.current) return

  //         shrink(remainingMessagesRef.current)
  //         shrink(replyRef.current)
  //         setOpen(false)
  //       })

  //     }
  //   }

  //   editorDom.addEventListener('mousedown', handleClickOutside)

  //   return () =>
  //     editorDom.removeEventListener('mousedown', handleClickOutside)
  // }, [editor, comment])


  useEffect(() => {
    forceMeasure(editor)
    console.log('force measure')
  }, [open, editor])


  useImperativeHandle(ref, () => containerRef.current!)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {

        requestAnimationFrame(() => {
          if (!remainingMessagesRef.current || !replyRef.current) return

          shrink(remainingMessagesRef.current)
          shrink(replyRef.current)
          setOpen(false)

          forceMeasure(editor)
        })

      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }

  }, [])

  return (
    <Card
      ref={(el) => {
        containerRef.current = el
      }}
      className="messages"
      data-comment-thread-id={comment.id}
      data-messages-open={open}
      // onMouseDown={() => {
      //   setActive(true)
      // }}
      onMouseDown={handleClickInside}
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
      <CardItemGroup
        ref={(el) => {
          remainingMessagesRef.current = el
        }}
        className="collapsible"
        data-collapsible-open={!comment.draft && open}
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
      </CardItemGroup>

      <ReplyBox
        ref={(el) => {
          replyRef.current = el
        }}
        className="collapsible"
        data-collapsible-open={!comment.draft && open}
        onSubmit={(text) =>
          editor.commands.replyComment(comment.id, text, "You")
        }
        setOpen={setOpen}
      />

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
