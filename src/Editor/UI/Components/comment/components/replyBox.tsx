import { useState } from "react"

import './replyBox.scss'

export function ReplyBox({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("")

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        onSubmit(text)
        setText("")
      }}
      className="reply-box"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Reply..."
      />
    </form>
  )
}