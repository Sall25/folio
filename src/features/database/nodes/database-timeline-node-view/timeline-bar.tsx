import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type {
  CellValue,
  DatabaseProperty,
  Page,
  TimelineView,
} from "src/types";
import { cardProperties } from "../../utils/card-properties";
import {
  ResizableNodeProvider,
  useResizableNode,
} from "src/components/tiptap-node/resizable-node";
import {
  barCaughtUp,
  cellWidthFor,
  endForGrains,
  holdBar,
  type HeldBar,
  grainWidth,
  MIN_BAR_WIDTH,
  dropBeforeId,
  shiftDate,
  unitFor,
  ROW_HEIGHT,
  type CellUnit,
  parseDateValue,
  rowTop,
  type TimelinePlacement,
} from "../../hooks/use-timeline-layout";
import { recordSelection } from "../../utils/record-selection-store";
import { TimelineCardBody } from "./timeline-card-body";
import { useTimelineBarDrag, type BarDragState } from "./use-timeline-bar-drag";

// A record's bar, put into the gantt from outside it.
//
// The record's own DOM is its row in the table beside the grid — that is what
// makes it a table row like any other: the editor's drag handle finds it, its
// cells are the same cells, and reordering goes through the same path (see
// board-drag.ts/rowDropTarget, which measures .db-record boxes). A node can
// only render its DOM in one place, so the bar is portalled into the gantt
// body instead, on the line its row sits on.
//
// The same shape as the calendar's bar (calendar-event-bar.tsx), for the same
// reason: a record there also shows somewhere its node does not live.

interface TimelineBarProps {
  record: Page;
  view: TimelineView;
  recordId: string;
  /** The record's place in the view's order: its line in both panels. */
  index: number;
  placement: TimelinePlacement;
  databaseId: string | null;
  properties: DatabaseProperty[];
  setCellValue: (
    recordId: string,
    propertyId: string,
    value: CellValue,
  ) => void;
  /** The view's order, to move this record within it. */
  sortedRecordIds: string[];
  /** Puts this record in front of another, or last with null. */
  reorderRecord?: (recordId: string, beforeRecordId: string | null) => void;
}

function TimelineBarInner({
  record,
  view,
  index,
  placement,
  properties,
  setCellValue,
  unit,
  cellWidth,
  rowCount,
  onDrop,
  held,
}: {
  record: Page;
  view: TimelineView;
  index: number;
  placement: TimelinePlacement;
  properties: DatabaseProperty[];
  setCellValue: (
    recordId: string,
    propertyId: string,
    value: CellValue,
  ) => void;
  unit: CellUnit;
  cellWidth: number;
  rowCount: number;
  onDrop: (state: BarDragState) => void;
  /** Where the last drop put it, until the dates catch up. */
  held: HeldBar | null;
}) {
  const { nodeRef, isResizing } = useResizableNode();
  const { drag, isDragging, handlers } = useTimelineBarDrag({
    index,
    rowCount,
    cellWidth,
    unit,
    disabled: isResizing,
    onDrop,
  });

  // The row in the table beside the grid is the same record: it shows what
  // is happening to it here, the way a selected row does. Published rather
  // than passed down — the row is rendered by the record's own node, which
  // this bar is portalled out of.
  const adjusting = isDragging || isResizing;
  useEffect(() => {
    if (!adjusting) return;
    recordSelection.setAdjusting(record.id);
    return () => recordSelection.setAdjusting(null);
  }, [adjusting, record.id]);

  return (
    <div
      {...handlers}
      // A ref callback runs after the commit, so assigning here doesn't trip
      // "Cannot access refs during render" (calendar-event-bar.tsx says the
      // same of its own).
      ref={(el) => {
        nodeRef.current = el;
      }}
      className="db-tl-bar-box"
      data-record-id={record.id}
      data-dragging={isDragging || undefined}
      data-resizing={isResizing || undefined}
      style={{
        top: held ? held.top : rowTop(index),
        left: held ? held.left : placement.left,
        // Where the card would land, while the pointer is still down.
        // A transform, so the drag costs no layout and the card it is
        // standing in for stays where it is until the drop commits.
        transform: drag
          ? `translate(${drag.columns * cellWidth}px, ${drag.rows * ROW_HEIGHT}px)`
          : undefined,
        // While the handle is being dragged the provider sets the width on
        // this element directly; passing one here would snap it back to the
        // dates on every render until the drag ends.
        width: isResizing ? undefined : (held?.width ?? placement.width),
        height: ROW_HEIGHT,
      }}
    >
      <TimelineCardBody
        record={record}
        view={view}
        geo={{
          left: held ? held.left : placement.left,
          width: held ? held.width : placement.width,
        }}
        setCellValue={setCellValue}
        clippedLeft={placement.clippedLeft}
        clippedRight={placement.clippedRight}
        canResize
        otherProps={cardProperties(properties, record, view)}
        properties={properties}
      />
    </div>
  );
}

export function TimelineBar({
  record,
  view,
  recordId,
  index,
  placement,
  databaseId,
  properties,
  setCellValue,
  sortedRecordIds,
  reorderRecord,
}: TimelineBarProps) {
  // A drop writes dates, and a bar is placed from its dates, so between the
  // two it would spring back to where it started — the drop undone for as
  // long as the write takes, then a jump when it lands. It stays where it
  // was put instead, and the hold ends by itself the moment the view places
  // it anywhere new (barCaughtUp), which needs no state of its own.
  const liveLeft = placement.left;
  const liveWidth = placement.width;
  const liveTop = rowTop(index);
  const live = { left: liveLeft, width: liveWidth, top: liveTop };
  const [held, setHeld] = useState<HeldBar | null>(null);
  const holding = held && !barCaughtUp(held, live) ? held : null;
  /** The box on screen: what a fresh gesture starts from. */
  const shown = holding ?? live;

  // And a stop, in case nothing ever comes back: a bar that waits forever
  // for a write that failed is worse than one that snaps back to its dates.
  useEffect(() => {
    if (!held) return;
    const letGo = setTimeout(() => setHeld(null), 2000);
    return () => clearTimeout(letGo);
  }, [held]);

  // This database's gantt, not another one's: a page can hold several, and
  // a bar belongs in the grid of its own.
  const scope = databaseId
    ? document.querySelector<HTMLElement>(`[data-database-id="${databaseId}"]`)
    : null;
  const gantt = (scope ?? document).querySelector<HTMLElement>(
    ".db-tl-gantt__body",
  );
  if (!gantt) return null;

  // A column is an hour in the Day timeframe and a day everywhere else, so
  // dragging the handle out by one is an hour there and a day here.
  const cell = cellWidthFor(view.timeframe);
  const unit = unitFor(view.timeframe);
  // A handle moves by the grid's grain, so that is as small as a bar goes:
  // a column would have made a week the shortest a record could be in a
  // quarter. Never below the floor every bar is drawn with.
  const grain = grainWidth(unit, cell);

  return createPortal(
    <ResizableNodeProvider
      min={{ width: Math.max(MIN_BAR_WIDTH, grain) }}
      onResizeEnd={(dimensions) => {
        const start = parseDateValue(
          record.values?.[view.startDatePropertyId],
        ).start;
        if (!start) return;
        // The last day the handle was dragged over — strictly, the last
        // grain the handle was dragged over — an hour in Day, a day in
        // every other timeframe, a week column being seven of them.
        const end = endForGrains(start, unit, dimensions.width / grain);
        // Drawn at the width it was dragged to, snapped the way the dates
        // were, rather than at the width the old dates still give.
        setHeld(
          holdBar(live, {
            left: shown.left,
            top: shown.top,
            width: Math.max(1, Math.round(dimensions.width / grain)) * grain,
          }),
        );
        setCellValue(recordId, view.startDatePropertyId, {
          start: start.toISOString(),
          end: end.toISOString(),
        });
      }}
    >
      <TimelineBarInner
        record={record}
        view={view}
        index={index}
        placement={placement}
        properties={properties}
        setCellValue={setCellValue}
        unit={unit}
        cellWidth={cell}
        rowCount={sortedRecordIds.length}
        held={holding}
        onDrop={({ columns, rows }) => {
          setHeld(
            holdBar(live, {
              left: shown.left + columns * cell,
              width: shown.width,
              top: rowTop(index + rows),
            }),
          );
          // Sideways: the dates move together, so the card keeps its
          // length and only its place in time changes.
          if (columns !== 0) {
            const { start, end } = parseDateValue(
              record.values?.[view.startDatePropertyId],
            );
            if (start) {
              const moved = shiftDate(start, unit, columns);
              setCellValue(recordId, view.startDatePropertyId, {
                start: moved.toISOString(),
                end: (end
                  ? shiftDate(end, unit, columns)
                  : moved
                ).toISOString(),
              });
            }
          }
          // Up or down: the row moves, through the same path the drag
          // handle on the table beside the grid uses.
          if (rows !== 0) {
            reorderRecord?.(
              recordId,
              dropBeforeId(sortedRecordIds, index, index + rows),
            );
          }
        }}
      />
    </ResizableNodeProvider>,
    gantt,
  );
}
