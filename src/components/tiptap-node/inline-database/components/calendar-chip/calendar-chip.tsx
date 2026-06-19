import { useRef, useState, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { BoardCard } from "../../primitives/board-card";
import type {
  DatabaseProperty,
  DatabaseView,
  CellValue,
  Page,
} from "src/types";
import { Button } from "src/components/tiptap-ui-primitive/button";

// Hover timings — open is slower (avoid flashing on pass-through), close is
// quick but lenient enough to move the pointer into the preview.
const OPEN_DELAY = 350;
const CLOSE_DELAY = 150;

export function CalendarChip({
  record,
  title,
  cardProps,
  sourceId,
  view,
  onOpenPeek,
  onChange,
}: {
  record: Page;
  title: string;
  cardProps: DatabaseProperty[];
  sourceId: string;
  view: DatabaseView;
  onOpenPeek: () => void;
  onChange: (propertyId: string, value: CellValue | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const scheduleOpen = useCallback(() => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), OPEN_DELAY);
  }, [clearTimers]);

  const scheduleClose = useCallback(() => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  }, [clearTimers]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className="db-calendar__record-chip"
          // title={title}
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
          onClick={(e) => {
            // click opens the full page peek; cancel any pending hover-open
            e.stopPropagation();
            clearTimers();
            setOpen(false);
            onOpenPeek();
          }}
          style={{ background: "transparent", padding: "0", margin: "0" }}
        >
          <span className="tiptap-button-text db-calendar__record-chip-text">
            {title || "Untitled"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        // keep the preview open while the pointer is inside it
        onMouseEnter={clearTimers}
        onMouseLeave={scheduleClose}
        style={{ padding: 0, width: 260 }}
      >
        <div
          className="db-calendar__preview"
          onClick={(e) => e.stopPropagation()}
        >
          <BoardCard
            record={record}
            properties={cardProps}
            cardPreview="cover"
            sourceId={sourceId}
            onChange={onChange}
            view={view}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
