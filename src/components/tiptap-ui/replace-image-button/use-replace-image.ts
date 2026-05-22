import { useState, useEffect } from "react";
import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";

interface UseReplaceImageProps {
  editor: Editor | null;
  hideWhenUnavailable?: boolean;
}

interface UseReplaceImageReturn {
  isVisible: boolean;
}

export function useReplaceImage({
  editor,
  hideWhenUnavailable = false,
}: UseReplaceImageProps): UseReplaceImageReturn {
  const [, setSelectionKey] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => setSelectionKey((prev) => prev + 1);
    editor.on("selectionUpdate", handleUpdate);
    editor.on("transaction", handleUpdate);
    return () => {
      editor.off("selectionUpdate", handleUpdate);
      editor.off("transaction", handleUpdate);
    };
  }, [editor]);

  const isImageSelected = (() => {
    if (!editor) return false;
    const { selection } = editor.state;
    return (
      selection instanceof NodeSelection && selection.node.type.name === "image"
    );
  })();

  const isVisible = hideWhenUnavailable ? isImageSelected : true;

  return { isVisible };
}
