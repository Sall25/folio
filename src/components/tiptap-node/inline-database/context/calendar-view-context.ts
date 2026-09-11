import { createContext, useContext } from "react";

export interface CalendarViewState {
  year: number;
  month: number;
  today: Date;
  firstDow: number;
  totalCells: number;
  daysInMonth: number;
}

export interface CalendarViewActions {
  prevMonth: () => void;
  nextMonth: () => void;
  goToday: () => void;
  addOnDay: (day: number) => void;
}

export const CalendarViewStateContext = createContext<CalendarViewState | null>(
  null,
);

export const CalendarViewActionsContext =
  createContext<CalendarViewActions | null>(null);

export function useCalendarViewState() {
  const ctx = useContext(CalendarViewStateContext);
  if (!ctx)
    throw new Error("CalendarViewStateContext outside CalendarViewProvider");
  return ctx;
}

export function useCalendarViewActions() {
  const ctx = useContext(CalendarViewActionsContext);
  if (!ctx)
    throw new Error("CalendarViewActionsContext outside CalendarViewProvider");
  return ctx;
}
