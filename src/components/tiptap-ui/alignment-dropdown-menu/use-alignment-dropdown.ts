import { useState, useMemo, useEffect } from "react";
import type { Editor } from "@tiptap/core";
import { getSelectedBlocks } from "src/lib/block-selection";
import type { BlockTypeOption } from "src/components/tiptap-ui/turn-into-dropdown/types";
import { getFilteredBlockTypeOptions } from "src/components/tiptap-ui/turn-into-dropdown/utils";

export function useVisible(
  editor: Editor | null,
  filteredOptions: BlockTypeOption[],
  hideWhenUnavailable: boolean,
) {
  const [isVisible, setIsVisible] = useState(() => {
    if (!editor) return false;
    if (!filteredOptions.length) return false;
    return !hideWhenUnavailable;
  });

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      if (!editor) {
        setIsVisible(false);
        return;
      }

      if (!filteredOptions.length) {
        setIsVisible(false);
        return;
      }

      // Several whole blocks: shown when one of them is of a type this
      // menu is for (they may be of different types, so no single type is
      // "active").
      const blocks = getSelectedBlocks(editor.state.selection);
      if (blocks) {
        const types = new Set(filteredOptions.map((o) => o.type));
        setIsVisible(blocks.some(({ node }) => types.has(node.type.name)));
        return;
      }

      const visible = filteredOptions.some((o) => o.isActive(editor));
      setIsVisible(visible);
    };

    // Initial check
    update();

    // Subscribe to transactions
    editor.on("transaction", update);

    return () => {
      editor.off("transaction", update);
    };
  }, [editor, filteredOptions, hideWhenUnavailable]);

  return isVisible;
}

interface UseAlignmentDropdownProps {
  editor: Editor | null;
  hideWhenUnavailable?: boolean;
  blockTypes?: string[];
}

interface UseAlignmentDropdownReturn {
  isVisible: boolean;
}

export function useAlignmentDropdown({
  editor,
  hideWhenUnavailable = false,
  blockTypes,
}: UseAlignmentDropdownProps): UseAlignmentDropdownReturn {
  const filteredOptions = useMemo(
    () => getFilteredBlockTypeOptions(blockTypes),
    [blockTypes],
  );

  const isVisible = useVisible(editor, filteredOptions, hideWhenUnavailable);

  return {
    isVisible,
  };
}
