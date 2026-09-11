import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  useCalendarViewActions,
  useCalendarViewState,
} from "../../context/calendar-view-context";
import { memo } from "react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";

function CalendarNavImpl() {
  const { prevMonth, nextMonth, goToday } = useCalendarViewActions();
  const { year, month } = useCalendarViewState();
  const monthLabel = new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <CardItemGroup orientation="horizontal" className="db-calendar__nav">
      <Button
        size="large"
        className="month-label"
        variant="ghost"
        data-highlighted={true}
      >
        <span className="tiptap-button-text">{monthLabel}</span>
      </Button>
      <Spacer orientation="horizontal" />
      <Button
        variant="ghost"
        onClick={prevMonth}
        className="db-calendar__nav-btn"
      >
        <ChevronLeft className="tiptap-button-icon" />
      </Button>
      <Button
        variant="ghost"
        size="large"
        className="db-calendar__month-label"
        data-highlighted={true}
        onClick={goToday}
      >
        <span className="tiptap-button-text">Today</span>
      </Button>
      <Button
        variant="ghost"
        onClick={nextMonth}
        className="db-calendar__nav-btn"
      >
        <ChevronRight className="tiptap-button-icon" />
      </Button>
    </CardItemGroup>
  );
}

export const CalendarNav = memo(CalendarNavImpl);
