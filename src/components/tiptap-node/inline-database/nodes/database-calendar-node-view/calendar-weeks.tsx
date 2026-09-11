import { memo } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarWeeksImpl() {
  return (
    <div className="db-calendar__weekdays">
      {WEEKDAYS.map((d) => (
        <div key={d} className="db-calendar__weekday" data-type={d}>
          {d}
        </div>
      ))}
    </div>
  );
}

export const CalendarWeeks = memo(CalendarWeeksImpl);
