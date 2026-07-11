// use-database-seed.ts
//
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

// ── Property add: insert a cell node for the new property into EVERY record ──
// Mirrors insertRecordNode but at the cell level. When a property is added,
// existing record nodes are short one cell; this appends a matching cell to
// each. Skips records that already have a cell for this property (idempotent).
export function insertCellForProperty(
  editor: Editor,
  databaseId: ID,
  propertyId: ID,
): void {
  const info = findDatabaseNode(editor.state.doc, databaseId);
  if (!info) return;

  const cellType = editor.schema.nodes.databaseCell;
  if (!cellType) return;

  const tr = editor.state.tr;
  tr.setMeta("addToHistory", false);
  let modified = false;

  // Walk record nodes; for each, if it lacks a cell for propertyId, append one
  // before the record's close. Recompute positions via mapping after each edit.
  const recordPositions: { recordId: string; pos: number }[] = [];
  let childPos = info.pos + 1;
  info.node.forEach((rec) => {
    if (rec.type.name === "databaseRecord") {
      recordPositions.push({
        recordId: (rec.attrs.recordId as string) ?? "",
        pos: childPos,
      });
    }
    childPos += rec.nodeSize;
  });

  for (const { recordId, pos } of recordPositions) {
    const mappedPos = tr.mapping.map(pos);
    const recNode = tr.doc.nodeAt(mappedPos);
    if (!recNode || recNode.type.name !== "databaseRecord") continue;

    // Already has a cell for this property?
    let has = false;
    recNode.forEach((c) => {
      if (c.type.name === "databaseCell" && c.attrs.propertyId === propertyId) {
        has = true;
      }
    });
    if (has) continue;

    const insertAt = mappedPos + recNode.nodeSize - 1; // before record close
    tr.insert(insertAt, cellType.create({ recordId, propertyId, databaseId }));
    modified = true;
  }

  if (modified) editor.view.dispatch(tr);
}

// ── Property remove: delete the cell node for that property from EVERY record ─
export function removeCellForProperty(
  editor: Editor,
  databaseId: ID,
  propertyId: ID,
): void {
  const info = findDatabaseNode(editor.state.doc, databaseId);
  if (!info) return;

  const tr = editor.state.tr;
  tr.setMeta("addToHistory", false);

  // Collect all cell ranges (across all records) matching propertyId, then
  // delete back-to-front so positions stay valid.
  const ranges: { from: number; to: number }[] = [];
  let recPos = info.pos + 1;
  info.node.forEach((rec) => {
    if (rec.type.name === "databaseRecord") {
      let cellPos = recPos + 1;
      rec.forEach((c) => {
        if (
          c.type.name === "databaseCell" &&
          c.attrs.propertyId === propertyId
        ) {
          ranges.push({ from: cellPos, to: cellPos + c.nodeSize });
        }
        cellPos += c.nodeSize;
      });
    }
    recPos += rec.nodeSize;
  });

  if (ranges.length === 0) return;
  ranges
    .sort((a, b) => b.from - a.from)
    .forEach(({ from, to }) => tr.delete(from, to));
  editor.view.dispatch(tr);
}

// ── Reactive cell-sync: keep each record's cells matching current properties ──
// Property mutations (add / delete / etc.) originate in components the table
// view doesn't own (PropertyHeader, settings panels), so wiring each mutation
// site is fragile and misses cases. Instead this effect watches the property
// set and reconciles the CELL nodes to match — insert cells for properties
// that gained one, remove cells for properties that no longer exist. Rows
// (record nodes) are handled separately; this only touches cells WITHIN
// existing records, so there's no row-level dual-authority concern.
//
// Cheap: property changes are rare and this only acts on a real diff.
export function useDatabaseCellSync({
  editor,
  databaseId,
  properties,
  ready,
}: {
  editor: Editor | null;
  databaseId: string | null;
  properties: DatabaseProperty[];
  ready: boolean;
}) {
  // Track the property-id set we last reconciled to, so we only act on change.
  const lastIdsRef = useRef<string>("");

  useEffect(() => {
    if (!editor || editor.isDestroyed || !ready || !databaseId) return;

    const info = findDatabaseNode(editor.state.doc, databaseId);
    if (!info) return;

    const wantIds = properties.map((p) => p.id);
    const wantKey = wantIds.join("|");

    // Collect the union of propertyIds currently present across record cells.
    const haveIds = new Set<string>();
    info.node.forEach((rec) => {
      if (rec.type.name !== "databaseRecord") return;
      rec.forEach((c) => {
        if (c.type.name === "databaseCell" && c.attrs.propertyId) {
          haveIds.add(c.attrs.propertyId as string);
        }
      });
    });

    const haveKey = [...haveIds].sort().join("|");
    // Nothing changed since last run AND cells already match → skip.
    if (
      wantKey === lastIdsRef.current &&
      haveKey === [...wantIds].sort().join("|")
    ) {
      return;
    }

    // Insert cells for properties present in the source but missing from cells.
    for (const pid of wantIds) {
      if (!haveIds.has(pid)) {
        insertCellForProperty(editor, databaseId, pid);
      }
    }
    // Remove cells for properties no longer in the source.
    for (const pid of haveIds) {
      if (!wantIds.includes(pid)) {
        removeCellForProperty(editor, databaseId, pid);
      }
    }

    lastIdsRef.current = wantKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, databaseId, ready, properties]);
}
