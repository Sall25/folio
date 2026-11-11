import { NodeViewWrapper } from "@tiptap/react";
import type { DatabaseView } from "src/types";
import { SpinnerRing } from "src/components/tiptap-ui-primitive/spinner-ring";
import { DatabaseLoadingSkeleton } from "../database-loading-skeleton";
// Direct import, not the hooks barrel: this also renders before the
// database code has loaded, and must not pull it into the editor bundle.
import { useViewSkeletonDims } from "../../hooks/use-view-skeleton-dims";

// While a database loads: its active view's skeleton, in the shape and size
// this device saw last time (rows, columns, cards, height), with the real
// view tabs from the node. Never seen on this device: a spinner, rather than
// a made-up shape that jumps when the real view arrives.

export function DatabaseLoadingSkeletonWithDims({
  databaseId,
  type = "table",
  views,
  activeViewId,
  switching = false,
}: {
  databaseId: string | null | undefined;
  type: DatabaseView["type"];
  views?: DatabaseView[];
  activeViewId?: string | null;
  switching?: boolean;
}) {
  const viewId =
    activeViewId ??
    views?.find((v) => v.type === type)?.id ??
    null;
  const { dims, known } = useViewSkeletonDims(databaseId ?? "", type, viewId);
  if (!databaseId || !known) {
    return (
      <NodeViewWrapper
        className={switching ? "db-container" : "db-skeleton-node"}
        contentEditable={false}
      >
        <div
          className={
            switching
              ? "db-skeleton db-skeleton--spinner"
              : "db-skeleton db-skeleton--spinner db-skeleton--column top-level-block"
          }
          aria-busy="true"
        >
          <SpinnerRing size={20} />
        </div>
      </NodeViewWrapper>
    );
  }
  return (
    <DatabaseLoadingSkeleton
      type={type}
      dims={dims}
      views={views}
      activeViewId={viewId}
      switching={switching}
    />
  );
}
