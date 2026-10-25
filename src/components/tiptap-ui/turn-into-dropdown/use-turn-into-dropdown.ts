import { useState, useMemo, useCallback } from "react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import type { BlockTypeOption } from "./types";
import { Repeat2, type LucideIcon } from "src/components/icons";
import { getFilteredBlockTypeOptions, canTurnInto } from "./utils";

// Both read the editor through useEditorState: the selector runs on editor
// updates and the component re-renders only when the returned value changes.
// (A transaction listener that calls setState, with an options array that is
// new every render in its deps, re-ran itself on every render.)

export function useVisible(
  editor: Editor | null,
  filteredOptions: BlockTypeOption[],
  hideWhenUnavailable: boolean,
) {
  const types = filteredOptions.map((o) => o.type).join(",");
  return (
    useEditorState({
      editor,
      selector: ({ editor }) => {
        if (!editor || !types) return false;
        if (!hideWhenUnavailable) return true;
        return canTurnInto(editor, types.split(","));
      },
    }) ?? false
  );
}

export function useActiveBlockType(
  editor: Editor | null,
  filteredOptions: BlockTypeOption[],
) {
  // The index of the active option: a number, so equal results don't
  // re-render.
  const index =
    useEditorState({
      editor,
      selector: ({ editor }) =>
        editor ? filteredOptions.findIndex((o) => o.isActive(editor)) : -1,
    }) ?? -1;
  return index >= 0 ? filteredOptions[index] : undefined;
}

interface UseTurnIntoDropdownProps {
  editor: Editor | null;
  hideWhenUnavailable?: boolean;
  blockTypes?: string[];
  onOpenChange?: (isOpen: boolean) => void;
}

interface UseTurnIntoDropdownReturn {
  isVisible: boolean;
  canToggle: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeBlockType?: BlockTypeOption;
  handleOpenChange: (open: boolean) => void;
  filteredOptions: BlockTypeOption[];
  label: string;
  Icon: LucideIcon;
}

export function useTurnIntoDropdown({
  editor,
  hideWhenUnavailable = false,
  blockTypes,
  onOpenChange,
}: UseTurnIntoDropdownProps): UseTurnIntoDropdownReturn {
  const [isOpen, setIsOpen] = useState(false);

  // Keyed on the types' contents, not the array: callers pass a new array
  // literal on every render.
  const typesKey = blockTypes?.join(",") ?? "";
  const filteredOptions = useMemo(
    () =>
      getFilteredBlockTypeOptions(typesKey ? typesKey.split(",") : undefined),
    [typesKey],
  );

  const canToggle = useMemo(
    () => canTurnInto(editor, typesKey ? typesKey.split(",") : undefined),
    [editor, typesKey],
  );

  const isVisible = useVisible(editor, filteredOptions, hideWhenUnavailable);

  const activeBlockType = useActiveBlockType(editor, filteredOptions);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      onOpenChange?.(open);
    },
    [onOpenChange],
  );

  const label = activeBlockType
    ? `Turn into ${activeBlockType.label}`
    : "Turn into";

  return {
    isVisible,
    canToggle,
    isOpen,
    setIsOpen,
    activeBlockType,
    handleOpenChange,
    filteredOptions,
    label,
    Icon: Repeat2,
  };
}
