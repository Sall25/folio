// active-page-context.tsx
import { createContext, useContext } from "react";

export const ActivePageContext = createContext<
  | {
      activePageId: string | undefined;
      setActivePageId: (id: string) => void;
    }
  | undefined
>(undefined);

export function useActivePageId() {
  const ctx = useContext(ActivePageContext);
  if (!ctx)
    throw new Error("useActivePageId must be used inside ActivePageProvider");
  return ctx;
}
