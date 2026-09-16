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

  tableLayout: GroupedRowLayout<"table">;
  listLayout: GroupedRowLayout<"list">;

  onNewRecord: () => void;
  onNewRecordInGroup: (groupKeys: ID) => void;

  visibleSelection: ID[];
  selectedRecords: Page[];

  onUpdateView: (patch: Partial<DatabaseView>) => void;

  visibleProperties: DatabaseProperty[];
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
