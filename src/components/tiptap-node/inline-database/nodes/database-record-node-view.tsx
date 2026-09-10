import { useLayoutEffect, useMemo, useState } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { createPortal } from "react-dom";
import { useDatabaseBridgeData } from "../hooks/use-database-bridge-data";
import { useRecordRowState } from "../utils/record-selection-store";
import { recordSelection } from "../utils/record-selection-store";
import { beginRowDragSelect } from "../utils/row-drag-select";
import { useRowAnchor } from "../hooks/use-row-anchor";
import type { CellValue, DatabaseProperty } from "src/types";
import { BoardCardBody } from "../primitives/board-card-body";

function isEmptyCellValue(
  value: CellValue | null,
  prop: DatabaseProperty,
): boolean {
  if (prop.config.type === "checkbox") return false;
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export default function DatabaseRecordNodeView({
  node,
  editor,
}: NodeViewProps) {
  const recordId = node.attrs.recordId as string | null;
  const databaseId = node.attrs.databaseId as string | null;

  const data = useDatabaseBridgeData(editor, databaseId);
  const { isSelected, isHovered } = useRecordRowState(databaseId, recordId);
  const [wrapperEl, setWrapperEl] = useState<HTMLElement | null>(null);

  const isBoard = data?.view?.type === "board";
  const isGallery = data?.view?.type === "gallery";
  const record = recordId ? (data?.recordsById.get(recordId) ?? null) : null;

  // ── Grid placement (board = 2D via boardPlacement; else 1D via rowSlots) ────
  const { isFilteredOut, boardPlace } = useMemo(() => {
    if (!data || !recordId) {
      return { isFilteredOut: false, boardPlace: undefined, order: undefined };
    }
    if (isGallery) {
      return { isFilteredOut: false, boardPlace: undefined, order: undefined };
    }
    const bp = data.boardPlacement?.[recordId];
    if (bp) return { isFilteredOut: false, boardPlace: bp, order: undefined };
    const index = data.sortedRecordIds?.indexOf(recordId) ?? -1;
    return {
      isFilteredOut: index === -1,
      boardPlace: undefined,
      order: index === -1 ? undefined : index,
    };
  }, [data, recordId, isGallery]);

  useLayoutEffect(() => {
    const box = wrapperEl?.closest<HTMLElement>(
      ".react-renderer.node-databaseRecord",
    );
    if (!box) return;

    if (isGallery) {
      box.style.setProperty("display", "block", "important");
      box.style.setProperty("background", "transparent", "important");
      box.style.setProperty("grid-row", "", "important");
      box.style.setProperty("grid-column", "", "important");
      box.style.setProperty("min-height", "fit-content", "important");
      box.style.setProperty("height", "100%", "important");
      box.style.setProperty("margin", "0px", "important");
      return;
    }

    if (isBoard) {
      const bp = recordId ? data?.boardPlacement?.[recordId] : undefined;
      if (bp) {
        box.style.display = "";
        box.style.gridColumn = String(bp.col + 1);
        box.style.gridRow = String(bp.row + 2);

        box.setAttribute("data-col-key", bp.columnKey);
        box.setAttribute("draggable", "true");
        box.removeAttribute("data-filtered");
      } else {
        // Board view but not placed (filtered out / hidden group) → hide.
        box.style.setProperty("display", "none", "important");
        box.style.gridColumn = "";
        box.style.gridRow = "";
        box.setAttribute("data-filtered", "true");
      }
      return;
    }

    // table/list (unchanged) — also clear board attrs
    box.removeAttribute("data-col-key");
    box.removeAttribute("draggable");
    const index = recordId
      ? (data?.sortedRecordIds?.indexOf(recordId) ?? -1)
      : -1;
    if (index === -1) {
      box.style.setProperty("display", "none", "important");
      box.style.gridRow = "";
      box.style.gridColumn = "";
    } else {
      box.style.removeProperty("display");
      box.style.gridRow = String(index + 1);
      box.style.gridColumn = "";
    }
  }, [wrapperEl, isBoard, isGallery, recordId, data]);

  // ── TABLE / LIST: node-rendered cells via NodeViewContent  ──

  const isTableView = data?.view?.type === "table";
  const [pointerOnCheckbox, setPointerOnCheckbox] = useState(false);
  const showCheckbox =
    isTableView &&
    !!recordId &&
    !!databaseId &&
    !isFilteredOut &&
    (isHovered || isSelected || pointerOnCheckbox);
  const anchor = useRowAnchor(wrapperEl, showCheckbox);

  // ── BOARD / Gallery: render as a card (React cells, no NodeViewContent) ──────────────
  if ((isBoard || isGallery) && record && data) {
    const properties = data.properties;
    const view = data.view!;
    const cardPreview =
      (view as { cardPreview?: "none" | "cover" | "content" }).cardPreview ??
      "none";
    const hidden = new Set(view.hiddenProperties ?? []);
    const titleProp =
      data.properties.find((p) => p.config.type === "title") ?? null;
    const otherProps = data.properties.filter((p) => {
      if (p.config.type === "title") return false;
      if (hidden.has(p.id)) return false;
      const v = (record.values?.[p.id] ?? null) as CellValue | null;
      return !isEmptyCellValue(v, p);
    });

    return (
      <NodeViewWrapper
        as="div"
        ref={setWrapperEl}
        data-type="database-record"
        data-record-id={recordId ?? undefined}
        className="db-record db-record--card"
        style={{
          display: isFilteredOut ? "none" : undefined,
          zIndex: 30,
          height: view.type === "gallery" ? "100%" : undefined,
          margin: view.type === "gallery" ? "0px" : undefined,
          padding: view.type === "gallery" ? "0px" : undefined,
        }}
        // The drag is handled by the board-drag PM extension; the node is
        // draggable at the PM level, not via dnd-kit.
        draggable="true"
      >
        <BoardCardBody
          record={record}
          properties={properties}
          titleProp={titleProp}
          otherProps={otherProps}
          cardPreview={cardPreview}
          view={view}
          recordId={recordId}
          setCellValue={data.setCellValue}
          color={boardPlace?.color}
        />
      </NodeViewWrapper>
    );
  }

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
        const inEditable = target.closest(
          '[contenteditable="true"], input, textarea, button, a, [role="button"]',
        );
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
              onPointerDown={(e) =>
                beginRowDragSelect(databaseId!, recordId!, wrapperEl, e)
              }
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
