import { useCallback, useMemo, useState, type ReactNode } from "react";
import { getDaysInMonth, getFirstDayOfWeek } from "../utils/date-utils";
import {
  type CalendarViewActions,
  CalendarViewActionsContext,
  type CalendarViewState,
  CalendarViewStateContext,
} from "./calendar-view-context";
import { useDataSource } from "../hooks/use-data-source";
import { useDatabaseContext } from "../nodes/database-context";

export function CalendarViewProvider({ children }: { children: ReactNode }) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  const { source, db } = useDatabaseContext();
  const activeView = db.activeView;
  const { addRecordAsync, setCellValue } = useDataSource(source?.id);
  const dateProp = useMemo(() => {
    if (activeView.type !== "calendar") return undefined;
    if (activeView?.datePropertyId) {
      const explicit = source?.properties.find(
        (p) => p.id === activeView.datePropertyId && p.config.type === "date",
      );
      if (explicit) return explicit;
    }
    return source?.properties.find((p) => p.config.type === "date");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.properties, activeView.type]);

  const addOnDay = useCallback(
    async (dayNum: number) => {
      const row = await addRecordAsync({ title: "" });
      if (dateProp) {
        const iso = new Date(year, month, dayNum).toISOString();
        setCellValue(row.id, dateProp.id, iso);
      }
    },
    [addRecordAsync, setCellValue, dateProp, month, year],
  );

  const prevMonth = useCallback(() => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }, [setYear, setMonth, month]);

  const nextMonth = useCallback(() => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }, [setYear, setMonth, month]);

  const goToday = useCallback(() => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }, [setYear, setMonth, today]);

  const state = useMemo<CalendarViewState>(
    () => ({
      today,
      month,
      year,
      firstDow,
      daysInMonth,
      totalCells,
    }),
    [today, month, year, firstDow, daysInMonth, totalCells],
  );

  const actions = useMemo<CalendarViewActions>(
    () => ({
      prevMonth,
      nextMonth,
      goToday,
      addOnDay,
    }),
    [prevMonth, nextMonth, goToday, addOnDay],
  );

  return (
    <CalendarViewActionsContext.Provider value={actions}>
      <CalendarViewStateContext.Provider value={state}>
        {children}
      </CalendarViewStateContext.Provider>
    </CalendarViewActionsContext.Provider>
  );
}
