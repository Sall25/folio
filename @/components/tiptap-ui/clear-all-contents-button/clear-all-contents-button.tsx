import { ClearIcon } from "@/components/tiptap-icons";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import type { Editor } from "@tiptap/core";
import { UseClearAllContents } from "./use-clear-all-contents";

interface ClearAllContentsButtonProps {
  editor?: Editor | null;
  allowedBlockTypes?: string[];
  hideWhenUnavailable?: boolean;
  onAction?: () => void;
}

export function ClearAllContentsButton({
  editor: providedEditor,
  allowedBlockTypes = ["tableCell", "tableHeader", "table"],
  hideWhenUnavailable = false,
  onAction,
}: ClearAllContentsButtonProps) {
  const { editor } = useTiptapEditor(providedEditor);

  const { visible } = UseClearAllContents({
    editor,
    allowedBlockTypes,
  });

  if (hideWhenUnavailable && !visible) return null;

  return (
    <Button
      type="button"
      role="menuitem"
      variant="ghost"
      onClick={() => {
        editor?.commands.clearAllContents();
        onAction?.();
      }}
      style={{
        justifyContent: "flex-start",
      }}
    >
      <ClearIcon className="tiptap-button-icon" />
      Clear all contents
    </Button>
  );
}
