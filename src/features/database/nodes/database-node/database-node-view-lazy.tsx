import { lazy, Suspense, useState } from "react";
import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { useInClosedToggle } from "src/components/tiptap-node/appendix-node/use-in-closed-toggle";
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
  return (
    <Suspense fallback={<DatabaseLoadingSkeleton />}>
      <DatabaseNodeViewInner {...props} />
    </Suspense>
  );
}
