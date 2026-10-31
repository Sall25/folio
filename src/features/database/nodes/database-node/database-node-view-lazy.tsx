import { lazy, Suspense, useState } from "react";
import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { useInClosedToggle } from "src/components/tiptap-node/appendix-node/use-in-closed-toggle";
import { DatabaseLoadingSkeletonWithDims } from "../../components/database-loading-skeleton-with-dims/database-loading-skeleton-with-dims";
import type { DatabaseView } from "src/types";

// The heavy database subsystem (six views, cells, dnd-kit, lodash, hooks,
// utils) lives behind this dynamic import, so it leaves the editor-create
// bundle and only loads when the first database node mounts — covered by the
// same loading state the view uses for its own: the active view's skeleton
// when its size is known on this device, else a spinner. The view comes
// from the node itself, so it's known before any code or data loads.
const DatabaseNodeViewInner = lazy(() =>
  import("./database-node-view").then((m) => ({
    default: m.DatabaseNodeView,
  })),
);

export function DatabaseNodeViewLazy(props: NodeViewProps) {
  // In a collapsed toggle: nothing to see, so nothing loads (no code, no
  // records) until it's opened the first time; then the skeleton shows while
  // it loads. Once opened it stays mounted, so closing and reopening is
  // instant.
  const closed = useInClosedToggle(props.editor, props.getPos);
  const [opened, setOpened] = useState(!closed);
  if (!closed && !opened) setOpened(true);
  if (!opened) {
    return <NodeViewWrapper className="db-node is-deferred" />;
  }
  const views = (props.node.attrs.views ?? []) as DatabaseView[];
  const activeType =
    views.find((v) => v.id === props.node.attrs.activeViewId)?.type ??
    views[0]?.type ??
    "table";
  return (
    <Suspense
      fallback={
        <DatabaseLoadingSkeletonWithDims
          databaseId={props.node.attrs.id as string | null}
          type={activeType}
        />
      }
    >
      <DatabaseNodeViewInner {...props} />
    </Suspense>
  );
}
