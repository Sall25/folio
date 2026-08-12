import { useEffect, useRef } from "react";
import type { DatabaseAttrs, DataSource, ID } from "src/types";
import type { UseDatabaseReturn } from "./use-database";

export function useViewRegistration({
  source,
  attrs,
  db,
  registerViewsAsync,
  unregisterViewsAsync,
}: {
  source: DataSource | null;
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  registerViewsAsync: (views: DatabaseAttrs["views"]) => void;
  unregisterViewsAsync: (ids: ID[]) => void;
}) {
  // Register the node's present views with the source.
  useEffect(() => {
    if (!source) return;
    registerViewsAsync(attrs.views);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs.views, source?.id, registerViewsAsync]);

  // Prune saved views that were deleted from the node.
  useEffect(() => {
    if (!source) return;
    const liveIds = new Set(attrs.views.map((v) => v.id));
    const orphanIds = (source.savedViews ?? [])
      .map((sv) => sv.id)
      .filter((id) => !liveIds.has(id));
    if (orphanIds.length) unregisterViewsAsync(orphanIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs.views, source?.id, unregisterViewsAsync]);

  // Activate a view from the URL hash (#view=…) once, on first load.
  const hashActivatedRef = useRef(false);
  useEffect(() => {
    if (hashActivatedRef.current || db.views?.length === 0) return;
    hashActivatedRef.current = true;
    const viewId = window.location.hash.match(/view=([^&]+)/)?.[1];
    if (
      viewId &&
      db.views.some((v) => v.id === viewId) &&
      viewId !== attrs.activeViewId
    ) {
      db.setActiveView(viewId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.views?.length]);
}
