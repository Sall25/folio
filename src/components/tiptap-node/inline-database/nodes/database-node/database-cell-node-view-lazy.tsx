import { lazy, Suspense } from "react";
import type { NodeViewProps } from "@tiptap/core";

const DatabaseCellNodeView = lazy(() => import("./database-cell-node-view"));

export function DatabaseCellNodeViewLazy(props: NodeViewProps) {
  return (
    <Suspense fallback={null}>
      <DatabaseCellNodeView {...props} />
    </Suspense>
  );
}
