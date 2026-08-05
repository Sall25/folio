import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { useDataSource } from "../hooks/use-data-source";
import { CalendarChip } from "../components/calendar-chip";
import type {
  CalendarView,
  DatabaseAttrs,
  DataSource,
  DatabaseView,
  ID,
  CellValue,
} from "src/types";
import "./database-calendar-node-view.scss";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// How many chips a day shows before collapsing the rest into "+N more".
const MAX_VISIBLE_PER_DAY = 3;

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

export function DatabaseCalendarNodeViewImpl({
  attrs,
  source,
  onUpdateView,
}: {
  attrs: DatabaseAttrs & { sourceId?: string | null };
  source: DataSource;
  onUpdateView?: (patch: Partial<DatabaseView>) => void;
}) {
  const { setTarget } = usePageView();
  const { resolvedRecords, addRecordAsync, setCellValue } = useDataSource(
    attrs.sourceId,
  );

  const activeView = (attrs.views.find((v) => v.id === attrs.activeViewId) ??
    attrs.views[0]) as CalendarView | undefined;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const dateProp = useMemo(() => {
    if (activeView?.datePropertyId) {
      const explicit = source.properties.find(
        (p) => p.id === activeView.datePropertyId && p.config.type === "date",
      );
      if (explicit) return explicit;
    }
    return source.properties.find((p) => p.config.type === "date");
  }, [source.properties, activeView?.datePropertyId]);

  const cardProps = useMemo(() => {
    const hidden = new Set(activeView?.hiddenProperties ?? []);
    return source.properties.filter(
      (p) => !hidden.has(p.id) && p.id !== dateProp?.id,
    );
  }, [source.properties, activeView?.hiddenProperties, dateProp?.id]);

  useEffect(() => {
    if (!activeView || !onUpdateView) return;
    if (activeView.datePropertyId) return;
    if (dateProp) onUpdateView({ datePropertyId: dateProp.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView?.id, dateProp?.id]);

  function prevMonth() {
    setExpandedDay(null);
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    setExpandedDay(null);
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }
  function goToday() {
    setExpandedDay(null);
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  const recordsByDay = useMemo<Record<number, ID[]>>(() => {
    if (!dateProp) return {};
    const map: Record<number, ID[]> = {};
    for (const rec of resolvedRecords) {
      const iso = rec.values?.[dateProp.id] as string | null | undefined;
      if (!iso) continue;
      const parsed = isoToMonthDay(iso);
      if (!parsed || parsed.year !== year || parsed.month !== month) continue;
      map[parsed.day] = [...(map[parsed.day] ?? []), rec.id];
    }
    return map;
  }, [resolvedRecords, dateProp, year, month]);

  if (!dateProp) {
    return (
      <div className="db-calendar-empty">
        <p>Add a Date property to use the calendar view.</p>
      </div>
    );
  }

  const monthLabel = new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  async function addOnDay(dayNum: number) {
    const row = await addRecordAsync({ title: "" });
    if (dateProp) {
      const iso = new Date(year, month, dayNum).toISOString();
      setCellValue(row.id, dateProp.id, iso);
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

          const dayRecords = isCurrentMonth ? (recordsByDay[dayNum] ?? []) : [];
          const isExpanded = expandedDay === dayNum;
          const visible = isExpanded
            ? dayRecords
            : dayRecords.slice(0, MAX_VISIBLE_PER_DAY);
          const overflow = dayRecords.length - visible.length;

          return (
            <div
              key={i}
              className={[
                "db-calendar__cell",
                !isCurrentMonth && "db-calendar__cell--outside",
                isToday && "db-calendar__cell--today",
                isExpanded && "db-calendar__cell--expanded",
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
                    {visible.map((id) => {
                      const rec = resolvedRecords.find((r) => r.id === id);
                      if (!rec) return null;
                      // Title lives on page.title, not values[titlePropId]
                      // (which is null) — the recurring source-of-truth fix.
                      const title = rec.title?.trim() || "Untitled";
                      return (
                        <CalendarChip
                          key={id}
                          record={rec}
                          title={title}
                          cardProps={cardProps}
                          sourceId={attrs.sourceId!}
                          view={activeView as DatabaseView}
                          onOpenPeek={() =>
                            setTarget({ pageId: rec.id, view: "Peek" })
                          }
                          onChange={(propId, v) =>
                            setCellValue(rec.id, propId, v as CellValue | null)
                          }
                        />
                      );
                    })}

                    {overflow > 0 && (
                      <button
                        className="db-calendar__more"
                        onClick={() => setExpandedDay(dayNum)}
                      >
                        +{overflow} more
                      </button>
                    )}
                    {isExpanded && dayRecords.length > MAX_VISIBLE_PER_DAY && (
                      <button
                        className="db-calendar__more"
                        onClick={() => setExpandedDay(null)}
                      >
                        Show less
                      </button>
                    )}
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

export const DatabaseCalendarNodeView = memo(DatabaseCalendarNodeViewImpl);
