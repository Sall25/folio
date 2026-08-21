import { useEffect, useRef } from "react";
import type { DatabaseView, ID } from "src/types";

export function useActiveViewFromHash({
  views,
  activeViewId,
  setActiveViewId,
}: {
  views: DatabaseView[] | undefined | null;
  activeViewId: ID | undefined | null;
  setActiveViewId: (id: ID) => void;
}) {
  const hasActivatedRef = useRef(false);

  useEffect(() => {
    if (hasActivatedRef.current || !views?.length) return;

    hasActivatedRef.current = true;
    const viewId = window.location.hash.match(/view=([^&]+)/)?.[1];
    if (
      viewId &&
      views.map((v) => v.id).some((id) => id === viewId) &&
      activeViewId !== viewId
    )
      setActiveViewId(viewId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views?.length]);
}
