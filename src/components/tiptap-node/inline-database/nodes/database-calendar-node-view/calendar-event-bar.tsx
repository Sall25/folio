import { useRef } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import type { CalendarSegment } from "../../hooks/use-calendar-layout";
import {
  CELL_HEADER_HEIGHT,
  RECORD_HEIGHT,
} from "../../hooks/use-calendar-layout";
import { parseDateValue } from "../../hooks/use-timeline-layout";
import type { CalendarView, CellValue, Page } from "src/types";
import type { DragStorage } from "../../extensions";
import {
  ResizableNodeProvider,
  useResizableNode,
} from "src/components/tiptap-node/figure-node";
import "./calendar-event-bar.scss";

interface CalendarEventBarProps {
  record: Page;
  view: CalendarView;
  segment: CalendarSegment;
  recordId: string;
  editor: Editor | null;
  setCellValue: (
    recordId: string,
    propertyId: string,
    value: CellValue,
  ) => void;
}

// Rendered INSIDE ResizableNodeProvider, so it's the only place that can
// actually call useResizableNode() and get a real handleResizeStart — the
// previous bug was building this JSX in the parent (outside the provider),
// where handleResizeStart was unreachable and the handle's onMouseDown never
// started a resize at all.
function CalendarBarInner({
  record,
  view,
  segment,
  recordId,
  editor,
  canResizeRight,
  colWidthPxRef,
  resizeIntentRef,
}: {
  record: Page;
  view: CalendarView;
  segment: CalendarSegment;
  recordId: string;
  editor: Editor | null;
  canResizeRight: boolean;
  colWidthPxRef: React.RefObject<number>;
  resizeIntentRef: React.RefObject<boolean>;
}) {
  const { setTarget } = usePageView();
  const { nodeRef, handleResizeStart, isResizing, activeHandle } =
    useResizableNode();

  const onOpenRecord = () => {
    if (view.openPageIn === "Center") {
      setTarget({ pageId: recordId, view: "Center" });
    } else if (view.openPageIn === "Side") {
      setTarget({ pageId: recordId, view: "Peek" });
    } else {
      setTarget({ pageId: recordId, view: "Full" });
    }
  };

  function startResizeIntent() {
    resizeIntentRef.current = true;
    const clear = () => {
      resizeIntentRef.current = false;
      window.removeEventListener("mouseup", clear);
      window.removeEventListener("touchend", clear);
    };
    window.addEventListener("mouseup", clear);
    window.addEventListener("touchend", clear);
  }

  return (
    <div
      // Ref callback — runs as a commit-phase side effect, not during
      // render, so assigning to nodeRef.current here directly (unlike a
      // plain `nodeRef.current = el` in the component body) doesn't trigger
      // the "Cannot access refs during render" warning.
      ref={(el) => {
        nodeRef.current = el;
      }}
      className="db-cal-bar"
      data-record-id={recordId}
      draggable
      style={{
        gridColumn: `${segment.colStart + 1} / span ${segment.colSpan}`,
        gridRow: segment.row + 1,
        transform: `translateY(${segment.track * RECORD_HEIGHT + CELL_HEADER_HEIGHT}px)`,
      }}
      onClick={onOpenRecord}
      onDragStart={(event) => {
        if (resizeIntentRef.current) {
          event.preventDefault();
          return;
        }
        if (!editor) return;
        const storage = editor.storage.boardDrag as DragStorage;
        // eslint-disable-next-line react-hooks/immutability
        storage.draggingId = recordId;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", recordId);
      }}
      onDragEnd={() => {
        if (!editor) return;
        const storage = editor.storage.boardDrag as DragStorage;
        // eslint-disable-next-line react-hooks/immutability
        storage.draggingId = null;
      }}
    >
      {segment.continuesBefore && (
        <span
          className="db-cal-bar__continue db-cal-bar__continue--left"
          aria-hidden
        />
      )}
      <span className="db-cal-bar__icon">
        <DynamicIcon name={record.cover?.iconName ?? undefined} size={13} />
      </span>
      <span className="db-cal-bar__title">{record.title}</span>
      {segment.continuesAfter && (
        <span
          className="db-cal-bar__continue db-cal-bar__continue--right"
          aria-hidden
        />
      )}

      {canResizeRight && (
        <span
          className={
            "db-cal-bar__resize-handle" +
            (isResizing && activeHandle === "right"
              ? " db-cal-bar__resize-handle--active"
              : "")
          }
          onMouseDown={(e) => {
            e.stopPropagation();
            startResizeIntent();
            colWidthPxRef.current =
              (nodeRef.current?.offsetWidth ?? 0) / segment.colSpan || 1;
            handleResizeStart?.(e, "right");
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            startResizeIntent();
            colWidthPxRef.current =
              (nodeRef.current?.offsetWidth ?? 0) / segment.colSpan || 1;
            handleResizeStart?.(e, "right");
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}

export function CalendarEventBar({
  record,
  view,
  segment,
  recordId,
  editor,
  setCellValue,
}: CalendarEventBarProps) {
  const colWidthPxRef = useRef(0);
  const resizeIntentRef = useRef(false);

  const grid = document.querySelector(".db-calendar__grid");
  if (!grid) return null;

  const canResizeRight = !segment.continuesAfter && !!view.datePropertyId;

  return createPortal(
    <ResizableNodeProvider
      min={{ width: 20 }}
      onResizeEnd={(dimensions) => {
        const colWidthPx = colWidthPxRef.current || 1;
        const newColSpan = Math.max(
          1,
          Math.round(dimensions.width / colWidthPx),
        );
        const deltaDays = newColSpan - segment.colSpan;
        if (deltaDays === 0 || !view.datePropertyId) return;

        const dateValue = parseDateValue(record.values?.[view.datePropertyId]);
        if (!dateValue.start) return;

        const start = dateValue.start;
        const end = dateValue.end ?? dateValue.start;
        const newEnd = new Date(end);
        newEnd.setDate(newEnd.getDate() + deltaDays);

        if (newEnd < start) return;

        setCellValue(recordId, view.datePropertyId, {
          start: start.toISOString(),
          end: newEnd.toISOString(),
        });
      }}
    >
      <CalendarBarInner
        record={record}
        view={view}
        segment={segment}
        recordId={recordId}
        editor={editor}
        canResizeRight={canResizeRight}
        colWidthPxRef={colWidthPxRef}
        resizeIntentRef={resizeIntentRef}
      />
    </ResizableNodeProvider>,
    grid,
  );
}
