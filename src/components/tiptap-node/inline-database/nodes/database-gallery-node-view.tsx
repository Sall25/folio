import { Plus } from "lucide-react";
import { useDataSource } from "../hooks/use-data-source";
import { BoardCard } from "../primitives/board-card";
import type {
  CellValue,
  DatabaseProperty,
  GalleryView,
  ID,
  Page,
} from "src/types";
import "./database-gallery-node-view.scss";
import { memo, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragOverEvent,
  type CollisionDetection,
  pointerWithin,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { applyManualOrder } from "../utils/apply-manual-order";
import { useDatabaseContext } from "./database-context";
import { recordMatchesFilters } from "../utils/apply-filters";
import { sortRecords } from "../utils/apply-sorts";

// Pointer-based first (tolerant of slow drags over gaps), then fall back to
// closestCenter so a release over padding still snaps to the nearest card.
const galleryCollision: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length > 0) return pointer;
  return closestCenter(args);
};

const CARD_COLUMNS = {
  small: 5,
  medium: 4,
  large: 3,
} as const;

function SortableGalleryCard({
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
      className="db-gallery__card"
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

const EMPTY_PROPERTIES: DatabaseProperty[] = [];

function DatabaseGalleryNodeViewImpl() {
  const { attrs, source, onUpdateView, db } = useDatabaseContext();
  const view = db.activeView;
  const { resolvedRecords, addRecordAsync, setCellValue } = useDataSource(
    attrs.sourceId,
  );

  const activeView = (attrs.views.find((v) => v.id === attrs.activeViewId) ??
    attrs.views[0]) as GalleryView | undefined;

  const cardSize = activeView?.cardSize ?? "medium";
  const coverFit = activeView?.coverFit ?? "cover";
  const cardCols = CARD_COLUMNS[cardSize];

  const hidden = new Set(activeView?.hiddenProperties ?? []);
  const cardProps =
    source?.properties.filter((p) => !hidden.has(p.id)) ?? EMPTY_PROPERTIES;

  // Manual drag order overrides the incoming (sorted) order.
  // Persisted order from the view.
  const persistedOrder = useMemo(
    () =>
      applyManualOrder(resolvedRecords, activeView?.manualOrder).map(
        (r) => r.id,
      ),
    [resolvedRecords, activeView?.manualOrder],
  );
  // Optimistic order held ONLY during a drag. null = not dragging, use persisted.
  const [dragOrder, setDragOrder] = useState<ID[] | null>(null);

  // If the underlying records change (add/delete) while not dragging, the
  // persisted order is the source of truth — nothing to reconcile.
  const orderedIds = dragOrder ?? persistedOrder;

  const recordById = useMemo(
    () => new Map(resolvedRecords.map((r) => [r.id, r])),
    [resolvedRecords],
  );
  const orderedRecords = useMemo(
    () =>
      orderedIds.map((id) => recordById.get(id)).filter((r): r is Page => !!r),
    [orderedIds, recordById],
  );
  const columnValuesByProp = useMemo(() => {
    if (!source) return;
    const map: Record<string, CellValue[]> = {};
    for (const prop of source.properties) {
      if (prop.config.type !== "number") continue;
      map[prop.id] = orderedRecords.map(
        (r) => (r.values?.[prop.id] ?? null) as CellValue,
      );
    }
    return map;
  }, [orderedRecords, source]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function onDragStart() {
    // Seed the optimistic order from the persisted one at drag start.
    setDragOrder(persistedOrder);
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setDragOrder((prev) => {
      const base = prev ?? persistedOrder;
      const from = base.indexOf(String(active.id));
      const to = base.indexOf(String(over.id));
      if (from === -1 || to === -1) return base;
      return arrayMove(base, from, to);
    });
  }

  function onDragEnd() {
    const finalOrder = dragOrder;
    setDragOrder(null);
    if (!finalOrder) return;
    // Persist if the optimistic order ended up different from what's saved —
    // independent of whether `over` resolved at the release point.
    const changed =
      finalOrder.length !== persistedOrder.length ||
      finalOrder.some((id, i) => id !== persistedOrder[i]);
    if (changed) {
      onUpdateView({ manualOrder: finalOrder } as Partial<GalleryView>);
    }
  }

  function onDragCancel() {
    setDragOrder(null);
  }

  const visibleRecords = useMemo(() => {
    const filters = activeView?.filters;
    const filtered = filters?.length
      ? resolvedRecords.filter((r) =>
          recordMatchesFilters(r, filters, source?.properties),
        )
      : resolvedRecords;
    return sortRecords(filtered, activeView?.sorts ?? [], source?.properties);
  }, [
    resolvedRecords,
    activeView?.filters,
    activeView?.sorts,
    source?.properties,
  ]);

  return (
    <div
      className="db-gallery"
      data-type="database-gallery"
      style={
        {
          "--db-gallery-cols": cardCols,
          "--db-gallery-cover-fit": coverFit,
        } as React.CSSProperties
      }
    >
      <DndContext
        sensors={sensors}
        collisionDetection={galleryCollision}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
          <div className="db-gallery__body">
            {visibleRecords.map((rec) => (
              <SortableGalleryCard key={rec.id} id={rec.id}>
                <BoardCard
                  record={rec}
                  properties={cardProps}
                  cardPreview="cover"
                  sourceId={attrs.sourceId!}
                  onChange={(propId, v) => setCellValue(rec.id, propId, v)}
                  view={view}
                  columnValuesByProp={columnValuesByProp}
                  disableDrag
                />
              </SortableGalleryCard>
            ))}
            <button
              type="button"
              className="db-new-card db-new-card--gallery"
              contentEditable={false}
              onClick={() => addRecordAsync({ title: "" })}
            >
              <span className="db-new-card__label">
                <Plus size={16} />
                <span>New page</span>
              </span>
            </button>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export const DatabaseGalleryNodeView = memo(DatabaseGalleryNodeViewImpl);
