// active-page-context.tsx
import { createContext, useContext } from "react";
import type { UseActivePageReturn } from "../use-active-page";

type ActivePageContextType = UseActivePageReturn;
export const ActivePageContext = createContext<
  ActivePageContextType | undefined
>(undefined);

export function useActivePageContext() {
  const ctx = useContext(ActivePageContext);
  if (!ctx)
    throw new Error(
      "useActivePageContext must be used inside ActivePageProvider",
    );
  return ctx;
}
