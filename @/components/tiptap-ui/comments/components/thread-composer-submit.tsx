import { Button } from "@/components/tiptap-ui-primitive/button"
import type { Editor } from "@tiptap/core"
import { useCallback, useState, type FormEvent } from "react"

import './thread-composer-submit.scss'

export function ThreadComposerSubmit({ editor, threadId }: { editor: Editor | null, threadId: string }) {
  const [comment, setComment] = useState('')

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()

    if (!comment) {
      return
    }

    if (editor) {
      editor.commands.submitThread(comment)
    }

    setComment('')
  }, [editor, comment])

  const handleCancel = useCallback(() => {

    if (editor) {
      editor.commands.removeThread(threadId)
    }
  }, [editor, threadId])


  // if (!editor) return null

  return (
    <form
      onSubmit={handleSubmit}
      className='thread-submit-form'
    >
      <textarea
        placeholder="Submit your thread..."
        onChange={e => setComment(e.currentTarget.value)} value={comment}
      />

      <div
        className="actions"
      >
        <Button
          variant="ghost"
          type="button"
          onClick={handleCancel}
          className="cancel-btn"
        >
          Cancel
        </Button>
        <Button
          className="submit-btn"
          variant="ghost"
          type="submit"
          disabled={!comment.length}
        >
          Submit
        </Button>

      </div>
    </form>
  )
}