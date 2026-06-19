import { createContext, useContext } from "react";
import type { ID, PageView } from "src/types";

export type ViewTarget = { pageId: ID; view: PageView };

interface PageViewContextValue {
  target: ViewTarget | undefined;
  setTarget: (t: ViewTarget | undefined) => void;
}

export const PageViewContext = createContext<PageViewContextValue>({
  target: undefined,
  setTarget: () => {},
});

export function usePageView() {
  return useContext(PageViewContext);
}
