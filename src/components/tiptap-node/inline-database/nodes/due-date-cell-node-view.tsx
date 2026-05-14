import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import type { DateCellAttrs } from "../types/types";
import { DateCellDisplay } from "../primitives/date-cell-display";
import { useActiveViewType } from "../hooks/use-active-view-type";

export function DueDateCellNodeView({
  node,
  updateAttributes,
  editor,
  getPos,
}: NodeViewProps) {
  const dueDateAttrs = node.attrs as DateCellAttrs;
  const activeViewType = useActiveViewType(editor, getPos);

  return (
    <NodeViewWrapper
      as="div"
      data-type="date-cell"
      style={{
        borderRight:
          activeViewType === "table"
            ? "1px solid var(--tt-border-color)"
            : "none",
        height: "fit-content",
        margin: 0,
      }}
    >
      <DateCellDisplay
        value={dueDateAttrs.value}
        onChange={(iso) => updateAttributes({ value: iso })}
      />
    </NodeViewWrapper>
  );
}
