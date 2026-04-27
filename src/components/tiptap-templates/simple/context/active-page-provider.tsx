import { type ReactNode } from "react";
import { ActivePageContext } from "./active-page-context";

export function ActivePageProvider({
  children,
  activePageId,
  setActivePageId,
}: {
  children: ReactNode;
  activePageId: number | undefined;
  setActivePageId: (id: number) => void;
}) {
  return (
    <ActivePageContext.Provider value={{ activePageId, setActivePageId }}>
      {children}
    </ActivePageContext.Provider>
  );
}
