import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";

function getActiveViewType(
  editor: Editor,
  getPos: (() => number | undefined) | undefined,
): string {
  const pos = getPos?.();
  if (pos == null) return "table";
  const $pos = editor.state.doc.resolve(pos);
  for (let d = $pos.depth; d > 0; d--) {
    const n = $pos.node(d);
    if (n.type.name === "database") {
      const view = n.attrs.views?.find(
        (v: { id: string; type: string }) => v.id === n.attrs.activeViewId,
      );
      return view?.type ?? "table";
    }
  }
  return "table";
}

export function useActiveViewType(
  editor: Editor,
  getPos: (() => number | undefined) | undefined,
): string {
  const [activeViewType, setActiveViewType] = useState(() =>
    getActiveViewType(editor, getPos),
  );

  useEffect(() => {
    const handler = () => {
      setActiveViewType(getActiveViewType(editor, getPos));
    };
    editor.on("transaction", handler);
    return () => {
      editor.off("transaction", handler);
    };
  }, [editor, getPos]);

  return activeViewType;
}
