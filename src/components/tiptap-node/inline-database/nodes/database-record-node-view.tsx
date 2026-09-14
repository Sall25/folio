import { useLayoutEffect, useMemo, useState } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { createPortal } from "react-dom";
import { useDatabaseBridgeData } from "../hooks/use-database-bridge-data";
import { useRecordRowState } from "../utils/record-selection-store";
import { recordSelection } from "../utils/record-selection-store";
import { beginRowDragSelect } from "../utils/row-drag-select";
import { useRowAnchor } from "../hooks/use-row-anchor";
import type { CellValue, DatabaseProperty, TimelineView } from "src/types";
import { BoardCardBody } from "../primitives/board-card-body";
import {
  CELL_HEADER_HEIGHT,
  RECORD_HEIGHT,
} from "../hooks/use-calendar-layout";
import { ROW_HEIGHT as TL_ROW_HEIGHT } from "../hooks/use-timeline-layout";
import { TimelineCardBody } from "./timeline-card-body";

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

function resetBoxOverrides(box: HTMLElement) {
  box.style.removeProperty("display");
  box.style.removeProperty("position");
  box.style.removeProperty("top");
  box.style.removeProperty("left");
  box.style.removeProperty("width");
  box.style.removeProperty("height");
  box.style.removeProperty("grid-column");
  box.style.removeProperty("grid-row");
  box.style.removeProperty("margin");
  box.style.removeProperty("min-height");
  box.style.removeProperty("background");
  box.style.removeProperty("order");
  box.style.transform = "none";
  box.removeAttribute("data-col-key");
  box.removeAttribute("data-filtered");
  box.removeAttribute("draggable");
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
  const isCalendar = data?.view?.type === "calendar";
  const isTimeline = data?.view?.type === "timeline";
  const record = recordId ? (data?.recordsById.get(recordId) ?? null) : null;

  const { isFilteredOut, boardPlace } = useMemo(() => {
    if (!data || !recordId) {
      return { isFilteredOut: false, boardPlace: undefined, order: undefined };
    }
    if (isGallery || isCalendar || isTimeline) {
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
  }, [data, recordId, isGallery, isCalendar, isTimeline]);

  useLayoutEffect(() => {
    const box = wrapperEl?.closest<HTMLElement>(
      ".react-renderer.node-databaseRecord",
    );
    if (!box) return;

    resetBoxOverrides(box);

    const gp = recordId ? data?.galleryPlacement?.[recordId] : undefined;
    const cp = recordId ? data?.calendarPlacement?.[recordId] : undefined;
    const tp = recordId ? data?.timelinePlacement?.[recordId] : undefined;

    if (isTimeline) {
      const index = recordId
        ? (data?.sortedRecordIds?.indexOf(recordId) ?? -1)
        : -1;
      if (tp && index !== -1) {
        box.style.setProperty("display", "block", "important");
        box.style.setProperty("position", "absolute", "important");
        box.style.setProperty("top", `${index * TL_ROW_HEIGHT}px`, "important");
        box.style.setProperty("left", `${tp.left}px`, "important");
        box.style.setProperty("width", `${tp.width}px`, "important");
        box.style.setProperty("height", `${TL_ROW_HEIGHT}px`, "important");
        box.removeAttribute("draggable");
      } else {
        box.style.setProperty("display", "none", "important");
        box.setAttribute("data-filtered", "true");
      }
      return;
    }

    if (isCalendar) {
      if (cp) {
        box.style.setProperty("display", "block", "important");
        box.style.setProperty("grid-column", String(cp.col + 1), "important");
        box.style.setProperty("grid-row", String(cp.row + 2), "important");
        box.style.setProperty("margin", "0px 4px", "important");
        box.style.setProperty("height", "fit-content", "important");
        box.setAttribute("draggable", "true");

        box.style.transform = `translateY(${cp.indexInDay * RECORD_HEIGHT + CELL_HEADER_HEIGHT}px)`;
      } else {
        box.style.setProperty("display", "none", "important");
        box.setAttribute("data-filtered", "true");
      }
      return;
    }

    if (isGallery) {
      if (gp) {
        box.style.setProperty("display", "block", "important");
        box.style.setProperty("order", String(gp.order), "important");
        box.setAttribute("draggable", "true");
      } else {
        box.style.setProperty("display", "none", "important");
        box.setAttribute("data-filtered", "true");
      }

      box.style.setProperty("background", "transparent", "important");
      box.style.setProperty("min-height", "fit-content", "important");
      box.style.setProperty("height", "100%", "important");
      box.style.setProperty("margin", "0px", "important");
      return;
    }

    if (isBoard) {
      const bp = recordId ? data?.boardPlacement?.[recordId] : undefined;
      if (bp) {
        box.style.gridColumn = String(bp.col + 1);
        box.style.gridRow = String(bp.row + 2);

        box.setAttribute("data-col-key", bp.columnKey);
        box.setAttribute("draggable", "true");
      } else {
        box.style.setProperty("display", "none", "important");
        box.setAttribute("data-filtered", "true");
      }
      return;
    }

    const index = recordId
      ? (data?.sortedRecordIds?.indexOf(recordId) ?? -1)
      : -1;
    if (index === -1) {
      box.style.setProperty("display", "none", "important");
    } else {
      box.style.gridRow = String(index + 1);
    }
  }, [wrapperEl, isBoard, isGallery, isCalendar, isTimeline, recordId, data]);

  const isTableView = data?.view?.type === "table";
  const [pointerOnCheckbox, setPointerOnCheckbox] = useState(false);
  const showCheckbox =
    isTableView &&
    !!recordId &&
    !!databaseId &&
    !isFilteredOut &&
    (isHovered || isSelected || pointerOnCheckbox);
  const anchor = useRowAnchor(wrapperEl, showCheckbox);

  // ── TIMELINE: render as a bar (own body, own drag/resize) ──────────────
  if (isTimeline && record && data && recordId) {
    const tp = data.timelinePlacement?.[recordId];
    if (!tp) return null;
    const view = data.view as TimelineView;

    return (
      <NodeViewWrapper
        as="div"
        ref={setWrapperEl}
        data-type="database-record"
        data-record-id={recordId}
        style={{ zIndex: 20 }}
      >
        <TimelineCardBody
          record={record}
          view={view}
          geo={{ left: 0, width: tp.width }}
          setCellValue={data.setCellValue}
        />
      </NodeViewWrapper>
    );
  }

  // ── BOARD / Gallery / Calendar: render as a card ──────────────
  if ((isBoard || isGallery || isCalendar) && record && data) {
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
