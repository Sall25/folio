import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  useCalendarViewActions,
  useCalendarViewState,
} from "../../context/calendar-view-context";
import { memo } from "react";

function CalendarNavImpl() {
  const { prevMonth, nextMonth, goToday } = useCalendarViewActions();
  const { year, month } = useCalendarViewState();
  const monthLabel = new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="db-calendar__nav">
      <Button
        variant="ghost"
        onClick={prevMonth}
        className="db-calendar__nav-btn"
      >
        <ChevronLeft className="tiptap-button-icon" />
      </Button>
      <button className="db-calendar__month-label" onClick={goToday}>
        {monthLabel}
      </button>
      <Button
        variant="ghost"
        onClick={nextMonth}
        className="db-calendar__nav-btn"
      >
        <ChevronRight className="tiptap-button-icon" />
      </Button>
    </div>
  );
}

export const CalendarNav = memo(CalendarNavImpl);
