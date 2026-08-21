import { useEffect } from "react";
import type { DatabaseView, DataSource, ID } from "src/types";

export function useSyncViews({
  views,
  source,
  registerViewsAsync,
  unregisterViewsAsync,
}: {
  views: DatabaseView[];
  source: DataSource | undefined | null;
  registerViewsAsync: (views: DatabaseView[]) => Promise<void>;
  unregisterViewsAsync: (ids: ID[]) => Promise<void>;
}) {
  useEffect(() => {
    if (!source) return;

    // Ensure all current node views are registered
    registerViewsAsync(views);

    // Remove saved views that are no longer present
    const liveIds = new Set(views.map((v) => v.id));
    const orphanIds = (source.savedViews ?? [])
      .map((sv) => sv.id)
      .filter((id) => !liveIds.has(id));
    if (orphanIds.length) unregisterViewsAsync(orphanIds);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views, source?.id, registerViewsAsync, unregisterViewsAsync]);
}
