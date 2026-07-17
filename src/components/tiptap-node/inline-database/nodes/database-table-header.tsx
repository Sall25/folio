// The table's header row: the property columns (draggable to reorder,
// resizable), plus the trailing actions cell (add-property popover + options
// menu). Stays imperative — headers are schema, not record data.

import React, { type CSSProperties } from "react";
import { Plus } from "lucide-react";
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
import { chunk } from "lodash";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Grid,
  GridCell,
  GridRow,
} from "src/components/tiptap-ui-primitive/grid";
import { PropertyHeader } from "../components/property-header";
import { ResizableNodeProvider } from "../../figure-node";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import type { DatabaseProperty, DatabaseView, PropertyConfig } from "src/types";
import type { TableView } from "src/types";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";

type PropertyType = PropertyConfig["type"];

const allPropertyTypes = [
  "title",
  "text",
  "checkbox",
  "created_time",
  "created_by",
  "edited_time",
  "edited_by",
  "number",
  "select",
  "multi_select",
  "status",
  "date",
  "person",
  "formula",
  "relation",
  "rollup",
  "url",
  "phone",
  "email",
] as const satisfies readonly PropertyType[];

interface Props {
  visibleProperties: DatabaseProperty[];
  allProperties: DatabaseProperty[];
  activeView: DatabaseView | undefined;
  locked: boolean;
  gridTemplateColumns: string;
  widthFor: (p: DatabaseProperty) => number;
  optionsMenu: React.ReactNode;
  onReorder: (orderedIds: string[]) => void;
  onAddProperty: (type: PropertyType) => void;
  onCommitColumnWidth: (
    ref: { current: HTMLElement | null } | undefined,
    width: number,
  ) => void;
}

export function DatabaseTableHeader({
  visibleProperties,
  allProperties,
  activeView,
  locked,
  gridTemplateColumns,
  widthFor,
  optionsMenu,
  onReorder,
  onAddProperty,
  onCommitColumnWidth,
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
      style={{ gridTemplateColumns }}
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
        {!locked && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                style={{ background: "transparent" }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <Plus className="tiptap-button-icon" />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <Card
                style={{
                  maxHeight: 300,
                  // overflow: "scroll",
                  minWidth: 300,
                  // padding: "10px 5px",
                }}
              >
                <CardHeader>
                  <CardGroupLabel>Properties</CardGroupLabel>
                </CardHeader>
                <CardBody style={{ width: "100%" }}>
                  <Grid columns="1fr 1fr 1fr" gap={10}>
                    {chunk(allPropertyTypes, 3).map((row, i) => (
                      <GridRow key={i}>
                        {row.map((t) => {
                          // Material Symbols name string now, not an icon component.
                          const iconName = PROPERTY_TYPE_ICONS[t];
                          return (
                            <GridCell key={t} style={{ padding: "5px 10px" }}>
                              <Button
                                variant="ghost"
                                style={{
                                  borderRadius: "var(--tt-radius-sm)",
                                  width: "100%",
                                  justifyContent: "flex-start",
                                }}
                                onClick={() => onAddProperty(t)}
                              >
                                <DynamicIcon
                                  name={iconName}
                                  size={20}
                                  filled={false}
                                  className="tiptap-button-icon"
                                />
                                <span className="tiptap-button-text">{t}</span>
                              </Button>
                            </GridCell>
                          );
                        })}
                      </GridRow>
                    ))}
                  </Grid>
                </CardBody>
              </Card>
            </PopoverContent>
          </Popover>
        )}
        {optionsMenu}
      </CardItemGroup>
    </div>
  );
}
