import { useCallback, useEffect, useMemo, useState } from "react";
import type { ID } from "src/types";
import type { UseDatabaseReturn } from "./use-database";

export function useViewSwitch(
  db: UseDatabaseReturn,
  activeViewId: ID | undefined,
) {
  const [switchingTo, setSwitchingTo] = useState<ID | null>(null);

  // Clear once the target view is active; rAF so it lands after first paint.
  useEffect(() => {
    if (switchingTo && activeViewId === switchingTo) {
      const raf = requestAnimationFrame(() => setSwitchingTo(null));
      return () => cancelAnimationFrame(raf);
    }
  }, [activeViewId, switchingTo]);

  const setActiveViewWithSkeleton = useCallback(
    (viewId: ID) => {
      if (viewId === activeViewId) return;
      setSwitchingTo(viewId);
      db.setActiveView(viewId);
    },
    [activeViewId, db],
  );

  // Switch-aware db so downstream view tabs trigger the skeleton unchanged.
  const dbWithSwitch = useMemo(
    () => ({ ...db, setActiveView: setActiveViewWithSkeleton }),
    [db, setActiveViewWithSkeleton],
  );

  return { switchingTo, dbWithSwitch };
}
