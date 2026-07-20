import { nanoid } from "nanoid";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Trash,
  ChevronDown,
  GripVertical,
  ArrowUpDown,
  Ellipsis,
} from "lucide-react";
import {
  Card,
  CardFooter,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import type { DatabaseProperty, DatabaseView, ID, SortRule } from "src/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";
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
import "./sort-rule-chips.scss";

/** One row in the sort panel: grip, property, direction, remove. */
function SortRow({
  sort,
  properties,
  onUpdate,
  onDelete,
}: {
  sort: SortRule;
  properties: DatabaseProperty[];
  onUpdate: (patch: Partial<SortRule>) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sort.id });

  const property = properties.find((p) => p.id === sort.propertyId);
  const iconName = property ? PROPERTY_TYPE_ICONS[property.config.type] : null;

  const selectStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "var(--tt-radius-sm)",
    border: "1px solid var(--tt-border-color)",
    padding: "3px 6px",
    justifyContent: "flex-start",
    fontSize: 12,
    height: 28,
    minHeight: 28,
  };

  return (
    <div
      ref={setNodeRef}
      className="db-sort-row"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
    >
      {/* Only the grip drags — the dropdowns must stay clickable. */}
      <span
        ref={setActivatorNodeRef}
        {...listeners}
        className="db-sort-row__grip"
      >
        <GripVertical size={12} className="tiptap-button-icon" />
      </span>

      {/* Property */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" style={selectStyle}>
            {iconName && (
              <DynamicIcon
                name={iconName}
                size={16}
                filled={false}
                className="tiptap-button-icon"
              />
            )}
            <span className="tiptap-button-text">
              {property?.name ?? "Property"}
            </span>
            <Spacer orientation="horizontal" />
            <ChevronDown className="tiptap-button-icon-sub" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <Card
            className="option-dropdown"
            style={{
              padding: 5,
              minWidth: 180,
              maxHeight: 260,
              overflowY: "auto",
            }}
          >
            <CardItemGroup style={{ width: "100%" }}>
              {properties.map((p) => (
                <DropdownMenuItem key={p.id} asChild>
                  <Button
                    variant="ghost"
                    data-active-state={sort.propertyId === p.id ? "on" : "off"}
                    style={{ justifyContent: "flex-start", width: "100%" }}
                    onClick={() => onUpdate({ propertyId: p.id })}
                  >
                    <DynamicIcon
                      name={PROPERTY_TYPE_ICONS[p.config.type]}
                      size={16}
                      filled={false}
                      className="tiptap-button-icon"
                    />
                    <span className="tiptap-button-text">{p.name}</span>
                  </Button>
                </DropdownMenuItem>
              ))}
            </CardItemGroup>
          </Card>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Direction */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" style={selectStyle}>
            {sort.direction === "asc" ? (
              <ArrowUp size={13} className="tiptap-button-icon" />
            ) : (
              <ArrowDown size={13} className="tiptap-button-icon" />
            )}
            <span className="tiptap-button-text">
              {sort.direction === "asc" ? "Ascending" : "Descending"}
            </span>
            <Spacer orientation="horizontal" />
            <ChevronDown className="tiptap-button-icon-sub" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <Card
            className="option-dropdown"
            style={{ padding: 5, minWidth: 160 }}
          >
            <CardItemGroup style={{ width: "100%" }}>
              {(["asc", "desc"] as const).map((dir) => (
                <DropdownMenuItem key={dir} asChild>
                  <Button
                    variant="ghost"
                    data-active-state={sort.direction === dir ? "on" : "off"}
                    style={{ justifyContent: "flex-start", width: "100%" }}
                    onClick={() => onUpdate({ direction: dir })}
                  >
                    {dir === "asc" ? (
                      <ArrowUp size={13} className="tiptap-button-icon" />
                    ) : (
                      <ArrowDown size={13} className="tiptap-button-icon" />
                    )}
                    <span className="tiptap-button-text">
                      {dir === "asc" ? "Ascending" : "Descending"}
                    </span>
                  </Button>
                </DropdownMenuItem>
              ))}
            </CardItemGroup>
          </Card>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Per-row menu — matches the filter row's Ellipsis. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="db-sort-row__menu">
            <Ellipsis className="tiptap-button-icon" size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <Card style={{ padding: 5, minWidth: 160 }}>
            <CardItemGroup style={{ width: "100%" }}>
              <DropdownMenuItem asChild>
                <Button
                  variant="ghost"
                  onClick={onDelete}
                  style={{ justifyContent: "flex-start", width: "100%" }}
                >
                  <Trash className="tiptap-button-icon" size={14} />
                  <span className="tiptap-button-text">Delete rule</span>
                </Button>
              </DropdownMenuItem>
            </CardItemGroup>
          </Card>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function SortRuleChips({
  properties,
  db,
  activeView,
  sorts,
}: {
  properties: DatabaseProperty[];
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
  sorts: SortRule[];
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  if (!activeView) return null;
  if (sorts.length === 0) return null;

  const locked = db.locked;

  const save = (next: SortRule[]) =>
    db.updateView(activeView.id, { sorts: next });

  const updateSort = (id: ID, patch: Partial<SortRule>) =>
    save(sorts.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const deleteSort = (id: ID) => save(sorts.filter((s) => s.id !== id));

  const addSort = () => {
    const unused = properties.find(
      (p) => !sorts.some((s) => s.propertyId === p.id),
    );
    if (!unused) return;
    save([...sorts, { id: nanoid(), propertyId: unused.id, direction: "asc" }]);
  };

  // Order is precedence — dragging a rule up makes it sort first.
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = sorts.findIndex((s) => s.id === active.id);
    const to = sorts.findIndex((s) => s.id === over.id);
    if (from === -1 || to === -1) return;
    save(arrayMove(sorts, from, to));
  };

  const label = sorts.length === 1 ? "1 sort" : `${sorts.length} sorts`;

  const chip = (
    <Button
      variant="ghost"
      style={{
        height: 24,
        minHeight: 24,
        padding: "0 8px",
        gap: 5,
        borderRadius: "var(--tt-radius-lg)",
        fontSize: 12,
        fontWeight: 500,
        color: "var(--tt-brand-color-400)",
        background:
          "color-mix(in srgb, var(--tt-brand-color-400) 14%, transparent)",
        cursor: locked ? "default" : undefined,
      }}
    >
      <ArrowUpDown
        size={13}
        className="tiptap-button-icon"
        style={{ color: "inherit" }}
      />
      <span className="tiptap-button-text">{label}</span>
      {!locked && (
        <ChevronDown
          size={11}
          className="tiptap-button-icon-sub"
          style={{ color: "inherit" }}
        />
      )}
    </Button>
  );

  if (locked) return <div className="db-sort-chips">{chip}</div>;

  return (
    <div className="db-sort-chips" contentEditable={false}>
      <Popover>
        <PopoverTrigger asChild>{chip}</PopoverTrigger>
        <PopoverContent side="bottom" align="start">
          <Card
            className="filter-chip--card"
            style={{ padding: 6, minWidth: 420 }}
          >
            <CardItemGroup style={{ width: "100%", gap: 4 }}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={sorts.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sorts.map((sort) => (
                    <SortRow
                      key={sort.id}
                      sort={sort}
                      properties={properties}
                      onUpdate={(patch) => updateSort(sort.id, patch)}
                      onDelete={() => deleteSort(sort.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </CardItemGroup>

            <CardFooter
              style={{ width: "100%", flexDirection: "column", gap: 2 }}
            >
              <Button
                variant="ghost"
                onClick={addSort}
                disabled={sorts.length >= properties.length}
                style={{
                  justifyContent: "flex-start",
                  width: "100%",
                  fontSize: 12,
                }}
              >
                <Plus className="tiptap-button-icon" size={14} />
                <span className="tiptap-button-text">Add sort</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => save([])}
                style={{
                  justifyContent: "flex-start",
                  width: "100%",
                  fontSize: 12,
                }}
              >
                <Trash className="tiptap-button-icon" size={14} />
                <span className="tiptap-button-text">Delete sort</span>
              </Button>
            </CardFooter>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}
