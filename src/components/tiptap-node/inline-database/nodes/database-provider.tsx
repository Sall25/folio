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
  CalendarView,
  CellValue,
  DatabaseAttrs,
  DatabaseProperty,
  DatabaseView,
  DataSource,
  GalleryView,
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
import { CardActionsProvider, TimelineViewProvider } from "../context";
import { useListLayout } from "../hooks";
import type { DragStorage, DropInfo } from "../extensions";
import { groupValueForColumn } from "../utils/group-value-for-column";
import { CalendarViewProvider } from "../context/calendar-view-provider";

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
  const gridTemplateColumns = useMemo(
    () =>
      attrs.properties
        ? attrs.properties.map((p) => `${p.width ?? 160}px`).join(" ")
        : "1fr 1fr",
    [attrs.properties],
  );

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
    const storage = editor.storage.boardDrag as DragStorage;

    // eslint-disable-next-line react-hooks/immutability
    storage.isBoardActive = () => db.activeView?.type === "board";

    storage.onDrop = ({
      recordId,
      targetColumnKey,
      targetDate,
      beforeRecordId,
    }: DropInfo) => {
      const view = db.activeView;

      if (view.type === "gallery") {
        const currentOrder =
          view.manualOrder ?? sortedRecords.map((record) => record.id);

        const order = currentOrder.filter((id) => id !== recordId);

        if (beforeRecordId) {
          const index = order.indexOf(beforeRecordId);
          order.splice(index === -1 ? order.length : index, 0, recordId);
        } else {
          order.push(recordId);
        }

        db.updateView(view.id, {
          manualOrder: order,
        } as Partial<GalleryView>);

        return;
      }

      if (view.type === "calendar") {
        const dateProp = source?.properties.find(
          (p) =>
            p.id === (view as CalendarView).datePropertyId &&
            p.config.type === "date",
        );

        const resolvedDateProp =
          dateProp ?? source?.properties.find((p) => p.config.type === "date");

        if (!resolvedDateProp || !targetDate) return;

        const record = sortedRecords.find((r) => r.id === recordId);
        const raw = record?.values?.[resolvedDateProp.id];

        // Preserve an existing end date — shift BOTH start and end by the
        // same day-delta, same principle as timeline's onBarDragEnd. Without
        // this, dropping a multi-day event on a new day silently truncated
        // it back to a single day by overwriting with a plain string.
        let currentStart: Date | null = null;
        let currentEnd: Date | null = null;
        if (typeof raw === "string") {
          currentStart = new Date(raw);
        } else if (raw && typeof raw === "object" && "start" in raw) {
          const r = raw as { start?: string; end?: string };
          currentStart = r.start ? new Date(r.start) : null;
          currentEnd = r.end ? new Date(r.end) : null;
        }

        const newStart = new Date(targetDate);

        if (currentStart && currentEnd) {
          const deltaDays = Math.round(
            (newStart.getTime() - currentStart.getTime()) / 86_400_000,
          );
          const newEnd = new Date(currentEnd);
          newEnd.setDate(newEnd.getDate() + deltaDays);

          setCellValue(recordId, resolvedDateProp.id, {
            start: newStart.toISOString(),
            end: newEnd.toISOString(),
          });
        } else {
          setCellValue(recordId, resolvedDateProp.id, targetDate);
        }

        const currentOrder =
          view.manualOrder ?? sortedRecords.map((record) => record.id);

        const order = currentOrder.filter((id) => id !== recordId);

        if (beforeRecordId) {
          const index = order.indexOf(beforeRecordId);
          order.splice(index === -1 ? order.length : index, 0, recordId);
        } else {
          order.push(recordId);
        }

        db.updateView(view.id, {
          manualOrder: order,
        } as Partial<CalendarView>);

        return;
      }

      if (view.type !== "board") return;

      const groupProp = source?.properties.find(
        (p) => p.id === view.groupByPropertyId,
      );

      if (!groupProp) return;

      if (targetColumnKey) {
        setCellValue(
          recordId,
          groupProp.id,
          groupValueForColumn(groupProp, targetColumnKey),
        );
      }

      const currentOrder =
        view.manualOrder ?? sortedRecords.map((record) => record.id);

      const order = currentOrder.filter((id) => id !== recordId);

      if (beforeRecordId) {
        const index = order.indexOf(beforeRecordId);
        order.splice(index === -1 ? order.length : index, 0, recordId);
      } else {
        order.push(recordId);
      }

      db.updateView(view.id, {
        manualOrder: order,
      } as Partial<BoardView>);
    };

    storage.getActiveView = () => db.activeView.type;
  }, [editor, db, source, setCellValue, sortedRecords]);

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
        <CalendarViewProvider>
          <TimelineViewProvider>{children}</TimelineViewProvider>
        </CalendarViewProvider>
      </CardActionsProvider>
    </DatabaseContext.Provider>
  );
}
