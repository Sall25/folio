import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import type { RollupCellAttrs } from "../types/types";
import "./rollup-cell-node-view.scss";
import { useCellPageSync } from "../hooks/use-cell-page-sync";
import { useIsPropertyHidden } from "../hooks/use-is-property-hidden";

export function RollupCellNodeView({
  node,
  getPos,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const attrs = node.attrs as RollupCellAttrs;

  const display =
    attrs.value !== null && attrs.value !== undefined
      ? String(attrs.value)
      : "";
  useCellPageSync(getPos, updateAttributes);
  const isHidden = useIsPropertyHidden(editor, getPos, node.attrs.propertyId);
  if (isHidden)
    return <NodeViewWrapper as={"div"} style={{ display: "none" }} />;
  return (
    <NodeViewWrapper
      as="div"
      data-type="rollup-cell"
      className="db-td db-td--rollup"
      style={{ margin: 0 }}
    >
      <span className="db-cell-readonly">{display}</span>
    </NodeViewWrapper>
  );
}
