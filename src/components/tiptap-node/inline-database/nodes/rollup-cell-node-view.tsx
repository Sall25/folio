import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import type { RollupCellAttrs } from "../types/types";
import "./rollup-cell-node-view.scss";

export function RollupCellNodeView({ node }: NodeViewProps) {
  const attrs = node.attrs as RollupCellAttrs;

  const display =
    attrs.value !== null && attrs.value !== undefined
      ? String(attrs.value)
      : "";

  return (
    <NodeViewWrapper
      as="div"
      data-type="rollup-cell"
      className="db-td db-td--rollup"
    >
      <span className="db-cell-readonly">{display}</span>
    </NodeViewWrapper>
  );
}
