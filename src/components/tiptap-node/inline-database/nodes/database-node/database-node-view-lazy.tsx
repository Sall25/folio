import { lazy, Suspense } from "react";
import type { NodeViewProps } from "@tiptap/core";
import { DatabaseLoadingSkeleton } from "../../components/database-loading-skeleton";

// The heavy database subsystem (six views, cells, dnd-kit, lodash, hooks,
// utils) lives behind this dynamic import, so it leaves the editor-create
// bundle and only loads when the first database node mounts — covered by the
// same skeleton the view already uses for its own loading state.
const DatabaseNodeViewInner = lazy(() =>
  import("./database-node-view").then((m) => ({
    default: m.DatabaseNodeView,
  })),
);

export function DatabaseNodeViewLazy(props: NodeViewProps) {
  return (
    <Suspense fallback={<DatabaseLoadingSkeleton />}>
      <DatabaseNodeViewInner {...props} />
    </Suspense>
  );
}
