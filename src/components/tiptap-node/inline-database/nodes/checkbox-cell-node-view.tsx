import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Check } from "lucide-react";
import type { CheckboxCellAttrs } from "../types/types";

import "./checkbox-cell-node-view.scss";
import { useActiveViewType } from "../hooks/use-active-view-type";

export function CheckboxCellNodeView({
  node,
  updateAttributes,
  getPos,
  editor,
}: NodeViewProps) {
  const attrs = node.attrs as CheckboxCellAttrs;

  const onToggle = () => {
    updateAttributes({ ...attrs, value: !attrs.value });
  };

  const activeViewType = useActiveViewType(editor, getPos);

  return (
    <NodeViewWrapper
      as="div"
      data-type="checkbox-cell"
      className={`${activeViewType === "table" ? "db-td" : ""} db-td--checkbox`}
      style={{ margin: 0 }}
    >
      <button
        className={`db-checkbox ${attrs.value ? "db-checkbox--checked" : ""}`}
        onClick={onToggle}
        contentEditable={false}
        aria-checked={attrs.value}
        role="checkbox"
      >
        {attrs.value && <Check size={11} strokeWidth={3} />}
      </button>
    </NodeViewWrapper>
  );
}
