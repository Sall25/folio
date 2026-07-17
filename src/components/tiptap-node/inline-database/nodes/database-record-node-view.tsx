import { useMemo } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { useDatabaseBridgeData } from "../hooks/use-database-bridge-data";

/**
 * databaseRecord NodeView — one row.
 *
 * The record wrapper IS the grid row: it spans every column and re-exposes them
 * to its cells via `grid-template-columns: subgrid`. (The Tiptap renderer div
 * above it is flattened with display:contents so this element becomes the direct
 * grid child — see database-nodes.scss.)
 *
 * FILTERING and SORTING are VIEW concerns, not schema ones. Another client — or
 * another view of the same database — may not filter this record out, or may
 * order it differently. So the record node always STAYS in the shared document;
 * the view decides only how it renders here:
 *
 *   - filtered out → display:none (the node is untouched, just not painted)
 *   - sort order   → CSS `order`, from the record's index in sortedRecords
 *
 * Reordering the actual record nodes would impose one viewer's sort on everyone,
 * which is exactly the bug this avoids. (Contrast column REORDER, which really is
 * a schema change and does move the cell nodes — see use-database-seed.ts.)
 */
export default function DatabaseRecordNodeView({
  node,
  editor,
}: NodeViewProps) {
  const recordId = node.attrs.recordId as string | null;
  const databaseId = node.attrs.databaseId as string | null;

  const data = useDatabaseBridgeData(editor, databaseId);

  console.log("[record]", { recordId, databaseId, hasData: !!data });

  // sortedRecords is already filtered AND sorted by DatabaseNodeView, so a
  // record's presence gives visibility and its index gives order — one lookup
  // covers both.
  const { isFilteredOut, order } = useMemo(() => {
    if (!data || !recordId) {
      return { isFilteredOut: false, order: undefined as number | undefined };
    }
    const index = data.sortedRecordIds.indexOf(recordId);
    return {
      isFilteredOut: index === -1,
      order: index === -1 ? undefined : index,
    };
  }, [data, recordId]);

  return (
    <NodeViewWrapper
      as="div"
      data-type="database-record"
      data-record-id={recordId ?? undefined}
      className="db-record"
      style={{
        display: isFilteredOut ? "none" : undefined,
        gridRow: order !== undefined ? order + 1 : undefined,
      }}
    >
      <NodeViewContent as="div" className="db-record__cells" />
    </NodeViewWrapper>
  );
}
