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

  const goToToday = useCallback(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setDay(now.getDate());
  }, [setYear, setMonth, setDay]);

  const state = useMemo(() => ({ year, month, day }), [year, month, day]);
  const actions = useMemo(
    () => ({ setYear, setMonth, setDay, goToToday }),
    [goToToday, setYear, setMonth, setDay],
  );

  return (
    <TimelineViewStateContext.Provider value={state}>
      <TimelineViewActionsContext.Provider value={actions}>
        {children}
      </TimelineViewActionsContext.Provider>
    </TimelineViewStateContext.Provider>
  );
}
