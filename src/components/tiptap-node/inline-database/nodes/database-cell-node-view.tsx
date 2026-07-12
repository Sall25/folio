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
// sidebar, peek view, breadcrumbs and search all read it there. Making the
// title a content cell meant its text was ALSO stored in the node's inline
// content and mirrored into values[], i.e. three copies of one string with no
// working sync between them: typing in the cell wrote to values[] (which
// nothing reads), and renaming the page never reached the cell. Title is now an
// atom cell that reads page.title directly — one source of truth, no mirroring.
const CONTENT_TYPES = new Set(["text"]);

/**
 * databaseCell NodeView. ONE node type for all property types. Reads its
 * database's data from the editor-storage bridge (React context can't cross
 * the NodeView boundary), keyed by node.attrs.databaseId.
 *
 *   - TEXT cell: bare NodeViewContent — native editable inline text, mirrored
 *     to the DataSource on edit (debounced) so filters/sorts stay correct.
 *   - ATOM cell (everything else, including TITLE): the <Cell> widget, value
 *     to/from the DataSource — or, for title, to/from page.title.
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
