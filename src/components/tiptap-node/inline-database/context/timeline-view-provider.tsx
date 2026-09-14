import { useState, useCallback, useMemo, type ReactNode } from "react";
import {
  TimelineViewActionsContext,
  TimelineViewStateContext,
} from "./timeline-view-context";

export function TimelineViewProvider({ children }: { children: ReactNode }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const goToToday = useCallback(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }, [setYear]);

  const state = useMemo(() => ({ year, month }), [year, month]);
  const actions = useMemo(
    () => ({ setYear, setMonth, goToToday }),
    [goToToday, setYear],
  );

  return (
    <TimelineViewStateContext.Provider value={state}>
      <TimelineViewActionsContext.Provider value={actions}>
        {children}
      </TimelineViewActionsContext.Provider>
    </TimelineViewStateContext.Provider>
  );
}
