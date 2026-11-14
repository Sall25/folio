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
  DAY_WIDTH,
  ROW_HEIGHT,
  parseDateValue,
  rowTop,
  type TimelinePlacement,
} from "../../hooks/use-timeline-layout";
import { TimelineCardBody } from "./timeline-card-body";

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
}

function TimelineBarInner({
  record,
  view,
  index,
  placement,
  properties,
  setCellValue,
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
}) {
  const { nodeRef, isResizing } = useResizableNode();

  return (
    <div
      // A ref callback runs after the commit, so assigning here doesn't trip
      // "Cannot access refs during render" (calendar-event-bar.tsx says the
      // same of its own).
      ref={(el) => {
        nodeRef.current = el;
      }}
      className="db-tl-bar-box"
      data-record-id={record.id}
      style={{
        top: rowTop(index),
        left: placement.left,
        // While the handle is being dragged the provider sets the width on
        // this element directly; passing one here would snap it back to the
        // dates on every render until the drag ends.
        width: isResizing ? undefined : placement.width,
        height: ROW_HEIGHT,
      }}
    >
      <TimelineCardBody
        record={record}
        view={view}
        geo={{ left: placement.left, width: placement.width }}
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
}: TimelineBarProps) {
  // This database's gantt, not another one's: a page can hold several, and
  // a bar belongs in the grid of its own.
  const scope = databaseId
    ? document.querySelector<HTMLElement>(`[data-database-id="${databaseId}"]`)
    : null;
  const gantt = (scope ?? document).querySelector<HTMLElement>(
    ".db-tl-gantt__body",
  );
  if (!gantt) return null;

  return createPortal(
    <ResizableNodeProvider
      min={{ width: DAY_WIDTH }}
      onResizeEnd={(dimensions) => {
        const start = parseDateValue(
          record.values?.[view.startDatePropertyId],
        ).start;
        if (!start) return;
        const days = Math.max(1, Math.round(dimensions.width / DAY_WIDTH));
        const end = new Date(start);
        end.setDate(end.getDate() + days - 1);
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
      />
    </ResizableNodeProvider>,
    gantt,
  );
}
