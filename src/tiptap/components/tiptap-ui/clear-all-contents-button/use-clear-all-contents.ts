import { getSelectedBlockNodes } from "@/lib/tiptap-utils";
import type { Editor } from "@tiptap/core";
import { useEffect, useState } from "react";

interface UseClearAllContentsProps {
  editor: Editor | null;
  allowedBlockTypes: string[];
}

interface UseClearAllContentsReturn {
  visible: boolean;
}

export function UseClearAllContents({
  allowedBlockTypes,
  editor,
}: UseClearAllContentsProps): UseClearAllContentsReturn {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const targets = getSelectedBlockNodes(editor);
      if (!targets.length) return;

      setVisible(
        targets.some((target) => {
          for (const block of allowedBlockTypes) {
            if (target.type.name === block) return true;
          }
          return false;
        }),
      );
    };

    editor.on("update", update);

    return () => {
      editor.off("update", update);
    };
  }, [editor, allowedBlockTypes]);

  return {
    visible,
  };
}
