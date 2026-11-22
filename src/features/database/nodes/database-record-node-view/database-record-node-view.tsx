import { useLayoutEffect, useMemo, useState } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { createPortal } from "react-dom";
import { useDatabaseBridgeData } from "../../hooks/use-database-bridge-data";
import { useRecordRowState } from "../../utils/record-selection-store";
import { recordSelection } from "../../utils/record-selection-store";
import { beginRowDragSelect } from "../../utils/row-drag-select";
import { useRowAnchor } from "../../hooks/use-row-anchor";
import {
  observeRecord,
  showsRecordsAsRows,
} from "../../utils/record-visibility";
import type { CalendarView, TimelineView } from "src/types";
import { BoardCardBody } from "../../primitives/board-card-body";
import { cardProperties } from "../../utils/card-properties";
import { TimelineBar } from "../database-timeline-node-view/timeline-bar";
import { CalendarEventBar } from "../database-calendar-node-view/calendar-event-bar";

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
  const { isSelected, isHovered, isAdjusting } = useRecordRowState(
    databaseId,
    recordId,
  );
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

    if (isTimeline) {
      // The row is an ordinary table row now: it flows in the panel beside
      // the grid, and its bar is portalled onto the same line from
      // timeline-bar.tsx.
      const index = recordId
        ? (data?.sortedRecordIds?.indexOf(recordId) ?? -1)
        : -1;
      if (index === -1) {
        box.style.setProperty("display", "none", "important");
        box.setAttribute("data-filtered", "true");
      } else {
        box.style.removeProperty("display");
        box.removeAttribute("data-filtered");
        // Row 1 is the column header, which the panel keeps inside its own
        // grid as a subgrid (the table view puts its ungrouped header above
        // the grid instead, which is why its records start at row 1). The
        // row has to be set, not left to auto-placement: a record with no
        // inline grid-row is display:none by rule, so a timeline row with
        // none was a row that never appeared (database-table-body.scss).
        box.style.gridRow = String(index + 2);
      }
      return;
    }

    if (isCalendar) {
      // Calendar no longer places a single card in a single cell — a record
      // can now render N segments (one bar per week it spans), rendered by
      // CalendarEventBar via createPortal into .db-calendar__grid, which has
      // the actual 7-column CSS grid CalendarCell already places into. The
      // wrapper itself carries no visual content and no grid placement; it
      // just needs to stay mounted (invisible) so this component keeps
      // rendering and portaling the bars below.
      box.style.setProperty("display", "none", "important");
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

  // Conditional color: the row's colour, on the record's box (table and list
  // rows, board and gallery cards, timeline bars); calendar bars get it below.
  const rowColor = recordId ? data?.recordColors?.[recordId]?.row : undefined;
  useLayoutEffect(() => {
    const box = wrapperEl?.closest<HTMLElement>(
      ".react-renderer.node-databaseRecord",
    );
    if (!box) return;
    if (rowColor) {
      box.setAttribute("data-cc", rowColor);
      box.style.setProperty(
        "--cc-accent",
        `var(--tt-color-accent-${rowColor})`,
      );
    } else {
      box.removeAttribute("data-cc");
      box.style.removeProperty("--cc-accent");
    }
  }, [
    wrapperEl,
    isBoard,
    isGallery,
    isCalendar,
    isTimeline,
    recordId,
    data,
    rowColor,
  ]);

  const isTableView = data?.view?.type === "table";
  const [pointerOnCheckbox, setPointerOnCheckbox] = useState(false);
  const showCheckbox =
    isTableView &&
    !!recordId &&
    !!databaseId &&
    !isFilteredOut &&
    (isHovered || isSelected || pointerOnCheckbox);
  const anchor = useRowAnchor(wrapperEl, showCheckbox);

  // Table, list and timeline rows: report when the row comes near the
  // screen, so its cells render their content only then
  // (utils/record-visibility.ts). The row's box is the renderer element —
  // .db-record itself is display: contents there and has no box to watch.
  //
  // The timeline's rows belong here too. A cell that is never told its row
  // is near renders the empty placeholder for good, which is why the panel
  // beside the grid showed rows with no name in them: the cells were
  // mounted and waiting for a signal nothing was sending.
  const isRowView = showsRecordsAsRows(data?.view?.type);
  useLayoutEffect(() => {
    if (!isRowView || !wrapperEl || !databaseId || !recordId) return;
    const box =
      wrapperEl.closest(".react-renderer.node-databaseRecord") ?? wrapperEl;
    return observeRecord(box, databaseId, recordId);
  }, [isRowView, wrapperEl, databaseId, recordId]);

  // ── TIMELINE: an ordinary row here, a bar over in the gantt ────────────
  if (isTimeline && record && data && recordId) {
    const view = data.view as TimelineView;
    const index = data.sortedRecordIds?.indexOf(recordId) ?? -1;
    if (index === -1) return null;
    const tp = data.timelinePlacement?.[recordId];

    return (
      <>
        <NodeViewWrapper
          as="div"
          ref={setWrapperEl}
          data-type="database-record"
          data-record-id={recordId}
          data-selected={isSelected || undefined}
          data-hovered={isHovered || undefined}
          // Its bar is being dragged or resized over in the gantt: the row
          // is the same record, and shows it the way a selected one does.
          data-adjusting={isAdjusting || undefined}
          className="db-record"
          style={{ position: "relative" }}
        >
          <NodeViewContent as="div" className="db-record__cells" />
        </NodeViewWrapper>

        {/* No bar when the record's dates fall outside the months on show:
            the row stays, so the name is still there to scroll to. */}
        {tp && (
          <TimelineBar
            record={record}
            view={view}
            recordId={recordId}
            index={index}
            placement={tp}
            sortedRecordIds={data.sortedRecordIds ?? []}
            reorderRecord={data.reorderRecord}
            databaseId={databaseId ?? null}
            properties={data.properties}
            setCellValue={data.setCellValue}
          />
        )}
      </>
    );
  }

  // ── CALENDAR: portal one bar per week segment ───────────────────────────
  if (isCalendar && record && data && recordId) {
    const segments = data.calendarPlacement?.[recordId];
    if (!segments || segments.length === 0) return null;
    const view = data.view as CalendarView;

    return (
      <>
        <NodeViewWrapper
          as="div"
          ref={setWrapperEl}
          data-type="database-record"
          data-record-id={recordId}
          style={{ display: "none" }}
        />
        {segments.map((segment, i) => (
          <CalendarEventBar
            key={i}
            record={record}
            view={view}
            segment={segment}
            recordId={recordId}
            editor={editor ?? null}
            setCellValue={data.setCellValue}
            color={rowColor}
          />
        ))}
      </>
    );
  }

  // ── BOARD / Gallery: render as a card ──────────────
  if ((isBoard || isGallery) && record && data) {
    const properties = data.properties;
    const view = data.view!;
    const cardPreview =
      (view as { cardPreview?: "none" | "cover" | "content" }).cardPreview ??
      "none";
    const titleProp =
      data.properties.find((p) => p.config.type === "title") ?? null;
    const otherProps = cardProperties(data.properties, record, view);

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
          subItemCount={
            recordId ? (data.subItems?.[recordId]?.childCount ?? 0) : 0
          }
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
