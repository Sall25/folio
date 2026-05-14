import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import type { BoardView, DatabaseAttrs, SelectCellAttrs } from "../types/types";
import { SelectCellDisplay } from "../primitives/select-cell-display";
import { useActiveViewType } from "../hooks/use-active-view-type";
import { useParentDatabase } from "../hooks/use-parent-database";
import "./select-cell-node-view.scss";

export function SelectCellNodeView({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const selectAttrs = node.attrs as SelectCellAttrs;
  const activeViewType = useActiveViewType(editor, getPos);
  const db = useParentDatabase(editor, getPos);

  if (!db) return null;

  const attrs = db.attrs as DatabaseAttrs;
  const prop = attrs.properties.find((p) => p.id === selectAttrs.propertyId);

  if (
    !prop ||
    prop.config.type !== "select" ||
    prop.config.options.length === 0
  )
    return (
      <NodeViewWrapper
        as="div"
        className={`${activeViewType === "table" ? "db-td" : ""} select-cell`}
        data-type="select-cell"
        style={{ margin: 0 }}
      >
        <NodeViewContent />
      </NodeViewWrapper>
    );

  // Hide when this cell is the group-by property in board view
  if (activeViewType === "board") {
    const activeView = attrs.views.find((v) => v.id === attrs.activeViewId) as
      | BoardView
      | undefined;
    if (activeView?.groupByPropertyId === selectAttrs.propertyId) return null;
  }

  return (
    <NodeViewWrapper
      as="div"
      className={`${activeViewType === "table" ? "db-td" : ""} select-cell`}
      data-type="select-cell"
      style={{
        display: "flex",
        padding: "0 5px",
        justifyContent: "center",
        margin: 0,
      }}
    >
      <SelectCellDisplay
        value={selectAttrs.value}
        options={prop.config.options}
        onChange={(option) =>
          updateAttributes({ ...selectAttrs, value: option })
        }
      />
    </NodeViewWrapper>
  );
}
