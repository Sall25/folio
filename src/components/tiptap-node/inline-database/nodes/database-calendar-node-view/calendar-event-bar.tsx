import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import {
  CELL_HEADER_HEIGHT,
  RECORD_HEIGHT,
  type CalendarSegment,
} from "../../hooks/use-calendar-layout";
import type { CalendarView, Page } from "src/types";
import type { DragStorage } from "../../extensions";
import "./calendar-event-bar.scss";

interface CalendarEventBarProps {
  record: Page;
  view: CalendarView;
  segment: CalendarSegment;
  recordId: string;
  editor: Editor | null;
}

export function CalendarEventBar({
  record,
  view,
  segment,
  recordId,
  editor,
}: CalendarEventBarProps) {
  const { setTarget } = usePageView();
  const grid = document.querySelector(".db-calendar__grid");
  if (!grid) return null;

  const onOpenRecord = () => {
    if (view.openPageIn === "Center") {
      setTarget({ pageId: recordId, view: "Center" });
    } else if (view.openPageIn === "Side") {
      setTarget({ pageId: recordId, view: "Peek" });
    } else {
      setTarget({ pageId: recordId, view: "Full" });
    }
  };

  return createPortal(
    <div
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
    </div>,
    grid,
  );
}
