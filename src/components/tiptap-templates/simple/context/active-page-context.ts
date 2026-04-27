// active-page-context.tsx
import { createContext, useContext } from "react";

export const ActivePageContext = createContext<
  | {
      activePageId: number | undefined;
      setActivePageId: (id: number) => void;
    }
  | undefined
>(undefined);

export function useActivePageId() {
  const ctx = useContext(ActivePageContext);
  if (!ctx)
    throw new Error("useActivePageId must be used inside ActivePageProvider");
  return ctx;
}
