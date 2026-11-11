import { createContext, useContext } from "react";
import type { Editor } from "@tiptap/core";
import type {
  DatabaseAttrs,
  DatabaseProperty,
  DatabaseView,
  DataSource,
  ID,
  Page,
} from "src/types";
import type { UseDatabaseReturn } from "../hooks/use-database";
import type { GroupedRowLayout } from "../utils/group-rows";
import type { AssigneeCounts } from "../utils/assignee";
import type { SubItemInfo } from "../utils/sub-items";

// ── Context shape ──────────────────────────────────────────────────────────

interface DatabaseContextValue {
  /** The database node's attrs — schema, views, id */
  attrs: DatabaseAttrs;
  /** The full db hook return — commands, search, panels, etc. */
  db: UseDatabaseReturn;
  /** The Tiptap editor instance */
  editor: Editor;
  /** Shortcut to look up a property by id */
  getProperty: (propertyId: ID) => DatabaseProperty | undefined;
  /** The computed grid template columns string */
  gridTemplateColumns: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateAttributes: (attributes: Record<string, any>) => void;

  source: DataSource | null;

  showFilterChips: boolean;
  onShowFilterChipsChange: (v: boolean) => void;

  showSortChips: boolean;
  onShowSortChipsChange: (v: boolean) => void;

  title: string;
  onTitleChange: (v: string) => void;

  sortedRecords: Page[];
  /** Rows per assignee, for the people bar (null: no person property). */
  peopleCounts: AssigneeCounts | null;
  /** Sub-items: each shown row's depth, rows under it, open or not (null:
   *  the database has none, or the view doesn't show them). */
  subItems: Record<ID, SubItemInfo> | null;
  /** The database's stored "Parent" property (sub-items), if any. */
  parentPropertyId: ID | null;

  tableLayout: GroupedRowLayout<"table">;
  listLayout: GroupedRowLayout<"list">;

  onNewRecord: () => void;
  onNewRecordInGroup: (groupKeys: ID) => void;

  visibleSelection: ID[];
  selectedRecords: Page[];

  onUpdateView: (patch: Partial<DatabaseView>) => void;

  visibleProperties: DatabaseProperty[];

  /** Table / list: put a row just before another (null = at the end).
   *  In a sorted view it asks to remove the sort first. */
  reorderRecord: (recordId: ID, beforeRecordId: ID | null) => void;
  /** Move up (-1) / Move down (+1), within the row's group. */
  moveRecordBy: (recordId: ID, delta: -1 | 1) => void;
  /** Whether the row can move that way (not already first / last). */
  canMoveRecord: (recordId: ID, delta: -1 | 1) => boolean;
}

// ── Context ────────────────────────────────────────────────────────────────

export const DatabaseContext = createContext<DatabaseContextValue | null>(null);

// ── Hook ───────────────────────────────────────────────────────────────────

export function useDatabaseContext(): DatabaseContextValue {
  const ctx = useContext(DatabaseContext);
  if (!ctx) {
    throw new Error(
      "useDatabaseContext must be used inside a DatabaseProvider",
    );
  }
  return ctx;
}
