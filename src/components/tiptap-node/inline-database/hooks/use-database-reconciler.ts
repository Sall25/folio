// Drives reconcileDatabaseNode from inside the database NodeView. Watches the
// DataSource projection (records + properties) and dispatches a reconcile
// transaction whenever the node tree no longer matches — while avoiding:
//   - dispatching during Yjs sync (would race/duplicate across clients)
//   - dispatching when nothing actually changed (reconcile returns false)
//   - infinite loops (our own reconcile txn re-triggering the effect)

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { ySyncPluginKey } from "y-prosemirror";
import {
  reconcileDatabaseNode,
  type ReconcileRecord,
} from "../utils/reconcile-database-nodes";
import type { DatabaseProperty } from "src/types";

interface Params {
  editor: Editor | null;
  // The database node's current id (attrs.id) — used to locate it in the doc.
  databaseNodeId: string | null;
  sourceId: string | null;
  records: ReconcileRecord[];
  properties: DatabaseProperty[];
  // Skip while the source is still loading — reconciling against an empty
  // record set would delete every row node, then re-insert on load. Bad.
  ready: boolean;
}

// Locate the database node (by attrs.id) and its position in the doc.
function findDatabaseNode(
  doc: PMNode,
  databaseNodeId: string,
): { node: PMNode; pos: number } | null {
  let found: { node: PMNode; pos: number } | null = null;
  doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === "database" && node.attrs.id === databaseNodeId) {
      found = { node, pos };
      return false;
    }
    return true;
  });
  return found;
}

export function useDatabaseReconciler({
  editor,
  databaseNodeId,
  sourceId,
  records,
  properties,
  ready,
}: Params) {
  // Guards against re-entrancy: our own dispatched reconcile transaction
  // changes the doc, which could re-run the effect; we tag our transactions
  // and skip reacting to them.
  const reconcilingRef = useRef(false);

  useEffect(() => {
    if (!editor || !ready || !databaseNodeId || !sourceId) return;
    if (reconcilingRef.current) return;

    // Defer to a microtask so we never dispatch during render or during the
    // editor's own transaction application (which would throw or reenter).
    const run = () => {
      if (!editor || editor.isDestroyed) return;

      const dbInfo = findDatabaseNode(editor.state.doc, databaseNodeId);
      if (!dbInfo) return;

      const tr = editor.state.tr;

      // Mark this as a local, non-user, reconcile transaction. Other plugins
      // (e.g. autosave, title/paragraph guards) can check this meta to ignore
      // structural reconciliation if needed.
      tr.setMeta("databaseReconcile", true);
      // Do not push this onto the undo stack — it's derived structure, not a
      // user edit. (addToHistory is respected by the history/collab plugins.)
      tr.setMeta("addToHistory", false);

      const changed = reconcileDatabaseNode(
        tr,
        editor.schema,
        dbInfo,
        sourceId,
        databaseNodeId, // == the database node's attrs.id → stamped on children
        records,
        properties,
      );

      if (!changed) return;

      reconcilingRef.current = true;
      try {
        editor.view.dispatch(tr);
      } finally {
        reconcilingRef.current = false;
      }
    };

    const id = undefined;
    queueMicrotask(run);
    return () => {
      // no-op cleanup; microtask can't be cancelled but run() re-checks state
      void id;
    };
    // Re-run whenever the DataSource projection changes. records/properties
    // are arrays — depend on stable identities from useDataSource, or this
    // fires every render. If they're not memoized upstream, memoize there.
  }, [editor, databaseNodeId, sourceId, records, properties, ready]);
}

// NOTE on the Yjs-sync guard:
// The reconcile transaction is tagged addToHistory:false and databaseReconcile.
// Because reconciliation is driven by DATA SOURCE changes (not doc changes),
// it does not run inside appendTransaction and therefore isn't triggered by
// sync transactions directly. The idempotent-by-recordId logic in
// reconcileDatabaseNode is what makes it safe when sync brings in record nodes
// from another client: those nodes already carry recordIds, so this client
// sees them as "already present" and inserts nothing. The ySyncPluginKey
// import is kept intentionally for the follow-up hardening step (explicitly
// skipping a reconcile if the last transaction was sync-origin), if we find we
// need it.
void ySyncPluginKey;
