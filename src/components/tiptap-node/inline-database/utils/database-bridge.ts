// Cross-NodeView data bridge via editor storage. React context can't cross
// the NodeView boundary (each ReactNodeViewRenderer is its own React root), so
// the database NodeView publishes its per-database data into editor.storage,
// and cell/record NodeViews subscribe to it by database id.
//
// Storage isn't reactive by itself, so each database entry carries a tiny
// listener set; publishing notifies subscribers, who re-read and re-render.

import type { Editor } from "@tiptap/react";
import type {
  CellValue,
  DatabaseProperty,
  DatabaseView,
  ID,
  Page,
} from "src/types";

export interface DatabaseBridgeData {
  sourceId: ID | null;
  properties: DatabaseProperty[];
  view: DatabaseView | undefined;
  locked: boolean;
  templateId?: ID;
  recordsById: Map<ID, Page>;
  columnWidthByProp: Record<ID, number>;
  // Records after the active view's filters and sorts have been applied, in
  // display order. Record NodeViews read this to decide whether they render at
  // all (absent → filtered out) and where (index → CSS order). Filtering and
  // sorting are per-VIEW, so the record nodes themselves never move.
  sortedRecordIds: ID[];
  setCellValue: (recordId: ID, propertyId: ID, value: CellValue | null) => void;
  columnValuesByProp: Record<ID, CellValue[]>;
}

interface DatabaseEntry {
  data: DatabaseBridgeData | null;
  listeners: Set<() => void>;
}

export interface DatabaseStorage {
  entries: Map<string, DatabaseEntry>;
}

// The Tiptap extension `addStorage` should return { database: createStorage() }
// under a key the nodes agree on. We namespace under "databaseBridge".
export function createDatabaseStorage(): DatabaseStorage {
  return { entries: new Map() };
}

declare module "@tiptap/core" {
  interface Storage {
    // Keyed by the node name "database" — where Tiptap puts addStorage().
    database: DatabaseStorage;
  }
}

function getStorage(editor: Editor): DatabaseStorage | null {
  // Tiptap stores addStorage() under editor.storage[nodeName]; the database
  // node is named "database", so that is the key (NOT "databaseBridge").
  return (editor.storage.database as DatabaseStorage) ?? null;
}

/** Database NodeView calls this to publish/update its data + notify cells. */
export function publishDatabaseData(
  editor: Editor,
  databaseId: string,
  data: DatabaseBridgeData,
): void {
  const storage = getStorage(editor);

  if (!storage) return;
  let entry = storage.entries.get(databaseId);
  if (!entry) {
    entry = { data, listeners: new Set() };
    storage.entries.set(databaseId, entry);
  } else {
    entry.data = data;
  }
  // Notify subscribers (cells) that data changed.
  entry.listeners.forEach((fn) => fn());
}

/** Database NodeView calls this on unmount to clean up. */
export function removeDatabaseData(editor: Editor, databaseId: string): void {
  const storage = getStorage(editor);
  if (!storage) return;
  const entry = storage.entries.get(databaseId);
  if (!entry) return;
  entry.data = null;
}

/** Read current data for a database id (no subscription). */
export function readDatabaseData(
  editor: Editor,
  databaseId: string,
): DatabaseBridgeData | null {
  const storage = getStorage(editor);
  return storage?.entries.get(databaseId)?.data ?? null;
}

/** Subscribe to changes for a database id. Returns an unsubscribe fn. */
export function subscribeDatabaseData(
  editor: Editor,
  databaseId: string,
  listener: () => void,
): () => void {
  const storage = getStorage(editor);
  console.log("[bridge] SUBSCRIBE", databaseId, "storage?", !!storage);
  if (!storage) return () => {};
  let entry = storage.entries.get(databaseId);
  if (!entry) {
    // Attach a listener even if the cell mounts before the database publishes.
    // data is NULL (not fake-empty) so readDatabaseData returns null until a
    // real publish — the cell shows its loading/empty branch, then updates.
    entry = { data: null, listeners: new Set() };
    storage.entries.set(databaseId, entry);
  }
  entry.listeners.add(listener);
  console.log("[bridge] SUBSCRIBED, listeners now:", entry.listeners.size);
  return () => {
    const e = storage.entries.get(databaseId);
    e?.listeners.delete(listener);
  };
}
