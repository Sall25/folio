import { createContext, useContext } from "react";
import type { Editor } from "@tiptap/core";
import type {
  DatabaseAttrs,
  DatabaseProperty,
  DataSource,
  ID,
} from "src/types";
import type { UseDatabaseReturn } from "../hooks/use-database";

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

  updateAttributes: (attributes: Record<string, DatabaseAttrs>) => void;

  source: DataSource | null;
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
