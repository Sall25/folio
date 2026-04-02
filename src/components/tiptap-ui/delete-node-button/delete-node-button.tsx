// components/DeleteNodeButton.tsx
import { DeleteNodeIcon } from "src/components/tiptap-icons";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import {
  Button,
  type ButtonProps,
} from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
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

  // Case 1: NodeSelection — delete the selected node directly
  // This is the most reliable path after a drag since ProseMirror
  // updates the NodeSelection's from/to correctly post-drop
  if (selection instanceof NodeSelection) {
    const { from, node } = selection;

    // Verify the position is still valid in the current doc
    if (from + node.nodeSize > state.doc.nodeSize) return false;

    console.log("case 1");

    dispatch(state.tr.delete(from, from + node.nodeSize));
    editor.view.focus();
    return true;
  }

  // Case 2: TextSelection — walk up from anchor looking for tableWrapper
  const { $anchor } = selection;
  for (let depth = $anchor.depth; depth >= 0; depth--) {
    const node = $anchor.node(depth);
    if (node.type.name === "tableWrapper") {
      const pos = $anchor.before(depth);

      // Validate before deleting
      if (pos < 0 || pos + node.nodeSize > state.doc.nodeSize) return false;

      console.log(
        "case 2, pos",
        pos,
        " pos + node.nodeSize",
        pos + node.nodeSize,
      );

      dispatch(state.tr.delete(pos, pos + node.nodeSize));
      editor.view.focus();
      return true;
    }
  }

  // Case 3: Delete the block the cursor is inside
  const pos = $anchor.before($anchor.depth);
  const node = $anchor.node($anchor.depth);

  if (!node || pos < 0 || pos + node.nodeSize > state.doc.nodeSize)
    return false;

  dispatch(state.tr.delete(pos, pos + node.nodeSize));
  editor.view.focus();
  return true;
}

// function deleteNode(editor: Editor | null): boolean {
//   if (!editor) return false;

//   const { state, dispatch } = editor.view;
//   const { selection } = state;

//   // Walk up from anchor to find tableWrapper at any depth
//   const { $anchor } = selection;
//   for (let depth = $anchor.depth; depth >= 0; depth--) {
//     const node = $anchor.node(depth);
//     if (node.type.name === "tableWrapper") {
//       const pos = $anchor.before(depth);
//       dispatch(state.tr.delete(pos, pos + node.nodeSize));
//       editor.view.focus();
//       return true;
//     }
//   }

//   // Case 2: any other NodeSelection
//   if (selection instanceof NodeSelection) {
//     console.log("case 2");
//     const tr = state.tr.deleteSelection();
//     dispatch(tr);
//     editor.view.focus();
//     return true;
//   }

//   // Case 3: Otherwise, delete the block/node the cursor is inside
//   //const { $anchor } = selection;
//   const pos = $anchor.before($anchor.depth); // start of parent block
//   const node = $anchor.node($anchor.depth); // the parent node itself

//   if (!node) return false;

//   const tr = state.tr.delete(pos, pos + node.nodeSize);
//   dispatch(tr);
//   editor.view.focus();
//   return true;
// }

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
