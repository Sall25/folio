import { useMemo, useState } from "react";
import {
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  rectIntersection,
  type CollisionDetection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type {
  BoardView,
  DatabaseProperty,
  DatabaseView,
  ID,
  Page,
} from "src/types";
import { applyManualOrder } from "../../utils/apply-manual-order";
import { columnKeyFor } from "./utils";

const NONE_COLUMN_ID = "__none__";

export function useBoardDnd({
  resolvedRecords,
  recordById,
  groupProp,
  activeView,
  allColumnIds,
  onUpdateView,
  setGroupValue,
}: {
  resolvedRecords: Page[];
  recordById: Map<string, Page>;
  groupProp: DatabaseProperty | undefined;
  activeView: BoardView | undefined;
  allColumnIds: string[];
  onUpdateView: (patch: Partial<DatabaseView>) => void;
  setGroupValue: (recordId: string, columnId: string) => void;
}) {
  // Manual order applied to the whole record set; bucketing filters it per
  // column, so within-column order comes for free.
  const orderedRecords = useMemo(
    () => applyManualOrder(resolvedRecords, activeView?.manualOrder),
    [resolvedRecords, activeView?.manualOrder],
  );
  const persistedOrder = useMemo(
    () => orderedRecords.map((r) => r.id),
    [orderedRecords],
  );

  // Optimistic order during a drag; falls back to the persisted order.
  const [dragOrder, setDragOrder] = useState<ID[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const effectiveOrder = dragOrder ?? persistedOrder;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Which column a record currently sits in (by its group value).
  const columnOf = (recordId: string): string => {
    if (!groupProp) return NONE_COLUMN_ID;
    const rec = recordById.get(recordId);
    if (!rec) return NONE_COLUMN_ID;
    return columnKeyFor(rec.values?.[groupProp.id], groupProp);
  };

  // Drop target: a card → that card's column; a column body → that id.
  const resolveTargetColumn = (overId: string): string | null => {
    if (allColumnIds.includes(overId)) return overId;
    if (recordById.has(overId)) return columnOf(overId);
    return null;
  };

  // Persist the manual order only when it actually changed.
  const persistIfChanged = (finalOrder: ID[] | null) => {
    if (!finalOrder) return;
    const changed =
      finalOrder.length !== persistedOrder.length ||
      finalOrder.some((id, i) => id !== persistedOrder[i]);
    if (changed)
      onUpdateView({ manualOrder: finalOrder } as Partial<BoardView>);
  };

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    setDragOrder(persistedOrder);
  }

  // Reorder within the flat order as the pointer moves over cards (live
  // same-column reordering). Cross-column movement is resolved at drop.
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

    // Cross-column → change category (lands at end of the target column).
    // Category change re-buckets on the next render.
    if (targetCol && targetCol !== sourceCol) {
      setGroupValue(recordId, targetCol);
      persistIfChanged(finalOrder);
      return;
    }

    // Same column → persist the reordered order (from dragOrder, not `over`,
    // so slow releases still commit).
    persistIfChanged(finalOrder);
  }

  function onDragCancel() {
    setActiveId(null);
    setDragOrder(null);
  }

  // Pointer-based collision, tolerant of slow drags; falls back so a release
  // over a gap still resolves to the nearest card/column.
  const boardCollision: CollisionDetection = (args) => {
    const pointer = pointerWithin(args);
    if (pointer.length > 0) return pointer;
    const rect = rectIntersection(args);
    if (rect.length > 0) return rect;
    return closestCenter(args);
  };

  return {
    sensors,
    activeId,
    effectiveOrder,
    boardCollision,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
  };
}
