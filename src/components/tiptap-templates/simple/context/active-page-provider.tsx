import { type ReactNode } from "react";
import { ActivePageContext } from "./active-page-context";

export function ActivePageProvider({
  children,
  activePageId,
  setActivePageId,
}: {
  children: ReactNode;
  activePageId: string | undefined;
  setActivePageId: (id: string) => void;
}) {
  return (
    <ActivePageContext.Provider value={{ activePageId, setActivePageId }}>
      {children}
    </ActivePageContext.Provider>
  );
}
