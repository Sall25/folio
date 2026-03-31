import type { Editor } from "@tiptap/core"
import { useCallback, useState, type FormEvent } from "react"
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button"

interface ThreadComposerProps {
  editor: Editor
  threadId: string
}

export const ThreadComposer = ({ editor, threadId }: ThreadComposerProps) => {
  const [comment, setComment] = useState('')

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()

    if (!comment) {
      return
    }

    if (editor) {
      editor.commands.addComment(threadId, 'You', comment)
    }

    setComment('')
  }, [editor, comment, threadId])

  const handleFocus = useCallback(() => {
    if (editor) {
      editor.commands.forceMeasure(threadId)
    }
  }, [editor, threadId])

  return (
    <form
      onSubmit={handleSubmit}
    >
      <textarea
        placeholder="Reply to thread..."
        onChange={e => setComment(e.currentTarget.value)}
        value={comment}
        onFocus={handleFocus}
      />
      <div className="flex-row">
        <ButtonGroup>
          <Button
            type="submit"
            className="primary"
            disabled={!comment.length}
            style={{
              color: 'var(--tt-brand-color-500)'
            }}
          >
            Send
          </Button>
        </ButtonGroup>
      </div>
    </form>
  )
}