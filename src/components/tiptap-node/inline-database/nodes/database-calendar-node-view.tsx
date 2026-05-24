import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { DatabaseToolbar } from "../components/database-toolbar";
import { useDatabase } from "../hooks/use-database";
import { DatabaseProvider } from "./database-provider";
import type { CalendarView, DatabaseAttrs } from "../types/types";
import "./database-calendar-node-view.scss";

// ── Helpers ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isoToMonthDay(
  iso: string,
): { year: number; month: number; day: number } | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

// ── Main component ───────────────────────────────────────────────────────────

export function DatabaseCalendarNodeView({
  node,
  editor,
  updateAttributes,
}: NodeViewProps) {
  const attrs = node.attrs as DatabaseAttrs;
  const onUpdateTitle = (title: string) =>
    updateAttributes({ ...attrs, title });
  const db = useDatabase(attrs, editor, onUpdateTitle);

  const activeView = db.activeView as CalendarView | undefined;
  const datePropertyId = activeView?.datePropertyId ?? "";

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const dateProp = attrs.properties.find(
    (p) => p.id === datePropertyId && p.config.type === "date",
  );

  // ── Navigation ───────────────────────────────────────────────────────────

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

  // ── Build calendar grid ───────────────────────────────────────────────────

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  // Total cells: pad to full weeks
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  // ── Bucket records by day ─────────────────────────────────────────────────

  // ── Bucket records by day ─────────────────────────────────────────────────

  const recordsByDay = useMemo<
    Record<number, Array<{ id: string; title: string }>>
  >(() => {
    if (!dateProp) return {};
    const titleProp = attrs.properties.find((p) => p.config.type === "title");
    const map: Record<number, Array<{ id: string; title: string }>> = {};

    editor.state.doc.descendants((n) => {
      if (n.type.name !== "database" || n.attrs.id !== attrs.id) return true;

      n.descendants((child) => {
        if (child.type.name !== "databaseRecord") return true;
        const recordId = child.attrs.id as string;
        let dateIso: string | null = null;
        let title = "Untitled";

        child.descendants((cell) => {
          // Date cell
          if (
            cell.type.name === "dateCell" &&
            (cell.attrs.propertyId as string) === datePropertyId
          ) {
            dateIso = (cell.attrs.value as string | null) ?? null;
          }
          // Title cell — grab its text content
          if (
            titleProp &&
            cell.type.name === "titleCell" &&
            (cell.attrs.propertyId as string) === titleProp.id
          ) {
            const text = cell.textContent.trim();
            if (text) title = text;
          }
        });

        if (!dateIso) return;
        const parsed = isoToMonthDay(dateIso);
        if (!parsed || parsed.year !== year || parsed.month !== month) return;

        map[parsed.day] = [...(map[parsed.day] ?? []), { id: recordId, title }];
      });

      return false; // stop descending past the database node
    });

    return map;
  }, [
    editor.state.doc,
    attrs.id,
    datePropertyId,
    dateProp,
    year,
    month,
    attrs.properties,
  ]);

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!dateProp) {
    return (
      <NodeViewWrapper>
        <DatabaseProvider
          attrs={attrs}
          db={db}
          editor={editor}
          updateAttributes={updateAttributes}
        >
          <CardItemGroup
            style={{ maxWidth: "var(--db-editor-width) !important" }}
          >
            <DatabaseToolbar
              attrs={attrs}
              db={db}
              onUpdateAttributes={(a) => updateAttributes(a)}
            />
            <div className="db-calendar-empty">
              <p>
                Add a Date property, then select it in the calendar settings to
                use this view.
              </p>
            </div>
          </CardItemGroup>
        </DatabaseProvider>
      </NodeViewWrapper>
    );
  }

  const monthLabel = new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <NodeViewWrapper>
      <DatabaseProvider
        attrs={attrs}
        db={db}
        editor={editor}
        updateAttributes={updateAttributes}
      >
        <CardItemGroup>
          <div
            className="db-calendar__toolbar-sticky"
            style={{
              maxWidth: "var(--db-editor-width) !important",
              paddingRight: 35,
            }}
          >
            <DatabaseToolbar
              attrs={attrs}
              db={db}
              onUpdateAttributes={(a) => updateAttributes(a)}
            />
          </div>

          <div className="db-calendar" data-type="database-calendar">
            {/* Month navigation header */}
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

            {/* Weekday headers */}
            <div className="db-calendar__weekdays">
              {WEEKDAYS.map((d) => (
                <div key={d} className="db-calendar__weekday">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="db-calendar__grid">
              {Array.from({ length: totalCells }).map((_, i) => {
                const dayNum = i - firstDow + 1; // 1-based, negative/overflow = padding
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
                            onClick={() => {
                              editor.commands.addDatabaseRecord(attrs.id);
                              // Set the date on the newly created record
                              setTimeout(() => {
                                let lastRecordId: string | null = null;
                                editor.state.doc.descendants((n) => {
                                  if (n.type.name === "databaseRecord") {
                                    lastRecordId = n.attrs.id;
                                  }
                                });
                                if (!lastRecordId || !dateProp) return;
                                const iso = new Date(
                                  year,
                                  month,
                                  dayNum,
                                ).toISOString();
                                editor.commands.updateDatabaseCell(
                                  attrs.id,
                                  lastRecordId,
                                  dateProp.id,
                                  iso,
                                );
                              }, 0);
                            }}
                          >
                            <Plus className="tiptap-button-icon" />
                          </Button>
                        </div>

                        <div className="db-calendar__cell-records">
                          {(recordsByDay[dayNum] ?? []).map(({ id, title }) => (
                            <button
                              key={id}
                              className="db-calendar__record-chip"
                              onClick={() => db.setOpenRecordId(id)}
                            >
                              {title}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardItemGroup>
      </DatabaseProvider>
    </NodeViewWrapper>
  );
}
