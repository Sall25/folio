// Replaces the runtime reconciler with the simpler "seed at creation" model:
//
//   - SEED ONCE: when the source has loaded and the database node has zero
//     record children (a freshly-created or pre-migration database), insert
//     the full record/cell tree in one transaction. Guard is the doc itself
//     (child count), so it's idempotent and self-healing — never re-seeds once
//     children exist, auto-seeds any database that somehow has none.
//
//   - ROW ADD / DELETE: targeted helpers the "New"/delete flows call to insert
//     or remove a single record node, keeping the tree in sync without a
//     general reconciler.

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { DatabaseProperty, ID, Page } from "src/types";
import {
  buildRecordNode,
  buildRecordNodes,
} from "../utils/build-database-nodes";

function findDatabaseNode(
  doc: PMNode,
  databaseId: string,
): { node: PMNode; pos: number } | null {
  let found: { node: PMNode; pos: number } | null = null;
  doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === "database" && node.attrs.id === databaseId) {
      found = { node, pos };
      return false;
    }
    return true;
  });
  return found;
}

function countRecordChildren(dbNode: PMNode): number {
  let n = 0;
  dbNode.forEach((c) => {
    if (c.type.name === "databaseRecord") n++;
  });
  return n;
}

interface SeedParams {
  editor: Editor | null;
  databaseId: string | null;
  sourceId: ID | null;
  records: Page[]; // resolvedRecords (unsorted is fine — order is a view concern)
  properties: DatabaseProperty[];
  ready: boolean; // source loaded
}

export function useDatabaseSeed({
  editor,
  databaseId,
  sourceId,
  records,
  properties,
  ready,
}: SeedParams) {
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    if (!editor || editor.isDestroyed) return;
    if (!ready || !databaseId || !sourceId) return;

    const info = findDatabaseNode(editor.state.doc, databaseId);
    if (!info) return;

    // Already has rows → someone (this or another client) seeded it. Never
    // re-seed. This is the idempotent, self-healing guard.
    if (countRecordChildren(info.node) > 0) {
      seededRef.current = true;
      return;
    }

    if (records.length === 0) return; // nothing to seed yet

    const nodes = buildRecordNodes(records, sourceId, databaseId, properties);
    const insertPos = info.pos + info.node.nodeSize - 1; // before db close

    const tr = editor.state.tr;
    tr.setMeta("addToHistory", false);
    tr.insert(
      insertPos,
      nodes.map((json) => editor.schema.nodeFromJSON(json)),
    );
    editor.view.dispatch(tr);
    seededRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, databaseId, sourceId, ready, records, properties]);
}

// ── Targeted row-add: insert a single record node for a newly created row ────
export function insertRecordNode(
  editor: Editor,
  databaseId: ID,
  sourceId: ID,
  record: Page,
  properties: DatabaseProperty[],
): void {
  const info = findDatabaseNode(editor.state.doc, databaseId);
  if (!info) return;
  // Skip if a node for this record already exists.
  let exists = false;
  info.node.forEach((c) => {
    if (c.type.name === "databaseRecord" && c.attrs.recordId === record.id) {
      exists = true;
    }
  });
  if (exists) return;

  const json = buildRecordNode(record, sourceId, databaseId, properties);
  const insertPos = info.pos + info.node.nodeSize - 1;
  const tr = editor.state.tr;
  tr.setMeta("addToHistory", false);
  tr.insert(insertPos, editor.schema.nodeFromJSON(json));
  editor.view.dispatch(tr);
}

// ── Targeted row-delete: remove the record node for a deleted row ────────────
export function removeRecordNode(
  editor: Editor,
  databaseId: ID,
  recordId: ID,
): void {
  const info = findDatabaseNode(editor.state.doc, databaseId);
  if (!info) return;

  let childPos = info.pos + 1;
  let fromPos = -1;
  let toPos = -1;
  info.node.forEach((c) => {
    if (
      fromPos === -1 &&
      c.type.name === "databaseRecord" &&
      c.attrs.recordId === recordId
    ) {
      fromPos = childPos;
      toPos = childPos + c.nodeSize;
    }
    childPos += c.nodeSize;
  });
  if (fromPos === -1) return;

  const tr = editor.state.tr;
  tr.setMeta("addToHistory", false);
  tr.delete(fromPos, toPos);
  editor.view.dispatch(tr);
}
