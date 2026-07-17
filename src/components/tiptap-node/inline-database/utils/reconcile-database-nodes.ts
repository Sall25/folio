// Pure reconciliation: make a `database` node's child tree (databaseRecord >
// databaseCell) match the DataSource's records + properties, without touching
// records/cells already correct (so content-cell edits and Yjs state survive).
//
//  - idempotent, keyed by recordId (insert only if no node with that id exists)
//  - diff-based: insert missing, remove orphaned
//  - dedupe pass: remove duplicate record nodes (concurrent double-insert)
//  - Option A ordering: order record nodes to the desired display order so
//    NodeViewContent renders them correctly (records passed in are the visible,
//    sorted set).
//
// Every record/cell node is stamped with databaseId so its NodeView can read
// the right entry from the editor-storage bridge.

import type { Node as PMNode, Schema } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import type { DatabaseProperty } from "src/types";

export interface ReconcileRecord {
  id: string;
}

interface DatabaseNodeInfo {
  node: PMNode;
  pos: number;
}

function collectRecordNodes(
  dbNode: PMNode,
  dbPos: number,
): { recordId: string | null; node: PMNode; pos: number }[] {
  const out: { recordId: string | null; node: PMNode; pos: number }[] = [];
  let childPos = dbPos + 1;
  dbNode.forEach((child) => {
    if (child.type.name === "databaseRecord") {
      out.push({
        recordId: (child.attrs.recordId as string) ?? null,
        node: child,
        pos: childPos,
      });
    }
    childPos += child.nodeSize;
  });
  return out;
}

function buildRecordNode(
  schema: Schema,
  recordId: string,
  sourceId: string,
  databaseId: string,
  properties: DatabaseProperty[],
): PMNode {
  const cellType = schema.nodes.databaseCell;
  const recordType = schema.nodes.databaseRecord;

  const cells = properties.map((prop) =>
    cellType.create({
      recordId,
      propertyId: prop.id,
      databaseId,
    }),
  );

  return recordType.create({ recordId, sourceId, databaseId }, cells);
}

function reconcileCellsOfRecord(
  tr: Transaction,
  schema: Schema,
  recordNode: PMNode,
  recordPos: number,
  recordId: string,
  databaseId: string,
  properties: DatabaseProperty[],
): boolean {
  const cellType = schema.nodes.databaseCell;
  const wantPropIds = properties.map((p) => p.id);

  const existing = new Map<string, { node: PMNode; offset: number }>();
  let offset = recordPos + 1;
  recordNode.forEach((cell) => {
    if (cell.type.name === "databaseCell") {
      const pid = cell.attrs.propertyId as string;
      existing.set(pid, { node: cell, offset });
    }
    offset += cell.nodeSize;
  });

  let modified = false;

  const toRemove: { from: number; to: number }[] = [];
  existing.forEach((info, pid) => {
    if (!wantPropIds.includes(pid)) {
      toRemove.push({
        from: tr.mapping.map(info.offset),
        to: tr.mapping.map(info.offset + info.node.nodeSize),
      });
    }
  });
  toRemove
    .sort((a, b) => b.from - a.from)
    .forEach(({ from, to }) => {
      tr.delete(from, to);
      modified = true;
    });

  properties.forEach((prop) => {
    if (!existing.has(prop.id)) {
      const mappedRecordPos = tr.mapping.map(recordPos);
      const recNode = tr.doc.nodeAt(mappedRecordPos);
      if (!recNode) return;
      const insertAt = mappedRecordPos + recNode.nodeSize - 1;
      tr.insert(
        insertAt,
        cellType.create({
          recordId,
          propertyId: prop.id,
          databaseId,
        }),
      );
      modified = true;
    }
  });

  return modified;
}

export function reconcileDatabaseNode(
  tr: Transaction,
  schema: Schema,
  dbInfo: DatabaseNodeInfo,
  sourceId: string,
  databaseId: string,
  records: ReconcileRecord[],
  properties: DatabaseProperty[],
): boolean {
  const { node: dbNode, pos: dbPos } = dbInfo;
  let modified = false;

  const recordNodes = collectRecordNodes(dbNode, dbPos);

  // 1. Dedupe — remove duplicate record nodes sharing a recordId.
  const seen = new Set<string>();
  const dupRanges: { from: number; to: number }[] = [];
  for (const rn of recordNodes) {
    if (rn.recordId == null) continue;
    if (seen.has(rn.recordId)) {
      dupRanges.push({ from: rn.pos, to: rn.pos + rn.node.nodeSize });
    } else {
      seen.add(rn.recordId);
    }
  }
  dupRanges
    .sort((a, b) => b.from - a.from)
    .forEach(({ from, to }) => {
      tr.delete(tr.mapping.map(from), tr.mapping.map(to));
      modified = true;
    });

  const existingIds = seen;
  const wantIds = new Set(records.map((r) => r.id));

  // 2. Remove orphaned record nodes (row deleted / filtered out).
  const orphanRanges: { from: number; to: number }[] = [];
  for (const rn of recordNodes) {
    if (rn.recordId != null && !wantIds.has(rn.recordId)) {
      orphanRanges.push({ from: rn.pos, to: rn.pos + rn.node.nodeSize });
    }
  }
  orphanRanges
    .sort((a, b) => b.from - a.from)
    .forEach(({ from, to }) => {
      tr.delete(tr.mapping.map(from), tr.mapping.map(to));
      modified = true;
    });

  // 3. Insert missing record nodes (append; ordering pass fixes order).
  for (const rec of records) {
    if (existingIds.has(rec.id)) continue;
    const mappedDbPos = tr.mapping.map(dbPos);
    const liveDbNode = tr.doc.nodeAt(mappedDbPos);
    if (!liveDbNode) continue;
    const insertAt = mappedDbPos + liveDbNode.nodeSize - 1;
    tr.insert(
      insertAt,
      buildRecordNode(schema, rec.id, sourceId, databaseId, properties),
    );
    modified = true;
  }

  // 4. Reconcile cells of pre-existing records (property add/remove).
  const mappedDbPos = tr.mapping.map(dbPos);
  const liveDb = tr.doc.nodeAt(mappedDbPos);
  if (liveDb) {
    const currentRecords = collectRecordNodes(liveDb, mappedDbPos);
    for (const rn of currentRecords) {
      if (rn.recordId == null) continue;
      const cellsChanged = reconcileCellsOfRecord(
        tr,
        schema,
        rn.node,
        rn.pos,
        rn.recordId,
        databaseId,
        properties,
      );
      if (cellsChanged) modified = true;
    }
  }

  // 5. Option A ordering — order record nodes to desired display order.
  const orderChanged = orderDatabaseRecords(
    tr,
    dbPos,
    records.map((r) => r.id),
  );
  if (orderChanged) modified = true;

  return modified;
}

// Order record nodes to match desiredOrder (recordIds). Moves existing node
// instances (preserving their content) rather than recreating them.
export function orderDatabaseRecords(
  tr: Transaction,
  dbPos: number,
  desiredOrder: string[],
): boolean {
  const mappedDbPos = tr.mapping.map(dbPos);
  const dbNode = tr.doc.nodeAt(mappedDbPos);
  if (!dbNode) return false;

  const current: { recordId: string | null; node: PMNode; pos: number }[] = [];
  let childPos = mappedDbPos + 1;
  dbNode.forEach((child) => {
    if (child.type.name === "databaseRecord") {
      current.push({
        recordId: (child.attrs.recordId as string) ?? null,
        node: child,
        pos: childPos,
      });
    }
    childPos += child.nodeSize;
  });

  if (current.length === 0) return false;

  const currentOrder = current.map((c) => c.recordId);
  const desiredFiltered = desiredOrder.filter((id) =>
    currentOrder.includes(id),
  );

  const sameOrder =
    currentOrder.length === desiredFiltered.length &&
    currentOrder.every((id, i) => id === desiredFiltered[i]);
  if (sameOrder) return false;

  const byId = new Map(current.map((c) => [c.recordId, c.node]));
  const firstPos = current[0].pos;
  const last = current[current.length - 1];
  const lastEnd = last.pos + last.node.nodeSize;

  const ordered = desiredFiltered
    .map((id) => byId.get(id))
    .filter((n): n is PMNode => !!n);

  tr.delete(tr.mapping.map(firstPos), tr.mapping.map(lastEnd));
  tr.insert(tr.mapping.map(firstPos), ordered);
  return true;
}
