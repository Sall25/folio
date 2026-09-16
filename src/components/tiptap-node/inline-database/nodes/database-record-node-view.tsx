import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { createPortal } from "react-dom";
import { useDatabaseBridgeData } from "../hooks/use-database-bridge-data";
import { useRecordRowState } from "../utils/record-selection-store";
import { recordSelection } from "../utils/record-selection-store";
import { beginRowDragSelect } from "../utils/row-drag-select";
import { useRowAnchor } from "../hooks/use-row-anchor";
import type {
  CalendarView,
  CellValue,
  DatabaseProperty,
  TimelineView,
} from "src/types";
import { BoardCardBody } from "../primitives/board-card-body";
import {
  DAY_WIDTH,
  parseDateValue,
  ROW_HEIGHT as TL_ROW_HEIGHT,
} from "../hooks/use-timeline-layout";
import { TimelineCardBody } from "./timeline-card-body";
import { CalendarEventBar } from "./database-calendar-node-view/calendar-event-bar";
import { ResizableNodeProvider, useResizableNode } from "../../figure-node";

// Sits inside ResizableNodeProvider so it can consume the ref the provider
// creates internally — that ref has to be attached to the actual DOM box
// being resized (the NodeViewWrapper), which can't happen in the same
// component that renders <ResizableNodeProvider>, since context only flows
// to descendants.
function TimelineRecordBox({
  recordId,
  setWrapperEl,
  children,
  setIsResizing,
}: {
  recordId: string;
  setWrapperEl: (el: HTMLElement | null) => void;
  setIsResizing: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const wrapperEl = useRef<HTMLDivElement | null>(null);
  const { nodeRef, isResizing } = useResizableNode();

  // Assign the actual box on every render (not just mount) — cheap, and
  // guards against wrapperEl.current changing identity.
  useLayoutEffect(() => {
    const box = wrapperEl.current?.closest<HTMLElement>(
      ".react-renderer.node-databaseRecord",
    );
    nodeRef.current = box ?? null;
  });

  // Propagate isResizing to the PARENT's state whenever it actually
  // changes — the previous empty-deps effect only ran once at mount, so
  // the parent's isResizing stayed stuck at its initial `false` forever.
  // That made the "if (!isResizing) set width" guard in the placement
  // effect always true, so it kept stomping the live width the provider's
  // own rAF loop was writing during an actual drag.
  useEffect(() => {
    setIsResizing(isResizing);
  }, [isResizing, setIsResizing]);

  return (
    <NodeViewWrapper
      as="div"
      ref={(el: HTMLDivElement | null) => {
        setWrapperEl(el);
        wrapperEl.current = el;
      }}
      style={{ zIndex: 20 }}
      data-type="database-record"
      data-record-id={recordId}
    >
      {children}
    </NodeViewWrapper>
  );
}

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
  const [isResizing, setIsResizing] = useState(false);

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
    const tp = recordId ? data?.timelinePlacement?.[recordId] : undefined;

    if (isTimeline) {
      const index = recordId
        ? (data?.sortedRecordIds?.indexOf(recordId) ?? -1)
        : -1;
      if (tp && index !== -1) {
        box.style.setProperty("display", "block", "important");
        box.style.setProperty("position", "absolute", "important");
        // Row comes from the overlap-packing pass (tp.row), not list order —
        // two records only share a row when their dates don't overlap.
        box.style.setProperty(
          "top",
          `${tp.row * TL_ROW_HEIGHT}px`,
          "important",
        );
        box.style.setProperty("left", `${tp.left}px`, "important");
        if (!isResizing) {
          box.style.setProperty("width", `${tp.width}px`, "important");
        }
        box.style.setProperty(
          "top",
          `${index === 0 ? TL_ROW_HEIGHT : index * TL_ROW_HEIGHT}px`,
          "important",
        );
        box.style.setProperty("margin", `0px`, "important");
        box.removeAttribute("draggable");
      } else {
        box.style.setProperty("display", "none", "important");
        box.setAttribute("data-filtered", "true");
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
  }, [
    wrapperEl,
    isBoard,
    isGallery,
    isCalendar,
    isTimeline,
    recordId,
    data,
    isResizing,
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

  // ── TIMELINE: render as a bar, resizable to adjust endDate ─────────────
  if (isTimeline && record && data && recordId) {
    const tp = data.timelinePlacement?.[recordId];
    if (!tp) return null;

    const view = data.view as TimelineView;
    const recordStart = parseDateValue(
      view.startDatePropertyId
        ? record.values?.[view.startDatePropertyId]
        : null,
    );

    return (
      <ResizableNodeProvider
        min={{ width: DAY_WIDTH }}
        onResizeEnd={(dimensions) => {
          if (!recordStart.start) return;
          const days = Math.max(1, Math.round(dimensions.width / DAY_WIDTH));
          const newEnd = new Date(recordStart.start);
          newEnd.setDate(newEnd.getDate() + days - 1);

          data.setCellValue(recordId, view.startDatePropertyId, {
            start: recordStart.start.toISOString(),
            end: newEnd.toISOString(),
          });
        }}
      >
        <TimelineRecordBox
          setIsResizing={setIsResizing}
          recordId={recordId}
          setWrapperEl={setWrapperEl}
        >
          <TimelineCardBody
            record={record}
            view={view}
            geo={{ left: tp.left, width: tp.width }}
            setCellValue={data.setCellValue}
            clippedLeft={tp.clippedLeft}
            clippedRight={tp.clippedRight}
            canResize={true}
          />
        </TimelineRecordBox>
      </ResizableNodeProvider>
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
