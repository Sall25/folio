import { useCallback, useMemo } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { useDatabaseBridgeData } from "../hooks/use-database-bridge-data";
import { Cell } from "../components/cells/cell";
import type { CellValue, DatabaseProperty, ID } from "src/types";

const EMPTY_PROPERTIES: DatabaseProperty[] = [];
const EMPTY_COLUMN_VALUES: CellValue[] = [];

/**
 * databaseCell NodeView. ONE node type for every property type, and every cell is
 * now an ATOM — a React widget reading its value from the DataSource (via the
 * editor-storage bridge, since React context can't cross the NodeView boundary).
 *
 * WHY NO CONTENT CELLS ANYMORE
 *
 * Title and text used to be "content cells": their value WAS the node's inline
 * ProseMirror content, mirrored into values[] by a debounced write-through. That
 * gave each of them two sources of truth, and it meant neither could use the
 * overlay editor — ProseMirror owns that DOM and fights an <input> for the caret.
 * Title's real home is page.title; text's is values[]. Both are atoms now, so
 * every cell reads one source, writes one source, and gets CellEditorPopover.
 *
 * The cost, stated plainly: in-cell text edits are a debounced patch rather than
 * a live Yjs merge, so two people editing the SAME cell simultaneously is
 * last-write-wins instead of character-merged. Cell-level, not document-level —
 * the page body is still fully collaborative.
 *
 * VIEW vs SCHEMA
 *
 * Hiding and freezing are per-VIEW: another client (or another view of the same
 * database) may show a column this view hides, or freeze a different one. So the
 * cell node always STAYS in the shared document and the view decides only how it
 * renders — display:none when hidden, position:sticky when frozen. (Column
 * REORDER, by contrast, really does rewrite source.properties, so it moves the
 * nodes — see use-database-seed.ts.)
 */
export default function DatabaseCellNodeView({ node, editor }: NodeViewProps) {
  const recordId = node.attrs.recordId as ID | null;
  const propertyId = node.attrs.propertyId as ID | null;
  const databaseId = node.attrs.databaseId as string | null;

  const data = useDatabaseBridgeData(editor, databaseId);

  const properties = data?.properties ?? EMPTY_PROPERTIES;
  const property = useMemo(
    () => properties?.find((p) => p.id === propertyId) ?? null,
    [properties, propertyId],
  );

  // ── View-driven presentation ──────────────────────────────────────────────
  const isHidden = !!(
    propertyId && data?.view?.hiddenProperties?.includes(propertyId)
  );
  const sticky = propertyId ? data?.stickyByProp?.[propertyId] : undefined;

  const viewStyle = useMemo(() => {
    const style: React.CSSProperties = {};
    if (isHidden) style.display = "none";
    if (sticky) {
      style.position = "sticky";
      style.left = sticky.left;
      // Below the header (z 8), so a sticky header cell still wins where they
      // overlap.
      style.zIndex = 4;
      style.background = "var(--tt-bg-color)";
      if (sticky.isBoundary) {
        style.borderRight = "2px solid var(--tt-border-color)";
      }
    }
    return style;
  }, [isHidden, sticky]);

  // derive wrap from the view/property — pick whichever your model uses
  const unwrapped = !!(
    propertyId &&
    data?.view?.type === "table" &&
    data?.view?.unwrappedProperties?.includes(propertyId)
  );

  const setCellValue = data?.setCellValue;
  const handleChange = useCallback(
    (v: CellValue | null) =>
      recordId && propertyId
        ? setCellValue?.(recordId, propertyId, v)
        : undefined,
    [setCellValue, recordId, propertyId],
  );

  // Data not published yet, or unresolvable cell → empty grid cell. No content
  // hole: nothing in this node is ProseMirror-owned anymore.
  if (!data || !property || !recordId || !propertyId) {
    return (
      <NodeViewWrapper
        as="div"
        data-type="database-cell"
        className="db-node-cell"
        style={viewStyle}
        contentEditable={false}
      />
    );
  }

  const record = data.recordsById.get(recordId) ?? null;
  const value = record?.values?.[propertyId] ?? null;

  return (
    <NodeViewWrapper
      as="div"
      data-type="database-cell"
      data-cell-kind="atom"
      className="db-node-cell db-node-cell--atom"
      contentEditable={false}
      style={viewStyle}
    >
      {record && (
        <Cell
          property={property}
          properties={properties}
          value={value}
          record={record}
          view={data.view}
          columnValues={
            data.columnValuesByProp[propertyId] ?? EMPTY_COLUMN_VALUES
          }
          templateId={data.templateId}
          readonly={data.locked}
          onChange={handleChange}
          unwrapped={unwrapped}
        />
      )}
    </NodeViewWrapper>
  );
}
