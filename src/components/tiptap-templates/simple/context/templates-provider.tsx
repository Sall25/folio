import { useCallback, useMemo, useState, type ReactNode } from "react";
import { TemplatesContext } from "./templates-context";

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const onOpenChange = useCallback((o: boolean) => setOpen(o), []);
  const value = useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
  return (
    <TemplatesContext.Provider value={value}>
      {children}
    </TemplatesContext.Provider>
  );
}
