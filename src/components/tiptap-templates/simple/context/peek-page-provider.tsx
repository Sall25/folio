// use-peek-page.tsx
import { useState, type ReactNode } from "react";
import { PeekPageContext } from "./peek-page-context";

export function PeekPageProvider({ children }: { children: ReactNode }) {
  const [peekPageId, setPeekPageId] = useState<number | null>(null);

  return (
    <PeekPageContext.Provider value={{ peekPageId, setPeekPageId }}>
      {children}
    </PeekPageContext.Provider>
  );
}
