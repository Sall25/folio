import { useEffect, useCallback, useSyncExternalStore } from "react";
import type { Editor } from "@tiptap/react";
import {
  publishDatabaseData,
  removeDatabaseData,
  readDatabaseData,
  subscribeDatabaseData,
  type DatabaseBridgeData,
} from "../utils/database-bridge";

/**
 * Cell/record NodeViews use this to read their database's bridge data and
 * re-render when it changes. Uses useSyncExternalStore — the purpose-built
 * React primitive for subscribing to an external store — so there's no manual
 * setState-in-effect (which React flags as cascading renders).
 *
 * Returns null until the database has published (cells can mount first).
 */
export function useDatabaseBridgeData(
  editor: Editor | null,
  databaseId: string | null,
): DatabaseBridgeData | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!editor || !databaseId) return () => {};
      return subscribeDatabaseData(editor, databaseId, onChange);
    },
    [editor, databaseId],
  );

  const getSnapshot = useCallback(() => {
    if (!editor || !databaseId) return null;
    return readDatabaseData(editor, databaseId);
  }, [editor, databaseId]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * The database NodeView calls this to publish its data. Publishing notifies
 * subscribed cells. Cleans up on unmount of the database node.
 */
export function usePublishDatabaseData(
  editor: Editor | null,
  databaseId: string | null,
  data: DatabaseBridgeData,
): void {
  // Publish whenever data changes. IMPORTANT: no cleanup here — cleaning up on
  // every data change would delete the storage entry (and every subscribed
  // cell's listener), so cells would stop receiving updates after the first
  // change. Publishing just replaces entry.data and notifies listeners.
  useEffect(() => {
    if (!editor || !databaseId) return;
    publishDatabaseData(editor, databaseId, data);
  }, [editor, databaseId, data]);

  // Remove the entry ONLY on true unmount of the database node (or when the
  // id/editor identity itself changes), never on data updates.
  useEffect(() => {
    if (!editor || !databaseId) return;
    return () => {
      removeDatabaseData(editor, databaseId);
    };
  }, [editor, databaseId]);
}
