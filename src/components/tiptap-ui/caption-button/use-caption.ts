import { useState, useEffect } from "react";
import type { UseCaptionProps, UseCaptionReturnProps } from "./types";
import { getFilteredBlockTypeOptions } from "../color-dropdown-menu/utils";

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useCaption({
  editor,
  allowedBlockTypes,
  hideWhenUnavailable = false,
}: UseCaptionProps): UseCaptionReturnProps {
  const [, setSelectionKey] = useState(0); // triggers re-render on update

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      setSelectionKey((prev) => prev + 1);
    };

    // Tiptap events
    editor.on("selectionUpdate", handleUpdate);
    editor.on("transaction", handleUpdate);

    return () => {
      editor.off("selectionUpdate", handleUpdate);
      editor.off("transaction", handleUpdate);
    };
  }, [editor]);

  const filteredBlockTypes = getFilteredBlockTypeOptions(allowedBlockTypes);
  let isVisible = filteredBlockTypes.some((block) =>
    editor?.isActive(block.type),
  );
  isVisible = hideWhenUnavailable ? isVisible : true;

  return {
    isVisible,
  };
}
