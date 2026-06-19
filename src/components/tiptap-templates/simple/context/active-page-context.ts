// active-page-context.tsx
import { createContext, useContext } from "react";
import type { ID, Page } from "src/types";

type ActivePageContextType = {
  activePageId: ID | null;
  setActivePageId: (id: ID) => void;
  activePage: Page | undefined;
  isLoading: boolean;
};
export const ActivePageContext = createContext<
  ActivePageContextType | undefined
>(undefined);

export function useActivePage() {
  const ctx = useContext(ActivePageContext);
  if (!ctx)
    throw new Error(
      "useActivePageContext must be used inside ActivePageProvider",
    );
  return ctx;
}
