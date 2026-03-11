import { forwardRef, useState } from "react"

import './replyBox.scss'
import { Button } from "@/components/tiptap-ui-primitive/button"

interface ReplyBoxProps {
  onSubmit: (text: string) => void
  setOpen: (open: boolean) => void
  className?: string
}

export const ReplyBox = forwardRef<HTMLFormElement, ReplyBoxProps>((
  { onSubmit, className }, ref
) => {
  const [text, setText] = useState("")
  const [focused, setFocused] = useState(false)

  return (
    <form
      ref={ref}
      className={`reply-box ${className}`}
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        onSubmit(text)
        setText("")
        setFocused(false)
      }}
    >
      <textarea
        className="reply-box-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Reply..."
        onFocus={() => setFocused(true)}
      />
      {focused && (
        <Button
          className="submit-button"
          type="submit"
          disabled={!text.length}
        >
          Submit
        </Button>
      )}
    </form>
  )
})
