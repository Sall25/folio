import { Plus } from "lucide-react";

import { memo, type CSSProperties } from "react";

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
  return (
    <div
      className={[
        "db-calendar__cell",
        !isCurrentMonth && "db-calendar__cell--outside",
        isToday && "db-calendar__cell--today",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      data-date={isCurrentMonth ? date : undefined}
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
