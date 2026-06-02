import { useCallback, useState, type ReactNode } from "react";
import { SearchContext } from "./search-context";

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const onOpenChange = useCallback((o: boolean) => setOpen(o), []);
  return (
    <SearchContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SearchContext.Provider>
  );
}
