import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import type { BoardView, DatabaseAttrs, StatusCellAttrs } from "../types/types";
import { StatusCellDisplay } from "../primitives/status-cell-display";
import { useActiveViewType } from "../hooks/use-active-view-type";
import { useParentDatabase } from "../hooks/use-parent-database";
import "./status-cell-node-view.scss";

export function StatusCellNodeView({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const statusAttrs = node.attrs as StatusCellAttrs;
  const activeViewType = useActiveViewType(editor, getPos);
  const db = useParentDatabase(editor, getPos);

  if (!db) return null;

  const attrs = db.attrs as DatabaseAttrs;
  const prop = attrs.properties.find((p) => p.id === statusAttrs.propertyId);

  if (!prop || prop.config.type !== "status")
    return (
      <NodeViewWrapper
        as="div"
        className={`${activeViewType === "table" ? "db-td" : ""} status-cell`}
        data-type="status-cell"
      />
    );

  // Hide when this cell is the group-by property in board view
  if (activeViewType === "board") {
    const activeView = attrs.views.find((v) => v.id === attrs.activeViewId) as
      | BoardView
      | undefined;
    if (activeView?.groupByPropertyId === statusAttrs.propertyId) return null;
  }

  return (
    <NodeViewWrapper
      as="div"
      className="status-cell"
      data-type="status-cell"
      style={{ margin: 0, borderRight: "none !important" }}
    >
      <StatusCellDisplay
        value={statusAttrs.value}
        groups={prop.config.groups}
        onChange={(item) => updateAttributes({ value: item.id })}
      />
    </NodeViewWrapper>
  );
}
