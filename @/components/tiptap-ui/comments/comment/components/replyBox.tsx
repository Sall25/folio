import { forwardRef, useState } from "react"

import './replyBox.scss'

interface ReplyBoxProps {
  onSubmit: (text: string) => void
  setOpen: (open: boolean) => void
  className?: string
}

export const ReplyBox = forwardRef<HTMLFormElement, ReplyBoxProps>((
  { onSubmit, setOpen, className }, ref
) => {
  const [text, setText] = useState("")

  return (
    <form
      ref={ref}
      className={`reply-box ${className}`}
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        onSubmit(text)
        setText("")
        setOpen(false)
      }}
    >
      <input
        className="reply-box-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Reply..."
      />
    </form>
  )
})
