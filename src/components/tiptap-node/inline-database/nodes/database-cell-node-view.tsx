import { useEffect, useMemo, useRef } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { useDatabaseBridgeData } from "../hooks/use-database-bridge-data";
import { Cell } from "../components/cells/cell";
import { useDebouncedCallback } from "use-debounce";
import type { CellValue, ID } from "src/types";

// Only TEXT cells hold native editable ProseMirror inline content.
//
// TITLE is deliberately NOT here. A record's title lives on page.title — the
// sidebar, peek view, breadcrumbs and search all read it there. Title is an atom
// cell that reads page.title directly, so there's one source of truth.
const CONTENT_TYPES = new Set(["text"]);

/**
 * databaseCell NodeView. ONE node type for all property types. Reads its
 * database's data from the editor-storage bridge (React context can't cross the
 * NodeView boundary), keyed by node.attrs.databaseId.
 *
 * HIDING and FREEZING are VIEW concerns — per-view, not schema. Another client,
 * or another view of the same database, may show a column this view hides, or
 * freeze a different one. So the cell node always STAYS in the shared document
 * and the view decides only how it renders:
 *
 *   - hidden  → display:none (node untouched, just not painted)
 *   - frozen  → position:sticky at the offset the header computed
 *
 * (Contrast column REORDER, which really does rewrite source.properties — a
 * schema change — and therefore does move the cell nodes. See use-database-seed.)
 */
export default function DatabaseCellNodeView({ node, editor }: NodeViewProps) {
  const recordId = node.attrs.recordId as ID | null;
  const propertyId = node.attrs.propertyId as ID | null;
  const databaseId = node.attrs.databaseId as string | null;

  const data = useDatabaseBridgeData(editor, databaseId);

  const property = useMemo(
    () => data?.properties.find((p) => p.id === propertyId) ?? null,
    [data?.properties, propertyId],
  );

  const propType = property?.config.type;
  const isContent = !!propType && CONTENT_TYPES.has(propType);

  // View-driven presentation.
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
      // Below the header (z 8) so a sticky header cell still wins over a sticky
      // body cell where they overlap.
      style.zIndex = 4;
      style.background = "var(--tt-bg-color)";
      if (sticky.isBoundary) {
        style.borderRight = "2px solid var(--tt-border-color)";
      }
    }
    return style;
  }, [isHidden, sticky]);

  // Write-through for CONTENT cells: node content is authoritative; mirror its
  // plain text into the DataSource on edit (debounced).
  const writeThrough = useDebouncedCallback((text: string) => {
    if (recordId && propertyId && data) {
      data.setCellValue(recordId, propertyId, text as CellValue);
    }
  }, 400);

  const lastTextRef = useRef<string>("");
  useEffect(() => {
    if (!isContent) return;
    const text = node.textContent;
    if (text !== lastTextRef.current) {
      lastTextRef.current = text;
      writeThrough(text);
    }
  }, [isContent, node.textContent, writeThrough]);

  // Data not published yet, or unresolvable cell → empty grid cell.
  if (!data || !property || !recordId || !propertyId) {
    return (
      <NodeViewWrapper
        as="div"
        data-type="database-cell"
        className="db-node-cell"
        style={viewStyle}
      >
        {/* keep a content hole so PM has somewhere to put inline content */}
        {isContent ? <NodeViewContent as="div" /> : null}
      </NodeViewWrapper>
    );
  }

  // ── TEXT cell: bare native editable content ───────────────────────────────
  if (isContent) {
    return (
      <NodeViewWrapper
        as="div"
        data-type="database-cell"
        data-cell-kind="content"
        className="db-node-cell db-node-cell--content"
        style={viewStyle}
      >
        <NodeViewContent as="div" className="db-node-cell__content" />
      </NodeViewWrapper>
    );
  }

  // ── ATOM cell: value widget (title included) ──────────────────────────────
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
          properties={data.properties}
          value={value}
          record={record}
          view={data.view}
          columnValues={data.columnValuesByProp[propertyId] ?? []}
          templateId={data.templateId}
          readonly={data.locked}
          onChange={(v) => data.setCellValue(recordId, propertyId, v)}
        />
      )}
    </NodeViewWrapper>
  );
}
