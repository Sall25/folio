// The table's header row: the property columns (draggable to reorder,
// resizable), plus the trailing actions cell (add-property popover + options
// menu). Stays imperative — headers are schema, not record data.

import React, { type CSSProperties } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { PropertyHeader } from "../components/property-header";
import { ResizableNodeProvider } from "../../figure-node";
import {
  type DatabaseProperty,
  type DatabaseView,
  type PropertyConfig,
} from "src/types";
import type { TableView } from "src/types";
import "./database-table-header.scss";
import { AddPropertyPopover } from "../components/add-property-popover";

type PropertyType = PropertyConfig["type"];

interface Props {
  visibleProperties: DatabaseProperty[];
  allProperties: DatabaseProperty[];
  activeView: DatabaseView | undefined;
  locked: boolean;
  gridTemplateColumns: string;
  widthFor: (p: DatabaseProperty) => number;
  optionsMenu?: React.ReactNode;
  onReorder: (orderedIds: string[]) => void;
  onAddProperty: (type: PropertyType) => void;
  onCommitColumnWidth: (
    ref: { current: HTMLElement | null } | undefined,
    width: number,
  ) => void;
  /** When true, the header lays out as a SUBGRID row of a parent grid (used
   *  per-group in grouped tables) rather than its own standalone grid, so its
   *  columns align to the parent's record columns. */
  subgrid?: boolean;
  /** The parent grid row to occupy when subgrid (a group's columnsRow). */
  gridRow?: number;
}
export function DatabaseTableHeader({
  visibleProperties,
  allProperties,
  activeView,
  locked,
  gridTemplateColumns,
  widthFor,
  onReorder,
  onAddProperty,
  onCommitColumnWidth,
  subgrid,
  gridRow,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Column freeze (sticky) offsets.
  const frozenId =
    (activeView as TableView | null | undefined)?.frozenPropertyId ?? null;
  const freezeIndex = frozenId
    ? visibleProperties.findIndex((p) => p.id === frozenId)
    : -1;

  const leftOffsets: number[] = [];
  let acc = 0;
  visibleProperties.forEach((p, i) => {
    leftOffsets[i] = acc;
    if (i <= freezeIndex) acc += widthFor(p);
  });

  const stickyStyle = (i: number): React.CSSProperties => {
    if (i > freezeIndex) return {};
    const isBoundary = i === freezeIndex;
    return {
      position: "sticky",
      left: leftOffsets[i],
      zIndex: 8,
      background: "var(--tt-bg-color)",
      overflow: "hidden",
      borderRight: isBoundary ? "2px solid var(--tt-border-color)" : undefined,
    };
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (locked) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = visibleProperties.findIndex((p) => p.id === active.id);
    const newIndex = visibleProperties.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(visibleProperties, oldIndex, newIndex).map(
      (p) => p.id,
    );
    const visibleSet = new Set(reordered);
    const hiddenIds = allProperties
      .filter((p) => !visibleSet.has(p.id))
      .map((p) => p.id);
    onReorder([...reordered, ...hiddenIds]);
  };

  return (
    <div
      className="db-header-row"
      contentEditable={false}
      style={
        subgrid
          ? {
              gridColumn: "1 / -1",
              gridRow,
              display: "grid",
              gridTemplateColumns: "subgrid",
            }
          : {
              gridTemplateColumns,
            }
      }
    >
      <DndContext
        sensors={locked ? [] : sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={visibleProperties.map((p) => p.id)}
          strategy={horizontalListSortingStrategy}
        >
          {visibleProperties.map((prop, i) => (
            <ResizableNodeProvider
              key={prop.id}
              onResizeEnd={({ width }, ref) => onCommitColumnWidth(ref, width)}
            >
              <PropertyHeader
                prop={prop}
                style={stickyStyle(i) as Partial<CSSProperties>}
                locked={locked}
              />
            </ResizableNodeProvider>
          ))}
        </SortableContext>
      </DndContext>

      <CardItemGroup orientation="horizontal" className="db-header-cell ">
        {!locked && <AddPropertyPopover onAddProperty={onAddProperty} />}
      </CardItemGroup>
    </div>
  );
}
