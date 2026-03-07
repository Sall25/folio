import { Editor } from "@tiptap/core"

import { forwardRef } from "react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { MessageCircle, MessageSquareMore } from "lucide-react"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"



export interface CommentButtonProps
  extends Omit<ButtonProps, "type"> {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string

  editor?: Editor
}

/**
 * Button component for uploading/inserting images in a Tiptap editor.
 *
 * For custom button implementations, use the `useImage` hook instead.
 */
export const CommentButton = forwardRef<
  HTMLButtonElement,
  CommentButtonProps
>(
  (
    {
      editor: providedEditor,
      text,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)

    return (
      <Button
        type="button"
        variant="ghost"
        role="button"
        tabIndex={-1}
        tooltip="comment"
        onClick={() => {
          editor?.commands.addComment('You')
        }}
        {...buttonProps}
        ref={ref}
      >
        {children ?? (
          <>
            <MessageSquareMore className="tiptap-button-icon" />
          </>
        )}
      </Button>
    )
  }
)

CommentButton.displayName = "CommentButton"
