import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import type {
  BoardView,
  DatabaseAttrs,
  MultiSelectCellAttrs,
} from "../types/types";
import { MultiSelectCellDisplay } from "../primitives/multi-select-cell-display";
import { useActiveViewType } from "../hooks/use-active-view-type";
import { useParentDatabase } from "../hooks/use-parent-database";
import { useCellPageSync } from "../hooks/use-cell-page-sync";
import { useIsPropertyHidden } from "../hooks/use-is-property-hidden";

export function MultiSelectCellNodeView({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const multiSelectAttrs = node.attrs as MultiSelectCellAttrs;
  const activeViewType = useActiveViewType(editor, getPos);
  const db = useParentDatabase(editor, getPos);
  const syncPage = useCellPageSync(getPos, updateAttributes);
  const isHidden = useIsPropertyHidden(editor, getPos, node.attrs.propertyId);

  if (!db || isHidden)
    return <NodeViewWrapper as={"div"} style={{ display: "none" }} />;

  const attrs = db.attrs as DatabaseAttrs;
  const prop = attrs.properties.find(
    (p) => p.id === multiSelectAttrs.propertyId,
  );
  if (!prop || prop.config.type !== "multi_select")
    return (
      <NodeViewWrapper
        as="div"
        className={`${activeViewType === "table" ? "db-td" : ""} multi-select-cell`}
        data-type="multi-select-cell"
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
    if (activeView?.groupByPropertyId === multiSelectAttrs.propertyId)
      return null;
  }

  return (
    <NodeViewWrapper
      as="div"
      className={`${activeViewType === "table" ? "db-td" : ""} multi-select-cell`}
      data-type="multi-select-cell"
      style={{
        display: "flex",
        padding: "0 5px",
        alignItems: "center",
        gap: 4,
      }}
    >
      <MultiSelectCellDisplay
        value={multiSelectAttrs.value ?? []}
        options={prop.config.options}
        onChange={(value) =>
          syncPage(() => {
            updateAttributes({ ...multiSelectAttrs, value });
          }, node)
        }
      />
    </NodeViewWrapper>
  );
}
