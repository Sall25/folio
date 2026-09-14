import { createContext, useContext } from "react";

interface TimelineViewStateValue {
  year: number;
  month: number;
}

interface TimelineViewActionsValue {
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
  goToToday: () => void;
}

export const TimelineViewStateContext =
  createContext<TimelineViewStateValue | null>(null);

export const TimelineViewActionsContext =
  createContext<TimelineViewActionsValue | null>(null);

export function useTimelineViewState(): TimelineViewStateValue {
  const ctx = useContext(TimelineViewStateContext);
  if (!ctx) {
    throw new Error(
      "useTimelineViewState must be used within a TimelineViewProvider",
    );
  }
  return ctx;
}

export function useTimelineViewActions(): TimelineViewActionsValue {
  const ctx = useContext(TimelineViewActionsContext);
  if (!ctx) {
    throw new Error(
      "useTimelineViewActions must be used within a TimelineViewProvider",
    );
  }
  return ctx;
}
