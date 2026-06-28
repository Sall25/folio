import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";

/**
 * Reading `editor.isEditable` directly inside a node view is not reactive —
 * the view won't re-render when you call `editor.setEditable(...)`. This
 * subscribes so the view flips between author / read behavior correctly.
 *
 * Note: call `editor.setEditable(false)` with its default emitUpdate (don't
 * pass `false` as the 2nd arg), otherwise no event fires.
 */
export function useEditorEditable(editor: Editor): boolean {
  const [editable, setEditable] = useState(editor.isEditable);

  useEffect(() => {
    const sync = () => setEditable(editor.isEditable);
    sync();
    editor.on("update", sync);
    editor.on("transaction", sync);
    return () => {
      editor.off("update", sync);
      editor.off("transaction", sync);
    };
  }, [editor]);

  return editable;
}
