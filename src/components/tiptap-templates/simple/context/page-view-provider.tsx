import { useState, useMemo } from "react";
import {
  PageViewStateContext,
  PageViewActionsContext,
  type ViewTarget,
} from "./page-view-context";

export function PageViewProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<ViewTarget | undefined>(undefined);

  // State value — new identity only when target changes.
  const stateValue = useMemo(() => ({ target }), [target]);

  // Actions value — setTarget from useState is already stable, but wrap in a
  // memo so the actions context value identity NEVER changes (so action-only
  // consumers never re-render).
  const actionsValue = useMemo(() => ({ setTarget }), []);

  return (
    <PageViewActionsContext.Provider value={actionsValue}>
      <PageViewStateContext.Provider value={stateValue}>
        {children}
      </PageViewStateContext.Provider>
    </PageViewActionsContext.Provider>
  );
}
