import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Editor } from "@tiptap/core";
import type {
  BoardView,
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
import { useNewRowEditState } from "./new-row-edit-context";
import { useVisibleSelection } from "../hooks/use-visible-selection";
import { useResolvedRecords } from "../hooks/use-resolved-records";
import { useTableLayout } from "../hooks/use-table-layout";
import { useRecordCreation } from "../hooks/use-record-creation";
import { CardActionsProvider } from "../context";
import { useListLayout } from "../hooks";
import type { BoardDragStorage, BoardDropInfo } from "../extensions";
import { groupValueForColumn } from "../utils/group-value-for-column";

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
  // Memoized — was recomputed (.map().join()) every render.
  const gridTemplateColumns = useMemo(
    () =>
      attrs.properties
        ? attrs.properties.map((p) => `${p.width ?? 160}px`).join(" ")
        : "1fr 1fr",
    [attrs.properties],
  );

  // useCallback — was a plain function (new identity every render).
  const getProperty = useCallback(
    (propertyId: ID): DatabaseProperty | undefined =>
      attrs.properties?.find((p) => p.id === propertyId),
    [attrs.properties],
  );

  const { resolvedTitle: title, handleTitleChange: onTitleChange } =
    useDatabaseTitle({
      attrs,
      sourceName: source?.name,
      sourcePageId: source?.pageId,
      updateSourceMetaAsync,
      updateAttributes: (patch) => updateAttributes({ ...attrs, ...patch }),
    });

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

  const { editingRecordId } = useNewRowEditState();

  const sortedRecords = useResolvedRecords(
    resolvedRecords,
    source,
    db,
    editingRecordId,
  );
  const { tableLayout, groupProp } = useTableLayout(sortedRecords, source, db);

  const { listLayout } = useListLayout(sortedRecords, source, db);

  const { onNewRecord, onNewRecordInGroup } = useRecordCreation({
    editor,
    attrs,
    source,
    groupProp,
    addRecordAsync,
    setCellValue,
    setEditingRecordId,
  });

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

  // a stable onDrop via ref so it always sees current db/source:
  useEffect(() => {
    if (!editor) return;
    const storage = editor.storage.boardDrag as BoardDragStorage;

    // eslint-disable-next-line react-hooks/immutability
    storage.isBoardActive = () => db.activeView?.type === "board";

    storage.onDrop = ({
      recordId,
      targetColumnKey,
      beforeRecordId,
    }: BoardDropInfo) => {
      const view = db.activeView as BoardView;
      if (view?.type !== "board") return;
      const groupProp = source?.properties.find(
        (p) => p.id === view.groupByPropertyId,
      );
      if (!groupProp) return;

      // 1) move column
      setCellValue(
        recordId,
        groupProp.id,
        groupValueForColumn(groupProp, targetColumnKey),
      );

      // 2) reorder
      const order = [...(view.manualOrder ?? [])].filter(
        (id) => id !== recordId,
      );
      if (beforeRecordId) {
        const i = order.indexOf(beforeRecordId);
        order.splice(i === -1 ? order.length : i, 0, recordId);
      } else {
        order.push(recordId);
      }
      db.updateView(view.id, { manualOrder: order } as Partial<BoardView>);
    };
  }, [editor, db, source, setCellValue]);

  // ── Memoize the value object (Technique 2) — the dominant win. ──
  // Was a raw {} rebuilt every render → every consumer (all views, toolbar,
  // headers, chips) re-rendered on every provider render.
  const value = useMemo(
    () => ({
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
      listLayout,
      onNewRecord,
      onNewRecordInGroup,
      visibleSelection,
      selectedRecords,
      onUpdateView,
      visibleProperties,
    }),
    [
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
      listLayout,
      onNewRecord,
      onNewRecordInGroup,
      visibleSelection,
      selectedRecords,
      onUpdateView,
      visibleProperties,
    ],
  );

  return (
    <DatabaseContext.Provider value={value}>
      <CardActionsProvider>
        {children}
        {/* <div className="db-container">{children}</div> */}
      </CardActionsProvider>
    </DatabaseContext.Provider>
  );
}
