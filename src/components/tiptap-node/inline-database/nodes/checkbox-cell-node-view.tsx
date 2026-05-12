import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Check } from "lucide-react";
import type { CheckboxCellAttrs } from "../types/types";

import "./checkbox-cell-node-view.scss";

export function CheckboxCellNodeView({
  node,
  updateAttributes,
}: NodeViewProps) {
  const attrs = node.attrs as CheckboxCellAttrs;

  const onToggle = () => {
    updateAttributes({ ...attrs, value: !attrs.value });
  };

  return (
    <NodeViewWrapper
      as="div"
      data-type="checkbox-cell"
      className="db-td db-td--checkbox"
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
