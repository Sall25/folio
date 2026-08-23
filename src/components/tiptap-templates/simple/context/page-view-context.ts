import { createContext, useContext } from "react";
import type { ID, PageView } from "src/types";

export type ViewTarget = { pageId: ID; view: PageView };

interface PageViewStateValue {
  target: ViewTarget | undefined;
}

interface PageViewActionsValue {
  setTarget: (t: ViewTarget | undefined) => void;
}

export const PageViewStateContext = createContext<PageViewStateValue>({
  target: undefined,
});

export const PageViewActionsContext = createContext<PageViewActionsValue>({
  setTarget: () => {},
});

// State: subscribes to `target` — re-renders when the open target changes.
export function usePageViewState() {
  return useContext(PageViewStateContext);
}

// Actions: stable `setTarget` — components that only OPEN pages (title cell,
// board card) read this and DON'T re-render when `target` changes.
export function usePageViewActions() {
  return useContext(PageViewActionsContext);
}

// Back-compat shim — combines both. Migrate callers to the narrow hooks, then
// delete this. Note: this subscribes to BOTH contexts, so it forfeits the
// optimization — it's a migration bridge only.
export function usePageView() {
  return { ...usePageViewState(), ...usePageViewActions() };
}
