import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import type {
  BoardView,
  DatabaseAttrs,
  CheckboxCellAttrs,
} from "../types/types";
import { CheckboxCellDisplay } from "../primitives/checkbox-cell-display";
import { useActiveViewType } from "../hooks/use-active-view-type";
import { useParentDatabase } from "../hooks/use-parent-database";
import "./checkbox-cell-node-view.scss";

export function CheckboxCellNodeView({
  node,
  updateAttributes,
  getPos,
  editor,
}: NodeViewProps) {
  const attrs = node.attrs as CheckboxCellAttrs;
  const activeViewType = useActiveViewType(editor, getPos);
  const db = useParentDatabase(editor, getPos);

  // Hide when this cell is the group-by property in board view
  if (activeViewType === "board" && db) {
    const dbAttrs = db.attrs as DatabaseAttrs;
    const activeView = dbAttrs.views.find(
      (v) => v.id === dbAttrs.activeViewId,
    ) as BoardView | undefined;
    if (activeView?.groupByPropertyId === attrs.propertyId) return null;
  }

  return (
    <NodeViewWrapper
      as="div"
      data-type="checkbox-cell"
      className={`${activeViewType === "table" ? "db-td" : ""} db-td--checkbox`}
      style={{ margin: 0 }}
    >
      <CheckboxCellDisplay
        value={attrs.value}
        onChange={() => updateAttributes({ ...attrs, value: !attrs.value })}
      />
    </NodeViewWrapper>
  );
}
