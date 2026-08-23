import { Plus } from "lucide-react";
import { memo, useCallback, useMemo } from "react";
import { useDataSource } from "../../hooks/use-data-source";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { SelectCellDisplay } from "../../primitives/select-cell-display";
import { StatusCellDisplay } from "../../primitives/status-cell-display";
import { CheckboxCellDisplay } from "../../primitives/checkbox-cell-display";
import { BoardCard } from "../../primitives/board-card";
import type {
  BoardView,
  Page,
  StatusGroup,
  CellValue,
  DatabaseProperty,
  ID,
} from "src/types";
import "./database-board-node-view.scss";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { BoardColumn } from "../../primitives/board-column";
import { pillClass } from "../../utils/pill-colors";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { columnKeyFor, getColumnDefs } from "./utils";
import { SortableBoardCard } from "./sortable-board-card";
import { useBoardDnd } from "./use-board-dnd";
import { useDatabaseContext } from "../database-context";
import { removeRecordNode } from "../../hooks/use-database-seed";

const EMPTY_PROPERTIES: DatabaseProperty[] = [];

const NONE_COLUMN_ID = "__none__";

interface ColumnDef {
  id: string;
  label: string;
  color?: string;
}

function DatabaseBoardNodeViewImpl({
  onLayout,
  onPropertyVisibility,
  onDuplicateRecord,
}: {
  onLayout?: () => void;
  onPropertyVisibility?: () => void;
  onDuplicateRecord?: (recordId: string) => void;
}) {
  const {
    attrs,
    db,
    source,
    onUpdateView,
    sortedRecords: resolvedRecords,
    editor,
  } = useDatabaseContext();
  const view = db.activeView;

  const { addRecordAsync, setCellValue, removeRecordAsync } = useDataSource(
    attrs.sourceId,
  );
  const onDeleteRecord = useCallback(
    (recId: ID) => {
      removeRecordAsync(recId);
      removeRecordNode(editor, attrs.id, recId);
    },
    [editor, attrs.id, removeRecordAsync],
  );

  const { mutateAsync: patchPageAsync } = usePatchPage(({ id, patch }) =>
    patchPage(id, patch),
  );

  const activeView = (attrs.views.find((v) => v.id === attrs.activeViewId) ??
    attrs.views[0]) as BoardView | undefined;
  const groupByPropertyId = activeView?.groupByPropertyId ?? "";
  const groupProp = source?.properties.find((p) => p.id === groupByPropertyId);
  const columnDefs = useMemo(() => getColumnDefs(groupProp), [groupProp]);

  const allColumns: ColumnDef[] = useMemo(
    () => [
      { id: NONE_COLUMN_ID, label: `No ${groupProp?.name ?? ""}` },
      ...columnDefs,
    ],
    [columnDefs, groupProp?.name],
  );

  const recordById = useMemo(
    () => new Map(resolvedRecords.map((r) => [r.id, r])),
    [resolvedRecords],
  );

  // Set a record's group value from a column id (category change on drop/new).
  function setGroupValue(recordId: string, columnId: string) {
    if (!groupProp) return;
    if (columnId === NONE_COLUMN_ID) {
      setCellValue(recordId, groupProp.id, null);
      return;
    }
    const cfg = groupProp.config;
    let value: CellValue | null = null;
    if (cfg.type === "select")
      value = cfg.options.find((o) => o.id === columnId) ?? null;
    else if (cfg.type === "multi_select") {
      const o = cfg.options.find((x) => x.id === columnId);
      value = o ? [o] : [];
    } else if (cfg.type === "status") value = columnId;
    else if (cfg.type === "checkbox") value = columnId === "true";
    setCellValue(recordId, groupProp.id, value);
  }

  // All drag-and-drop state, handlers, and the effective (optimistic) order.
  const {
    sensors,
    activeId,
    effectiveOrder,
    boardCollision,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
  } = useBoardDnd({
    resolvedRecords,
    recordById,
    groupProp,
    activeView,
    allColumnIds: allColumns.map((c) => c.id),
    onUpdateView,
    setGroupValue,
  });

  // Bucket records into columns, honoring the effective order. Column
  // membership comes from the group value; order only sequences within.
  const buckets = useMemo(() => {
    const map = new Map<string, Page[]>();
    allColumns.forEach((c) => map.set(c.id, []));
    if (!groupProp) return map;
    for (const id of effectiveOrder) {
      const rec = recordById.get(id);
      if (!rec) continue;
      const key = columnKeyFor(rec.values?.[groupProp.id], groupProp);
      (map.get(key) ?? map.get(NONE_COLUMN_ID)!).push(rec);
    }
    return map;
  }, [effectiveOrder, recordById, groupProp, allColumns]);

  const columnValuesByProp = useMemo(() => {
    if (!source) return {};
    const map: Record<string, CellValue[]> = {};
    for (const prop of source.properties) {
      if (prop.config.type !== "number") continue;
      map[prop.id] = resolvedRecords.map(
        (r) => (r.values?.[prop.id] ?? null) as CellValue,
      );
    }
    return map;
  }, [resolvedRecords, source]);

  const colWidth = 260;
  const activeRecord = activeId ? (recordById.get(activeId) ?? null) : null;

  const onChange = useCallback(
    (propId: ID, v: CellValue, rec: Page) => setCellValue(rec.id, propId, v),
    [setCellValue],
  );
  const onCoverPositionChange = useCallback(
    (recordId: ID, positionY: number, rec: Page) =>
      patchPageAsync({
        id: recordId,
        patch: {
          cover: { ...(rec.cover ?? {}), positionY },
        },
      }),
    [patchPageAsync],
  );

  if (!groupByPropertyId || columnDefs.length === 0) {
    return (
      <div className="db-board-empty">
        <p>
          Set a Status or Select property as the group property to use board
          view.
        </p>
      </div>
    );
  }

  const cardProps =
    source?.properties.filter(
      (p) =>
        p.id !== groupProp?.id &&
        !(activeView?.hiddenProperties ?? []).includes(p.id),
    ) ?? EMPTY_PROPERTIES;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={boardCollision}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div
        className="db-board"
        data-type="database-board"
        style={{ ["--db-board-col-width" as string]: `${colWidth}px` }}
      >
        {allColumns.map((col) => {
          const recs = buckets.get(col.id) ?? [];
          const colItemIds = recs.map((r) => r.id);
          return (
            <div
              key={col.id}
              className={
                col.color
                  ? pillClass("db-board-col", col.color)
                  : "db-board-col"
              }
              style={{
                ...(col.color
                  ? {
                      ["--col-color" as string]: `var(--tt-color-text-${col.color})`,
                    }
                  : {}),
              }}
              data-colored={col.color ? "true" : undefined}
            >
              <div className="db-board-col-header">
                {col.id === NONE_COLUMN_ID ? (
                  <span className="db-board-col-header__label">
                    {col.label}
                  </span>
                ) : groupProp?.config.type === "select" ? (
                  <SelectCellDisplay
                    value={
                      groupProp.config.options.find((o) => o.id === col.id) ??
                      null
                    }
                    options={groupProp.config.options}
                    readonly
                  />
                ) : groupProp?.config.type === "status" ? (
                  <StatusCellDisplay
                    value={col.id}
                    groups={
                      (groupProp.config as { groups: StatusGroup[] }).groups
                    }
                    readonly
                  />
                ) : groupProp?.config.type === "checkbox" ? (
                  <CheckboxCellDisplay value={col.id === "true"} readonly />
                ) : (
                  <span className="db-board-col-header__label">
                    {col.label}
                  </span>
                )}
              </div>

              <SortableContext
                items={colItemIds}
                strategy={verticalListSortingStrategy}
              >
                <BoardColumn columnId={col.id} isOver={false}>
                  {recs.map((rec) => (
                    <SortableBoardCard key={rec.id} id={rec.id}>
                      <BoardCard
                        record={rec}
                        properties={cardProps}
                        cardPreview={activeView?.cardPreview ?? "none"}
                        sourceId={attrs.sourceId!}
                        onChange={onChange}
                        view={view}
                        columnValuesByProp={columnValuesByProp}
                        onCoverPositionChange={onCoverPositionChange}
                        onDelete={onDeleteRecord}
                        onDuplicate={onDuplicateRecord}
                        onLayout={onLayout}
                        onPropertyVisibility={onPropertyVisibility}
                        disableDrag
                      />
                    </SortableBoardCard>
                  ))}
                </BoardColumn>
              </SortableContext>

              <Button
                type="button"
                className="db-new-row db-board-col-footer__add"
                onClick={async () => {
                  const row = await addRecordAsync({ title: "" });
                  setGroupValue(row.id, col.id);
                }}
              >
                <Plus className="tiptap-button-icon" />
                <span className="tiptap-button-text">New Page</span>
              </Button>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeRecord ? (
          <div className="db-board-card db-board-card--overlay">
            {cardProps.find((p) => p.config.type === "title") && (
              <span className="db-board-card__title-text">
                {String(
                  activeRecord.values?.[
                    cardProps.find((p) => p.config.type === "title")!.id
                  ] ?? "Untitled",
                )}
              </span>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export const DatabaseBoardNodeView = memo(DatabaseBoardNodeViewImpl);
