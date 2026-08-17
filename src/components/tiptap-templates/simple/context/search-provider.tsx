import { useCallback, useMemo, useState, type ReactNode } from "react";
import { SearchContext } from "./search-context";

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const onOpenChange = useCallback((o: boolean) => setOpen(o), []);

  const value = useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}
