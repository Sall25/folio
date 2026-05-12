import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import type { FormulaCellAttrs } from "../types/types";
import "./formula-cell-node-view.scss";

function formatValue(value: FormulaCellAttrs["value"]): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "☑" : "☐";
  return String(value);
}

export function FormulaCellNodeView({ node }: NodeViewProps) {
  const attrs = node.attrs as FormulaCellAttrs;
  const { value } = attrs;

  const isEmpty = value === null || value === undefined || value === "";

  return (
    <NodeViewWrapper
      as={"div"}
      data-type="formula-cell"
      style={{
        paddingLeft: 10,
        borderRight: "1px solid var(--tt-border-color)",
      }}
    >
      <div className="formula-cell">
        <span className="formula-cell__value" data-empty={isEmpty}>
          {isEmpty ? "" : formatValue(value)}
        </span>
      </div>
    </NodeViewWrapper>
  );
}
