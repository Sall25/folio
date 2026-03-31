import { useCallback, useState, type ReactNode } from "react";
import {
  ColorDropdownContext,
  type RecentColor,
} from "./color-dropdown-context";

const MAX_COLORS = 5;

export function ColorDropdownProvider({ children }: { children: ReactNode }) {
  const [recentColors, setRecentColors] = useState<RecentColor[]>([]);

  const addRecentColor = useCallback((recent: RecentColor) => {
    console.log("addRecentColor called", recent); // does this fire?
    setRecentColors((prev) => {
      if (prev.some((c) => c.color === recent.color && c.type === recent.type))
        return prev;
      return [recent, ...prev].slice(0, MAX_COLORS);
    });
  }, []); // no dependency needed

  return (
    <ColorDropdownContext.Provider
      value={{
        recentColors,
        addRecentColor,
        mode: "node",
      }}
    >
      {children}
    </ColorDropdownContext.Provider>
  );
}
