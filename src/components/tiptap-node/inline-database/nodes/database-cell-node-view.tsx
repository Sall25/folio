import { useEffect, useMemo, useRef } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { useDatabaseBridgeData } from "../hooks/use-database-bridge-data";
import { Cell } from "../components/cells/cell";
import { DatabaseTitleContentCell } from "./database-title-content-cell";
import { useDebouncedCallback } from "use-debounce";
import type { CellValue, ID } from "src/types";

// Content-type cells hold native editable ProseMirror inline content.
const CONTENT_TYPES = new Set(["title", "text"]);

/**
 * databaseCell NodeView. ONE node type for all property types. Reads its
 * database's data from the editor-storage bridge (React context can't cross
 * the NodeView boundary), keyed by node.attrs.databaseId.
 *
 *   - TITLE cell: icon + "Open" chrome wrapping the NodeViewContent text span
 *     (Option A) — native/collaborative inline editing with the display
 *     affordances around it.
 *   - TEXT cell: bare NodeViewContent — native editable inline text.
 *   - ATOM cell: the existing <Cell> widget, value to/from the DataSource.
 *
 * For content cells (title/text) the node content is authoritative; its plain
 * textContent is mirrored to the DataSource on edit (debounced) so filters/
 * sorts/other views stay correct.
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
  const isTitle = propType === "title";
  const width = (propertyId && data?.columnWidthByProp[propertyId]) || 160;

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
        style={{ width }}
      >
        {/* keep a content hole so PM has somewhere to put inline content */}
        {isContent ? <NodeViewContent as="div" /> : null}
      </NodeViewWrapper>
    );
  }

  // ── TITLE cell: chrome (icon + Open) around the editable content span ──────
  if (isTitle) {
    return (
      <NodeViewWrapper
        as="div"
        data-type="database-cell"
        data-cell-kind="content"
        className="db-node-cell db-node-cell--content db-node-cell--title"
        style={{ width }}
      >
        <DatabaseTitleContentCell
          pageId={recordId}
          templateId={data.templateId}
          view={data.view}
          readonly={data.locked}
        />
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
        style={{ width }}
      >
        <NodeViewContent as="div" className="db-node-cell__content" />
      </NodeViewWrapper>
    );
  }

  // ── ATOM cell: value widget ───────────────────────────────────────────────
  const record = data.recordsById.get(recordId) ?? null;
  const value = record?.values?.[propertyId] ?? null;

  return (
    <NodeViewWrapper
      as="div"
      data-type="database-cell"
      data-cell-kind="atom"
      className="db-node-cell db-node-cell--atom"
      contentEditable={false}
      style={{ width }}
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
