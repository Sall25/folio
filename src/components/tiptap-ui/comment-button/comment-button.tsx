import { Editor } from "@tiptap/core";

import { forwardRef } from "react";

// --- Hooks ---
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";

// --- Icons ---
import { MessageSquareText } from "lucide-react";

// --- UI Primitives ---
import type { ButtonProps } from "src/components/tiptap-ui-primitive/button";
import { Button } from "src/components/tiptap-ui-primitive/button";

export interface CommentButtonProps extends Omit<ButtonProps, "type"> {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string;

  editor?: Editor;
}

/**
 * Button component for uploading/inserting images in a Tiptap editor.
 *
 * For custom button implementations, use the `useImage` hook instead.
 */
export const CommentButton = forwardRef<HTMLButtonElement, CommentButtonProps>(
  (
    { editor: providedEditor, text, children, onClick, ...buttonProps },
    ref,
  ) => {
    const { editor } = useTiptapEditor(providedEditor);

    return (
      <Button
        type="button"
        variant="ghost"
        role="button"
        tabIndex={-1}
        tooltip="comment"
        onClick={(e) => {
          editor?.commands.draftThread();
          onClick?.(e);
        }}
        {...buttonProps}
        ref={ref}
      >
        {children ?? (
          <>
            <MessageSquareText className="tiptap-button-icon" />
            {text && <span>{text}</span>}
          </>
        )}
      </Button>
    );
  },
);

CommentButton.displayName = "CommentButton";
