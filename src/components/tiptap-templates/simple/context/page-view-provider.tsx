import { useMemo, useState } from "react";
import { PageViewContext, type ViewTarget } from "./page-view-context.js";

export function PageViewProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<ViewTarget | undefined>(undefined);
  const value = useMemo(() => ({ target, setTarget }), [target]);
  return (
    <PageViewContext.Provider value={value}>
      {children}
    </PageViewContext.Provider>
  );
}
