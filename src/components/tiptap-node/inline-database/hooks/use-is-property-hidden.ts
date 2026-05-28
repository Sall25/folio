import { useState, useEffect } from "react";
import type { Editor } from "@tiptap/core";
import type { NodeViewProps } from "@tiptap/react";

function getIsHidden(
  editor: Editor,
  getPos: NodeViewProps["getPos"],
  propertyId: string | null,
): boolean {
  if (!propertyId) return false;
  const pos = getPos?.();
  if (pos == null) return false;

  const $pos = editor.state.doc.resolve(pos);
  for (let d = $pos.depth; d > 0; d--) {
    const n = $pos.node(d);
    if (n.type.name !== "database") continue;
    const activeView =
      n.attrs.views?.find(
        (v: { id: string }) => v.id === n.attrs.activeViewId,
      ) ?? n.attrs.views?.[0];
    if (!activeView) return false;
    return (activeView.hiddenProperties ?? []).includes(propertyId);
  }
  return false;
}

export function useIsPropertyHidden(
  editor: Editor,
  getPos: NodeViewProps["getPos"],
  propertyId: string | null,
): boolean {
  const [isHidden, setIsHidden] = useState(() =>
    getIsHidden(editor, getPos, propertyId),
  );

  useEffect(() => {
    const handler = () => {
      setIsHidden(getIsHidden(editor, getPos, propertyId));
    };
    editor.on("transaction", handler);
    return () => {
      editor.off("transaction", handler);
    };
  }, [editor, getPos, propertyId]);

  return isHidden;
}
