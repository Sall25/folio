import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import type { BoardView, DatabaseAttrs, SelectOption } from "../types/types";
import { useParentDatabase } from "../hooks/use-parent-database";
import "./database-record-board-view.scss";

const NONE_COLUMN_ID = "__none__";

interface ColumnDef {
  id: string;
  label: string;
  color?: string;
}

// Read the groupBy cell value from this record node and map it to a column id
function getRecordColumnId(
  node: NodeViewProps["node"],
  groupByPropertyId: string,
  attrs: DatabaseAttrs,
): string {
  const groupProp = attrs.properties.find((p) => p.id === groupByPropertyId);
  if (!groupProp) return NONE_COLUMN_ID;

  let cellValue: unknown = null;
  node.forEach((cell) => {
    if (cell.attrs.propertyId === groupByPropertyId) {
      cellValue = cell.attrs.value ?? null;
    }
  });

  if (cellValue === null || cellValue === undefined) return NONE_COLUMN_ID;

  const config = groupProp.config;

  if (config.type === "select") {
    const option = cellValue as SelectOption | null;
    return option?.id ?? NONE_COLUMN_ID;
  }

  if (config.type === "multi_select") {
    const options = cellValue as SelectOption[];
    // Place in the first matching column
    return options[0]?.id ?? NONE_COLUMN_ID;
  }

  if (config.type === "status") {
    return (cellValue as string) ?? NONE_COLUMN_ID;
  }

  if (config.type === "checkbox") {
    return String(cellValue);
  }

  return NONE_COLUMN_ID;
}

export function DatabaseRecordBoardView(props: NodeViewProps) {
  const { node, getPos, editor } = props;

  const db = useParentDatabase(editor, getPos);
  if (!db) return null;

  const attrs = db.attrs as DatabaseAttrs;
  const activeView = attrs.views.find((v) => v.id === attrs.activeViewId) as
    | BoardView
    | undefined;

  const groupByPropertyId = activeView?.groupByPropertyId ?? "";

  // Read column defs from the CSS custom property set by DatabaseBoardNodeView
  // This avoids any prop drilling through ProseMirror node boundaries
  const columnId = groupByPropertyId
    ? getRecordColumnId(node, groupByPropertyId, attrs)
    : NONE_COLUMN_ID;

  // All columns: [none, ...columnDefs] — none column is always index 0 (col 1)
  // We need to find this record's 1-based grid column index
  const groupProp = attrs.properties.find((p) => p.id === groupByPropertyId);
  const columnDefs: ColumnDef[] = groupProp
    ? (() => {
        const config = groupProp.config;
        if (config.type === "select" || config.type === "multi_select") {
          return config.options.map((o: SelectOption) => ({
            id: o.id,
            label: o.label,
            color: o.color,
          }));
        }
        if (config.type === "status") {
          return config.groups.flatMap((g) =>
            g.items.map((item) => ({
              id: item.id,
              label: item.name,
              color: item.color,
            })),
          );
        }
        if (config.type === "checkbox") {
          return [
            { id: "true", label: "Checked" },
            { id: "false", label: "Unchecked" },
          ];
        }
        return [];
      })()
    : [];

  const allColumns: ColumnDef[] = [...columnDefs];

  const columnIndex = allColumns.findIndex((c) => c.id === columnId);

  // If no column found, hide the card entirely
  if (columnIndex < 0) {
    return <NodeViewWrapper as="div" style={{ display: "none" }} />;
  }

  const gridColumn = columnIndex + 1;

  // Visible properties for the card — exclude the groupBy property from the
  // card body since it's represented by the column header, exclude hidden ones
  const hiddenPropertyIds = new Set(activeView?.hiddenProperties ?? []);
  const cardProperties = attrs.properties.filter(
    (p) =>
      p.config.type !== "title" &&
      p.id !== groupByPropertyId &&
      !hiddenPropertyIds.has(p.id),
  );

  return (
    <NodeViewWrapper
      className="db-board-card"
      style={
        {
          gridColumn,
          "--db-board-card-props": JSON.stringify(
            cardProperties.map((p) => p.id),
          ),
        } as React.CSSProperties
      }
    >
      <NodeViewContent as="div" className="db-board-card__cells" />
    </NodeViewWrapper>
  );
}
