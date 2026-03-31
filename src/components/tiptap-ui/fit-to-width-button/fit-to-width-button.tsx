import { FitToWidthIcon } from "src/components/tiptap-icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import type { Editor } from "@tiptap/core";

export function FitToWidthButton({
  editor: providedEditor,
}: {
  editor?: Editor | null;
}) {
  const { editor } = useTiptapEditor(providedEditor);

  return (
    <Button
      type="button"
      role="menuitem"
      variant="ghost"
      onClick={() => {
        editor?.commands.fitContent();
      }}
    >
      <FitToWidthIcon className="tiptap-button-icon" />
      Fit to width
    </Button>
  );
}
