import { useCallback } from "react";
import {
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { Chevron } from "src/components/tiptap-ui-primitive/chevron";

export function AppendixView({ node, editor, getPos }: NodeViewProps) {
  const open: boolean = node.attrs.open;

  // Show a "Toggle" placeholder when the title is empty (Notion style).
  const summaryEmpty = node.child(0)?.content.size === 0;

  const toggle = useCallback(() => {
    const pos = getPos();
    if (typeof pos !== "number") return;

    editor
      .chain()
      .command(({ tr, state }) => {
        const current = state.doc.nodeAt(pos);
        if (!current || current.type.name !== "appendix") return false;

        const nextOpen = !current.attrs.open;
        tr.setNodeMarkup(pos, undefined, { ...current.attrs, open: nextOpen });

        if (!nextOpen) {
          const { from } = state.selection;
          const inside = from > pos && from < pos + current.nodeSize;
          if (inside) {
            const summary = current.child(0);
            const summaryEnd = pos + 1 + summary.nodeSize - 1;
            tr.setSelection(TextSelection.create(tr.doc, summaryEnd));
          }
        }
        return true;
      })
      .run();
  }, [editor, getPos]);

  return (
    <NodeViewWrapper
      className={["appendix", "toggle-block", open && "appendix--open"]
        .filter(Boolean)
        .join(" ")}
      data-empty={summaryEmpty ? "true" : "false"}
    >
      <Chevron
        className="appendix__caret"
        size="large"
        expanded={open}
        contentEditable={false}
        aria-label={open ? "Collapse toggle" : "Expand toggle"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggle}
      />
      <NodeViewContent className="appendix__body" />
    </NodeViewWrapper>
  );
}
