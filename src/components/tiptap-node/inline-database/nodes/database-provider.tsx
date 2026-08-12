import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import type {
  CellValue,
  DatabaseAttrs,
  DatabaseProperty,
  DatabaseView,
  DataSource,
  ID,
  Page,
  PropertyType,
} from "src/types";
import type { UseDatabaseReturn } from "../hooks/use-database";
import { DatabaseContext } from "./database-context";
import { useDatabaseTitle } from "../hooks/use-database-title";
import { useNewRowEdit } from "./new-row-edit-context";
import { useVisibleSelection } from "../hooks/use-visible-selection";
import { useResolvedRecords } from "../hooks/use-resolved-records";
import { useTableLayout } from "../hooks/use-table-layout";
import { useRecordCreation } from "../hooks/use-record-creation";

// ── Provider ───────────────────────────────────────────────────────────────

interface DatabaseProviderProps {
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  editor: Editor;
  children: ReactNode;
  source: DataSource | null;
  resolvedRecords: Page[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateAttributes: (attributes: Record<string, any>) => void;
  updateSourceMetaAsync: (patch: {
    name?: string | undefined;
    pageId?: string | undefined;
  }) => Promise<DataSource>;
  addRecordAsync: (
    opts?:
      | {
          title?: string | undefined;
          templateId?: string | undefined;
        }
      | undefined,
  ) => Promise<Page>;
  setCellValue: (
    recordId: string,
    propertyId: string,
    value: CellValue<PropertyType>,
  ) => void;
  setEditingRecordId: (id: ID) => void;

  visibleProperties: DatabaseProperty[];
}

export function DatabaseProvider({
  attrs,
  db,
  editor,
  children,
  updateAttributes,
  updateSourceMetaAsync,
  source,
  resolvedRecords,
  setEditingRecordId,
  addRecordAsync,
  setCellValue,
  visibleProperties,
}: DatabaseProviderProps) {
  const gridTemplateColumns = attrs.properties
    ? attrs.properties.map((p) => `${p.width ?? 160}px`).join(" ")
    : "1fr 1fr";

  function getProperty(propertyId: ID): DatabaseProperty | undefined {
    return attrs.properties?.find((p) => p.id === propertyId);
  }

  const { resolvedTitle: title, handleTitleChange: onTitleChange } =
    useDatabaseTitle({
      attrs,
      sourceName: source?.name,
      sourcePageId: source?.pageId,
      updateSourceMetaAsync,
      updateAttributes: (patch) => updateAttributes({ ...attrs, ...patch }),
    });

  // Chip-visibility UI state
  const [showFilterChips, setShowFilterChips] = useState(false);
  const [showSortChips, setShowSortChips] = useState(false);
  const onShowFilterChipsChange = useCallback(
    (v: boolean) => setShowFilterChips(v),
    [],
  );
  const onShowSortChipsChange = useCallback(
    (v: boolean) => setShowSortChips(v),
    [],
  );

  const { editingRecordId } = useNewRowEdit();

  // Records: filter → search → sort → pin-editing
  const sortedRecords = useResolvedRecords(
    resolvedRecords,
    source,
    db,
    editingRecordId,
  );

  // Table grouping + row layout
  const { tableLayout, groupProp } = useTableLayout(sortedRecords, source, db);

  // New-record handlers
  const { onNewRecord, onNewRecordInGroup } = useRecordCreation({
    editor,
    attrs,
    source,
    groupProp,
    addRecordAsync,
    setCellValue,
    setEditingRecordId,
  });

  // Selection ∩ visible rows
  const visibleSelection = useVisibleSelection(
    attrs.id ?? null,
    tableLayout.rowSlots,
  );
  const selectedRecords = useMemo(
    () => sortedRecords.filter((r) => visibleSelection.includes(r.id)),
    [sortedRecords, visibleSelection],
  );

  const activeView = db.activeView;
  const onUpdateView = useCallback(
    (patch: Partial<DatabaseView>) => {
      if (activeView) db.updateView(activeView.id, patch);
    },
    [db, activeView],
  );

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
        showFilterChips,
        onShowFilterChipsChange,
        showSortChips,
        onShowSortChipsChange,
        title,
        onTitleChange,
        sortedRecords,
        tableLayout,
        onNewRecord,
        onNewRecordInGroup,
        visibleSelection,
        selectedRecords,
        onUpdateView,
        visibleProperties,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}
