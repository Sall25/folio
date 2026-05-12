import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { DatabaseProperty, SortRule, DatabaseView } from "../../types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

function makeId(): string {
  return crypto.randomUUID();
}

// ─────────────────────────────────────────────────────────────────────────────
// Sortable sort rule row
// ─────────────────────────────────────────────────────────────────────────────

interface SortRuleRowProps {
  rule: SortRule;
  properties: DatabaseProperty[];
  onChange: (updated: SortRule) => void;
  onDelete: () => void;
}

function SortRuleRow({
  rule,
  properties,
  onChange,
  onDelete,
}: SortRuleRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  return (
    <CardItemGroup
      ref={setNodeRef}
      orientation="horizontal"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
    >
      {/* Drag handle */}
      <span
        ref={setActivatorNodeRef}
        {...listeners}
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "grab",
          color: "var(--tt-text-color)",
          flexShrink: 0,
          opacity: 0.6,
        }}
      >
        <GripVertical style={{ width: 13, height: 13 }} />
      </span>

      {/* Property selector */}
      <select
        className="fp-select"
        style={{ minWidth: 180 }}
        value={rule.propertyId}
        onChange={(e) => onChange({ ...rule, propertyId: e.target.value })}
      >
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Direction toggle */}
      <Button
        variant="ghost"
        style={{
          height: 28,
          gap: 5,
          fontSize: 12,
          flexShrink: 0,
          borderRadius: "var(--tt-radius-sm)",
        }}
        onClick={() =>
          onChange({
            ...rule,
            direction: rule.direction === "asc" ? "desc" : "asc",
          })
        }
      >
        {rule.direction === "asc" ? (
          <>
            <ArrowUp
              style={{ width: 12, height: 12 }}
              className="tiptap-button-icon"
            />{" "}
            <span className="tiptap-button-text">Ascending</span>
          </>
        ) : (
          <>
            <ArrowDown
              style={{ width: 12, height: 12 }}
              className="tiptap-button-icon"
            />{" "}
            <span className="tiptap-button-text">Descending</span>
          </>
        )}
      </Button>

      <Spacer orientation="horizontal" />

      <Button variant="ghost" onClick={onDelete} aria-label="Remove sort">
        <Trash2
          style={{ color: "var(--tt-color-red-base)", width: 12, height: 12 }}
          className="tiptap-button-icon"
        />
      </Button>
    </CardItemGroup>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SortPanel
// ─────────────────────────────────────────────────────────────────────────────

interface SortPanelProps {
  view: DatabaseView;
  properties: DatabaseProperty[];
  onUpdateView: (patch: Partial<Omit<DatabaseView, "id" | "type">>) => void;
}

export function SortPanel({ view, properties, onUpdateView }: SortPanelProps) {
  const sorts = view.sorts;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const addSort = () => {
    // Default to first property not already sorted
    const usedIds = new Set(sorts.map((s) => s.propertyId));
    const prop = properties.find((p) => !usedIds.has(p.id)) ?? properties[0];
    const newSort: SortRule = {
      id: makeId(),
      propertyId: prop.id,
      direction: "asc",
    };
    onUpdateView({ sorts: [...sorts, newSort] });
  };

  const updateSort = (id: string, updated: SortRule) =>
    onUpdateView({ sorts: sorts.map((s) => (s.id === id ? updated : s)) });

  const deleteSort = (id: string) =>
    onUpdateView({ sorts: sorts.filter((s) => s.id !== id) });

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sorts.findIndex((s) => s.id === active.id);
    const newIndex = sorts.findIndex((s) => s.id === over.id);
    onUpdateView({ sorts: arrayMove(sorts, oldIndex, newIndex) });
  };

  return (
    <Card>
      <CardBody style={{ minWidth: 280 }}>
        <CardItemGroup>
          {sorts.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: "var(--tt-text-color)",
                padding: "2px 4px",
              }}
            >
              No sorts applied to this view.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sorts.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {sorts.map((sort) => (
                  <SortRuleRow
                    key={sort.id}
                    rule={sort}
                    properties={properties}
                    onChange={(updated) => updateSort(sort.id, updated)}
                    onDelete={() => deleteSort(sort.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}

          <Button
            variant="ghost"
            style={{
              height: 28,
              gap: 6,
              fontSize: 13,
              marginTop: 10,
              borderRadius: "var(--tt-radius-sm)",
              justifyContent: "flex-start",
            }}
            onClick={addSort}
          >
            <Plus
              style={{ width: 13, height: 13 }}
              className="tiptap-button-icon"
            />
            <span className="tiptap-button-text"> Add a sort</span>
          </Button>
        </CardItemGroup>
      </CardBody>
    </Card>
  );
}
