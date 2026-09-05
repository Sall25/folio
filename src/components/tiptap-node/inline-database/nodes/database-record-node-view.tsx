import { useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { useDatabaseBridgeData } from "../hooks/use-database-bridge-data";
import {
  recordSelection,
  useRecordRowState,
} from "../utils/record-selection-store";
import { useRowAnchor } from "../hooks/use-row-anchor";
import { beginRowDragSelect } from "../utils/row-drag-select";

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
 * SELECTION checkbox: PORTALED to document.body and pinned with position:fixed.
 * It cannot live in the row: the row's ancestors clip it
 * (.simple-editor-main overflow-x:hidden, plus the paint containment implied by
 * content-visibility:auto on .tiptap.ProseMirror), and reserving in-grid gutter
 * padding would shift every %/fr column track out of sync with the header.
 * Only the hovered row (published by the drag handle) and selected rows mount a
 * portal, so this is at most `selected + 1` extra nodes.
 */
export default function DatabaseRecordNodeView({
  node,
  editor,
}: NodeViewProps) {
  const recordId = node.attrs.recordId as string | null;
  const databaseId = node.attrs.databaseId as string | null;

  const data = useDatabaseBridgeData(editor, databaseId);
  const { isSelected, isHovered } = useRecordRowState(databaseId, recordId);

  const [wrapperEl, setWrapperEl] = useState<HTMLElement | null>(null);
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

  useLayoutEffect(() => {
    const box = wrapperEl?.closest<HTMLElement>(
      ".react-renderer.node-databaseRecord",
    );
    if (!box) return;
    if (isFilteredOut) {
      box.style.setProperty("display", "none", "important");
      box.style.gridRow = "";
    } else {
      box.style.removeProperty("display"); // let scss display:grid take over
      box.style.gridRow = order !== undefined ? String(order + 1) : "";
    }
  }, [wrapperEl, order, isFilteredOut]);

  const [pointerOnCheckbox, setPointerOnCheckbox] = useState(false);
  const isTableView = data?.view?.type === "table";

  const showCheckbox =
    isTableView &&
    !!recordId &&
    !!databaseId &&
    !isFilteredOut &&
    (isHovered || isSelected || pointerOnCheckbox);

  const anchor = useRowAnchor(wrapperEl, showCheckbox);

  return (
    <NodeViewWrapper
      as="div"
      ref={setWrapperEl}
      data-type="database-record"
      data-record-id={recordId ?? undefined}
      data-selected={isSelected || undefined}
      data-hovered={isHovered || undefined}
      className="db-record"
      style={{
        position: "relative",
        display: isFilteredOut ? "none" : undefined,
      }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onPointerDown={(e: any) => {
        if (!databaseId || !recordId) return;

        const target = e.target as HTMLElement;

        // Don't hijack real editing: presses inside a cell's editable content,
        // or on an interactive control, behave normally.
        const inEditable = target.closest(
          '[contenteditable="true"], input, textarea, button, a, [role="button"]',
        );

        // Once a selection exists, dragging across rows extends it (Notion
        // behavior) — that takes priority over placing a caret.
        const hasSelection = recordSelection.get(databaseId).length > 0;

        if (inEditable && !hasSelection) return;

        beginRowDragSelect(databaseId, recordId, wrapperEl, e);
      }}
    >
      {showCheckbox &&
        anchor &&
        createPortal(
          <span
            className="db-record__select"
            contentEditable={false}
            onPointerEnter={() => setPointerOnCheckbox(true)}
            onPointerLeave={() => setPointerOnCheckbox(false)}
            style={{ top: anchor.top + 17, left: anchor.left - 16 }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              aria-label="Select record"
              draggable={false}
              onPointerDown={(e) => {
                beginRowDragSelect(databaseId!, recordId!, wrapperEl, e);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={() => {}}
            />
          </span>,
          document.body,
        )}
      <NodeViewContent as="div" className="db-record__cells" />
    </NodeViewWrapper>
  );
}
