import { type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import type { DatabaseAttrs, DatabaseProperty, ID } from "../types/types";
import type { UseDatabaseReturn } from "../hooks/use-database";
import { DatabaseContext } from "./database-context";

// ── Provider ───────────────────────────────────────────────────────────────

interface DatabaseProviderProps {
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  editor: Editor;
  children: ReactNode;
  updateAttributes: (attributes: Record<string, DatabaseAttrs>) => void;
}

export function DatabaseProvider({
  attrs,
  db,
  editor,
  children,
  updateAttributes,
}: DatabaseProviderProps) {
  const gridTemplateColumns = attrs.properties
    .map((p) => `${p.width ?? 160}px`)
    .join(" ");

  function getProperty(propertyId: ID): DatabaseProperty | undefined {
    return attrs.properties.find((p) => p.id === propertyId);
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
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}
