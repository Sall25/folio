import { useState } from "react";
import { PageViewContext, type ViewTarget } from "./page-view-context.js";

export function PageViewProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<ViewTarget | undefined>(undefined);
  return (
    <PageViewContext.Provider value={{ target, setTarget }}>
      {children}
    </PageViewContext.Provider>
  );
}
