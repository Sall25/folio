import { useState, useCallback, useMemo, type ReactNode } from "react";
import {
  TimelineViewActionsContext,
  TimelineViewStateContext,
} from "./timeline-view-context";

export function TimelineViewProvider({ children }: { children: ReactNode }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [day, setDay] = useState(today.getDate());

  // One date, set as one thing. The three parts were set separately and
  // every caller had to remember all three: the one that jumps to a record
  // set the year and the month and not the day, so in the two timeframes
  // anchored by the day — Day and Week — jumping to a record went nowhere.
  const goTo = useCallback((date: Date) => {
    setYear(date.getFullYear());
    setMonth(date.getMonth());
    setDay(date.getDate());
  }, [setYear, setMonth, setDay]);

  const goToToday = useCallback(() => goTo(new Date()), [goTo]);

  const state = useMemo(() => ({ year, month, day }), [year, month, day]);
  const actions = useMemo(() => ({ goTo, goToToday }), [goTo, goToToday]);

  return (
    <TimelineViewStateContext.Provider value={state}>
      <TimelineViewActionsContext.Provider value={actions}>
        {children}
      </TimelineViewActionsContext.Provider>
    </TimelineViewStateContext.Provider>
  );
}
