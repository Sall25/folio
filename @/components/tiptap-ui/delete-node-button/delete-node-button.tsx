// components/DeleteNodeButton.tsx
import { DeleteNodeIcon } from "@/components/tiptap-icons";
import { Badge } from "@/components/tiptap-ui-primitive/badge";
import {
  Button,
  type ButtonProps,
} from "@/components/tiptap-ui-primitive/button";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { NodeSelection } from "@tiptap/pm/state";
import { Editor } from "@tiptap/react";
import { useHotkeys } from "react-hotkeys-hook";

function ShortcutBadge({ shortcutKeys }: { shortcutKeys: string }) {
  return <Badge>{shortcutKeys}</Badge>;
}

function canDeleteNode(editor: Editor | null): boolean {
  if (!editor) return false;
  const { selection } = editor.state;
  // NodeSelection means a whole node is selected (e.g. image, code block)
  // We can also handle TextSelection where the whole block is selected
  return (
    (editor.isEditable && !selection.empty) ||
    selection.$anchor.node() !== selection.$head.node()
  );
}

function deleteNode(editor: Editor | null): boolean {
  if (!editor) return false;

  const { state, dispatch } = editor.view;
  const { selection } = state;

  if (selection instanceof NodeSelection) {
    const tr = state.tr.deleteSelection();
    dispatch(tr);
    editor.view.focus();
    return true;
  }

  // Otherwise, delete the block/node the cursor is inside
  const { $anchor } = selection;
  const pos = $anchor.before($anchor.depth); // start of parent block
  const node = $anchor.node($anchor.depth); // the parent node itself

  if (!node) return false;

  const tr = state.tr.delete(pos, pos + node.nodeSize);
  dispatch(tr);
  editor.view.focus();
  return true;
}

interface DeleteNodeButtonProps extends Pick<
  ButtonProps,
  "tooltip" | "showTooltip"
> {
  editor?: Editor | null;
  onDeleted?: () => void;
  text?: string;
  className?: string;
  showShortcut?: boolean;
}

export function DeleteNodeButton({
  editor: providedEditor,
  onDeleted,
  text,
  className,
  showShortcut = false,
  tooltip = "Delete",
  showTooltip,
}: DeleteNodeButtonProps) {
  const { editor } = useTiptapEditor(providedEditor);
  const canDelete = canDeleteNode(editor);

  // Register Backspace shortcut (only when a whole node is selected)
  useHotkeys(
    "backspace",
    () => {
      const success = deleteNode(editor);
      if (success) onDeleted?.();
    },
    { enabled: !!editor?.isEditable, preventDefault: false },
  );

  const handleClick = () => {
    const success = deleteNode(editor);
    if (success) onDeleted?.();
  };

  if (!canDelete) return null;

  return (
    <Button
      type="button"
      role="menuitem"
      variant="ghost"
      onClick={handleClick}
      disabled={!canDelete}
      aria-label="Delete node"
      title="Delete block (Backspace)"
      tooltip={tooltip}
      showTooltip={showTooltip}
      className={className}
      style={{
        justifyContent: "left",
        width: "100%",
      }}
    >
      <DeleteNodeIcon className="tiptap-button-icon" />
      {text && <span>{text}</span>}
      {showShortcut && (
        <>
          <Spacer orientation="horizontal" />
          <ShortcutBadge shortcutKeys="Backspace" />
        </>
      )}
    </Button>
  );
}
