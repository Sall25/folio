import { lazy, Suspense } from "react";
import type { NodeViewProps } from "@tiptap/core";

// Mirrors the DatabaseNodeViewLazy pattern: the heavy view is a separate
// chunk, loaded on demand, with a lightweight wrapper here. For now the inner
// view is a minimal stub that just renders the record's cell children — it
// exists so the schema compiles and the app loads. Real row rendering comes
// in a later step.
const DatabaseRecordNodeView = lazy(
  () => import("./database-record-node-view"),
);

export function DatabaseRecordNodeViewLazy(props: NodeViewProps) {
  return (
    <Suspense fallback={null}>
      <DatabaseRecordNodeView {...props} />
    </Suspense>
  );
}
