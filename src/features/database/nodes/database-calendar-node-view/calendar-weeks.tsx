import { memo } from "react";
import { useTranslation } from "react-i18next";

function CalendarWeeksImpl() {
  const { i18n } = useTranslation();

  const weekdays = Array.from({ length: 7 }, (_, i) => {
    // January 4, 2026 is a Sunday
    const date = new Date(2026, 0, 4 + i);

    return new Intl.DateTimeFormat(i18n.resolvedLanguage, {
      weekday: "short",
    }).format(date);
  });

  return (
    <div className="db-calendar__weekdays">
      {weekdays.map((day, index) => (
        <div key={index} className="db-calendar__weekday">
          {day}
        </div>
      ))}
    </div>
  );
}

export const CalendarWeeks = memo(CalendarWeeksImpl);
