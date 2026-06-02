import { useCallback, useState, type ReactNode } from "react";
import { LibraryContext } from "./library-context";

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const onOpenChange = useCallback((o: boolean) => setOpen(o), []);
  return (
    <LibraryContext.Provider value={{ open, onOpenChange }}>
      {children}
    </LibraryContext.Provider>
  );
}
