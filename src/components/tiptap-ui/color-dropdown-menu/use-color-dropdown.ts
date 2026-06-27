import { useState, useMemo, useEffect } from "react";
import type { Editor } from "@tiptap/core";
import type { BlockTypeOption } from "../turn-into-dropdown/types";
import { getFilteredBlockTypeOptions } from "./utils";

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

interface UseColorDropdownProps {
  editor: Editor | null;
  hideWhenUnavailable?: boolean;
  blockTypes?: string[];
}

interface UseColorDropdownReturn {
  isVisible: boolean;
}

export function useColorDropdown({
  editor,
  hideWhenUnavailable = false,
  blockTypes,
}: UseColorDropdownProps): UseColorDropdownReturn {
  const filteredOptions = useMemo(
    () => getFilteredBlockTypeOptions(blockTypes),
    [blockTypes],
  );

  const isVisible = useVisible(editor, filteredOptions, hideWhenUnavailable);

  return {
    isVisible,
  };
}
