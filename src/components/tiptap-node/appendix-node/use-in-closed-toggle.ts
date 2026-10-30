import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";

/** True while the block at `getPos()` is inside a collapsed toggle (at any
 *  depth). A collapsed toggle's content isn't drawn (display: none), but its
 *  blocks still mount; heavy ones (a database) use this to wait until the
 *  toggle is opened. */
export function useInClosedToggle(
  editor: Editor,
  getPos: () => number | undefined,
): boolean {
  return !!useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const pos = getPos();
      if (!e || typeof pos !== "number") return false;
      try {
        const $pos = e.state.doc.resolve(pos);
        for (let d = $pos.depth; d > 0; d--) {
          const node = $pos.node(d);
          if (node.type.name === "appendix" && !node.attrs.open) return true;
        }
      } catch {
        return false; // position out of date (the doc changed)
      }
      return false;
    },
  });
}
