import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { usePeekPage } from "src/components/tiptap-templates/simple/context/peek-page-context";
import { useDataSource } from "../hooks/use-data-source";
import type {
  CalendarView,
  DatabaseAttrs,
  DataSource,
  ID,
} from "../types/types";
import "./database-calendar-node-view.scss";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function isoToMonthDay(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

export function DatabaseCalendarNodeView({
  attrs,
  source,
}: {
  attrs: DatabaseAttrs & { sourceId?: string | null };
  source: DataSource;
}) {
  const { addPageAsync } = usePages();
  const { setPeekPageId } = usePeekPage();
  const { addRecordWithPageAsync, setCellValue } = useDataSource(
    attrs.sourceId,
  );
  const recordParentId = source.pageId ?? null;

  const activeView = (attrs.views.find((v) => v.id === attrs.activeViewId) ??
    attrs.views[0]) as CalendarView | undefined;
  const datePropertyId = activeView?.datePropertyId ?? "";

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const dateProp = source.properties.find(
    (p) => p.id === datePropertyId && p.config.type === "date",
  );
  const titleProp = source.properties.find((p) => p.config.type === "title");

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  // Bucket records by day-of-month, reading straight from the registry
  const recordsByDay = useMemo<
    Record<number, Array<{ id: ID; title: string }>>
  >(() => {
    if (!dateProp) return {};
    const map: Record<number, Array<{ id: ID; title: string }>> = {};
    for (const rec of source.records) {
      const iso = rec.values[dateProp.id] as string | null | undefined;
      if (!iso) continue;
      const parsed = isoToMonthDay(iso);
      if (!parsed || parsed.year !== year || parsed.month !== month) continue;
      const title =
        (titleProp && (rec.values[titleProp.id] as string)) || "Untitled";
      map[parsed.day] = [...(map[parsed.day] ?? []), { id: rec.id, title }];
    }
    return map;
  }, [source.records, dateProp, titleProp, year, month]);

  if (!dateProp) {
    return (
      <div className="db-calendar-empty">
        <p>
          Add a Date property and select it in the calendar settings to use this
          view.
        </p>
      </div>
    );
  }

  const monthLabel = new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  async function addOnDay(dayNum: number) {
    const rec = await addRecordWithPageAsync({
      title: "",
      parentPageId: recordParentId,
      createPage: addPageAsync,
    });
    if (dateProp) {
      const iso = new Date(year, month, dayNum).toISOString();
      setCellValue(rec.id, dateProp.id, iso);
    }
  }

  return (
    <div className="db-calendar" data-type="database-calendar">
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

      <div className="db-calendar__weekdays">
        {WEEKDAYS.map((d) => (
          <div key={d} className="db-calendar__weekday">
            {d}
          </div>
        ))}
      </div>

      <div className="db-calendar__grid">
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - firstDow + 1;
          const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
          const isToday =
            isCurrentMonth &&
            dayNum === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          return (
            <div
              key={i}
              className={[
                "db-calendar__cell",
                !isCurrentMonth && "db-calendar__cell--outside",
                isToday && "db-calendar__cell--today",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isCurrentMonth && (
                <>
                  <div className="db-calendar__cell-header">
                    <span className="db-calendar__day-num">{dayNum}</span>
                    <Button
                      variant="ghost"
                      className="db-calendar__cell-add"
                      onClick={() => addOnDay(dayNum)}
                    >
                      <Plus className="tiptap-button-icon" />
                    </Button>
                  </div>

                  <div className="db-calendar__cell-records">
                    {(recordsByDay[dayNum] ?? []).map(({ id, title }) => {
                      const rec = source.records.find((r) => r.id === id);
                      return (
                        <button
                          key={id}
                          className="db-calendar__record-chip"
                          onClick={() =>
                            rec?.pageId != null && setPeekPageId(rec.pageId)
                          }
                        >
                          {title || "Untitled"}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
