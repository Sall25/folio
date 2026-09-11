import { Plus } from "lucide-react";

import { memo, useRef, useState, type CSSProperties } from "react";

import { Button } from "src/components/tiptap-ui-primitive/button";
import { useCalendarViewActions } from "../../context/calendar-view-context";

interface CalendarCellProps {
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  date?: string; // ISO "YYYY-MM-DD" — set for current-month cells, used as the drop target
  style: CSSProperties;
}

function CalendarCellImpl({
  dayNum,
  isCurrentMonth,
  isToday,
  date,
  style,
}: CalendarCellProps) {
  const { addOnDay: onAdd } = useCalendarViewActions();

  // dragenter/dragleave fire on child elements too (day-num span, add
  // button), so a plain boolean would flicker off/on as the pointer crosses
  // those children. A counter that only reaches 0 once every nested
  // enter/leave has balanced out avoids that.
  const dragDepth = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const dragHandlers = isCurrentMonth
    ? {
        onDragEnter: () => {
          dragDepth.current += 1;
          setIsDragOver(true);
        },
        onDragLeave: () => {
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setIsDragOver(false);
          }
        },
        onDrop: () => {
          dragDepth.current = 0;
          setIsDragOver(false);
        },
      }
    : undefined;

  const cellStyle: CSSProperties = isDragOver
    ? { ...style, backgroundColor: "var(--tt-selection-color)" }
    : style;

  return (
    <div
      className={[
        "db-calendar__cell",
        !isCurrentMonth && "db-calendar__cell--outside",
        isToday && "db-calendar__cell--today",
      ]
        .filter(Boolean)
        .join(" ")}
      style={cellStyle}
      data-date={isCurrentMonth ? date : undefined}
      {...dragHandlers}
    >
      {isCurrentMonth && (
        <div className="db-calendar__cell-header">
          <span className="db-calendar__day-num">{dayNum}</span>

          <Button
            type="button"
            variant="ghost"
            className="db-calendar__cell-add"
            onClick={() => onAdd(dayNum)}
          >
            <Plus className="tiptap-button-icon" />
          </Button>
        </div>
      )}
    </div>
  );
}

export const CalendarCell = memo(CalendarCellImpl);
