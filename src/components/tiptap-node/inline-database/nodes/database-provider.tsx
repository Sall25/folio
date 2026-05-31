import { type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import type {
  DatabaseAttrs,
  DatabaseProperty,
  DataSource,
  ID,
} from "../types/types";
import type { UseDatabaseReturn } from "../hooks/use-database";
import { DatabaseContext } from "./database-context";

// ── Provider ───────────────────────────────────────────────────────────────

interface DatabaseProviderProps {
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  editor: Editor;
  children: ReactNode;
  source: DataSource | null;
  updateAttributes: (attributes: Record<string, DatabaseAttrs>) => void;
}

export function DatabaseProvider({
  attrs,
  db,
  editor,
  children,
  updateAttributes,
  source,
}: DatabaseProviderProps) {
  const gridTemplateColumns = attrs.properties
    ? attrs.properties.map((p) => `${p.width ?? 160}px`).join(" ")
    : "1fr 1fr";

  function getProperty(propertyId: ID): DatabaseProperty | undefined {
    return attrs.properties
      ? attrs.properties.find((p) => p.id === propertyId)
      : undefined;
  }

  return (
    <DatabaseContext.Provider
      value={{
        attrs,
        db,
        editor,
        getProperty,
        gridTemplateColumns,
        updateAttributes,
        source,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}
