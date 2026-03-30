import type { Editor } from "@tiptap/core";
import type { BlockTypeOption, ShouldShowTurnIntoParams } from "./types";
import { DEFAULT_BLOCK_TYPE_OPTIONS } from "./block-type-options";
import { NodeSelection } from "@tiptap/pm/state";

export function getActiveBlockType(
  editor: Editor,
  blockTypes?: BlockTypeOption[],
): BlockTypeOption {
  const paragraph = {
    type: "paragraph",
    label: "Text",
    isActive(editor: Editor) {
      return editor.isActive("paragraph");
    },
  };
  if (!blockTypes) return paragraph;

  for (const block of blockTypes) {
    if (block.level && editor.isActive(block.type, { level: block.level }))
      return block;
    else if (editor.isActive(block.type)) return block;
  }

  return paragraph;
}

/**
 * Returns true if at least one allowed block transformation
 * is available in the current editor state.
 */
export function canTurnInto(
  editor: Editor | null,
  allowedBlockTypes?: string[],
): boolean {
  if (!editor || !editor.isEditable) return false;

  const { selection } = editor.state;
  const node =
    selection instanceof NodeSelection
      ? selection.node
      : selection.$from.node();

  if (!node) return false;

  const options = getFilteredBlockTypeOptions(allowedBlockTypes);
  return options.some((o) => o.type === node.type.name);
}
/**
 * Returns true if the turn-into dropdown should be shown.
 */

export function shouldShowTurnInto({
  editor,
  hideWhenUnavailable = false,
  blockTypes,
}: ShouldShowTurnIntoParams): boolean {
  if (!editor || !editor.isEditable) return false;

  const options = getFilteredBlockTypeOptions(blockTypes);

  if (!options.length) return false;

  if (hideWhenUnavailable) {
    return canTurnInto(editor, blockTypes);
  }

  return true;
}

export function getFilteredBlockTypeOptions(
  blockTypes?: string[],
): BlockTypeOption[] {
  if (!blockTypes?.length) {
    return DEFAULT_BLOCK_TYPE_OPTIONS;
  }

  return blockTypes.flatMap((type) =>
    DEFAULT_BLOCK_TYPE_OPTIONS.filter((option) => option.type === type),
  );
}
