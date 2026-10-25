import { Editor } from "@tiptap/core";

import { forwardRef } from "react";

// --- Hooks ---
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";

// --- Icons ---
import { PencilLine } from "src/components/icons";

// --- UI Primitives ---
import type { ButtonProps } from "src/components/tiptap-ui-primitive/button";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { draftThread } from "../extensions/utils/draftThread";

export interface SuggestButtonProps extends Omit<ButtonProps, "type"> {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string;

  editor?: Editor;
}

/**
 * Suggest an edit for the selected text: opens the comment popover in
 * suggestion mode (old text struck through, new text, optional note).
 * Same flow as CommentButton — a local draft until it's posted.
 */
export const SuggestButton = forwardRef<HTMLButtonElement, SuggestButtonProps>(
  (
    { editor: providedEditor, text, children, onClick, ...buttonProps },
    ref,
  ) => {
    const { editor } = useTiptapEditor(providedEditor);
    // Optional: also rendered on the landing, outside the app's providers.
    const { activePageId } = useOptionalActivePage();

    return (
      <Button
        type="button"
        variant="ghost"
        role="button"
        tabIndex={-1}
        tooltip="suggest edit"
        onClick={(e) => {
          if (!activePageId || !editor) return;
          draftThread(editor, activePageId, "suggestion");
          onClick?.(e);
        }}
        {...buttonProps}
        ref={ref}
      >
        {children ?? (
          <>
            <PencilLine className="tiptap-button-icon" />
            {text && <span>{text}</span>}
          </>
        )}
      </Button>
    );
  },
);

SuggestButton.displayName = "SuggestButton";
