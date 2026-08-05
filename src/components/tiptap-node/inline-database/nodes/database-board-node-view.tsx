import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useDataSource } from "../hooks/use-data-source";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { SelectCellDisplay } from "../primitives/select-cell-display";
import { StatusCellDisplay } from "../primitives/status-cell-display";
import { CheckboxCellDisplay } from "../primitives/checkbox-cell-display";
import { BoardCard } from "../primitives/board-card";
import type {
  BoardView,
  DataSource,
  Page,
  DatabaseProperty,
  StatusGroup,
  CellValue,
  DatabaseAttrs,
  DatabaseView,
  ID,
} from "src/types";
import "./database-board-node-view.scss";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BoardColumn } from "../primitives/board-column";
import { pillClass } from "../utils/pill-colors";
import { applyManualOrder } from "../utils/apply-manual-order";
import { Button } from "src/components/tiptap-ui-primitive/button";

const NONE_COLUMN_ID = "__none__";

interface ColumnDef {
  id: string;
  label: string;
  color?: string;
}

function getColumnDefs(prop: DatabaseProperty | undefined): ColumnDef[] {
  if (!prop) return [];
  const config = prop.config;
  if (config.type === "select" || config.type === "multi_select") {
    return config.options.map((o) => ({
      id: o.id,
      label: o.label,
      color: o.color,
    }));
  }
  if (config.type === "status") {
    return config.groups.flatMap((g) =>
      g.items.map((i) => ({ id: i.id, label: i.name, color: i.color })),
    );
  }
  if (config.type === "checkbox") {
    return [
      { id: "true", label: "Checked" },
      { id: "false", label: "Unchecked" },
    ];
  }
  return [];
}

function columnKeyFor(value: unknown, prop: DatabaseProperty): string {
  if (value == null) return NONE_COLUMN_ID;
  const t = prop.config.type;
  if (t === "checkbox") return value ? "true" : "false";
  if (t === "select" || t === "status") {
    return typeof value === "object" && value !== null && "id" in value
      ? String((value as { id: string }).id)
      : String(value);
  }
  if (t === "multi_select") {
    const arr = Array.isArray(value) ? value : [];
    const first = arr[0];
    if (first == null) return NONE_COLUMN_ID;
    return typeof first === "object" && "id" in first
      ? String((first as { id: string }).id)
      : String(first);
  }
  return NONE_COLUMN_ID;
}

// Sortable wrapper — owns the drag so BoardCard runs with disableDrag.
function SortableBoardCard({
  id,
  children,
}: {
  id: ID;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

export function DatabaseBoardNodeView({
  attrs,
  source,
  view,
  onUpdateView,
  onLayout,
  onPropertyVisibility,
  onDeleteRecord,
  onDuplicateRecord,
}: {
  view: DatabaseView;
  attrs: DatabaseAttrs;
  source: DataSource;
  onUpdateView: (patch: Partial<DatabaseView>) => void;
  onLayout?: () => void;
  onPropertyVisibility?: () => void;
  onDeleteRecord?: (recordId: string) => void;
  onDuplicateRecord?: (recordId: string) => void;
}) {
  const { resolvedRecords, addRecordAsync, setCellValue } = useDataSource(
    attrs.sourceId,
  );

  const { mutateAsync: patchPageAsync } = usePatchPage(({ id, patch }) =>
    patchPage(id, patch),
  );

  const activeView = (attrs.views.find((v) => v.id === attrs.activeViewId) ??
    attrs.views[0]) as BoardView | undefined;
  const groupByPropertyId = activeView?.groupByPropertyId ?? "";
  const groupProp = source.properties.find((p) => p.id === groupByPropertyId);
  const columnDefs = useMemo(() => getColumnDefs(groupProp), [groupProp]);

  const allColumns: ColumnDef[] = useMemo(
    () => [
      { id: NONE_COLUMN_ID, label: `No ${groupProp?.name ?? ""}` },
      ...columnDefs,
    ],
    [columnDefs, groupProp?.name],
  );

  // Manual order applied to the whole record set, then bucketed. Filtering the
  // flat order per column gives within-column order for free.
  const orderedRecords = useMemo(
    () => applyManualOrder(resolvedRecords, activeView?.manualOrder),
    [resolvedRecords, activeView?.manualOrder],
  );
  const persistedOrder = useMemo(
    () => orderedRecords.map((r) => r.id),
    [orderedRecords],
  );

  // Optimistic order during a drag — same pattern as the gallery.
  const [dragOrder, setDragOrder] = useState<ID[] | null>(null);
  const effectiveOrder = dragOrder ?? persistedOrder;

  const recordById = useMemo(
    () => new Map(resolvedRecords.map((r) => [r.id, r])),
    [resolvedRecords],
  );

  // Bucket records into columns, honoring the effective (possibly optimistic)
  // order. Column membership still comes from the group value, NOT from the
  // order array — order only sequences within a column.
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

  const colWidth = 260;

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  // Which column does a record currently sit in (by its group value)?
  const columnOf = (recordId: string): string => {
    if (!groupProp) return NONE_COLUMN_ID;
    const rec = recordById.get(recordId);
    if (!rec) return NONE_COLUMN_ID;
    return columnKeyFor(rec.values?.[groupProp.id], groupProp);
  };

  // Resolve the drop target's column: dropping onto a card → that card's
  // column; dropping onto a column body → that column id directly.
  const resolveTargetColumn = (overId: string): string | null => {
    if (allColumns.some((c) => c.id === overId)) return overId; // column body
    if (recordById.has(overId)) return columnOf(overId); // a card
    return null;
  };

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    setDragOrder(persistedOrder);
  }

  // Reorder within the flat order as the pointer moves over cards (same column
  // reordering feels live). Cross-column visual movement is handled at drop.
  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    if (activeIdStr === overIdStr) return;
    if (!recordById.has(overIdStr)) return; // over a column body, not a card

    setDragOrder((prev) => {
      const base = prev ?? persistedOrder;
      const from = base.indexOf(activeIdStr);
      const to = base.indexOf(overIdStr);
      if (from === -1 || to === -1) return base;
      const next = [...base];
      next.splice(from, 1);
      next.splice(to, 0, activeIdStr);
      return next;
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const recordId = String(active.id);
    const finalOrder = dragOrder;
    setActiveId(null);
    setDragOrder(null);

    if (!over) return;

    const sourceCol = columnOf(recordId);
    const targetCol = resolveTargetColumn(String(over.id));

    // Cross-column → change category (lands at end of target column, per your
    // choice 2a). Category change re-buckets on the next render.
    if (targetCol && targetCol !== sourceCol) {
      setGroupValue(recordId, targetCol);
      // Also persist the order so the card keeps a stable slot rather than
      // jumping — optional but keeps things tidy.
      if (finalOrder) {
        const changed =
          finalOrder.length !== persistedOrder.length ||
          finalOrder.some((id, i) => id !== persistedOrder[i]);
        if (changed)
          onUpdateView({ manualOrder: finalOrder } as Partial<BoardView>);
      }
      return;
    }

    // Same column → persist the reordered manual order (from dragOrder, not
    // from `over`, so slow releases still commit — the gallery lesson).
    if (finalOrder) {
      const changed =
        finalOrder.length !== persistedOrder.length ||
        finalOrder.some((id, i) => id !== persistedOrder[i]);
      if (changed)
        onUpdateView({ manualOrder: finalOrder } as Partial<BoardView>);
    }
  }

  function onDragCancel() {
    setActiveId(null);
    setDragOrder(null);
  }

  const activeRecord = activeId ? (recordById.get(activeId) ?? null) : null;

  const columnValuesByProp = useMemo(() => {
    const map: Record<string, CellValue[]> = {};
    for (const prop of source.properties) {
      if (prop.config.type !== "number") continue;
      map[prop.id] = resolvedRecords.map(
        (r) => (r.values?.[prop.id] ?? null) as CellValue,
      );
    }
    return map;
  }, [resolvedRecords, source.properties]);

  // Pointer-based collision, tolerant of slow drags; falls back so a release
  // over a gap still resolves to the nearest card/column.
  const boardCollision: CollisionDetection = (args) => {
    const pointer = pointerWithin(args);
    if (pointer.length > 0) return pointer;
    const rect = rectIntersection(args);
    if (rect.length > 0) return rect;
    return closestCenter(args);
  };

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

  const cardProps = source.properties.filter(
    (p) =>
      p.id !== groupProp?.id &&
      !(activeView?.hiddenProperties ?? []).includes(p.id),
  );

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
                        onChange={(propId, v) =>
                          setCellValue(rec.id, propId, v)
                        }
                        view={view}
                        columnValuesByProp={columnValuesByProp}
                        onCoverPositionChange={(recordId, positionY) =>
                          patchPageAsync({
                            id: recordId,
                            patch: {
                              cover: { ...(rec.cover ?? {}), positionY },
                            },
                          })
                        }
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
                <span className="tiptap-button-text">New</span>
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
