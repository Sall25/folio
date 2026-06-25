import { useCallback, useState, type ReactNode } from "react";
import { TemplatesContext } from "./templates-context";

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const onOpenChange = useCallback((o: boolean) => setOpen(o), []);
  return (
    <TemplatesContext.Provider value={{ open, onOpenChange }}>
      {children}
    </TemplatesContext.Provider>
  );
}
