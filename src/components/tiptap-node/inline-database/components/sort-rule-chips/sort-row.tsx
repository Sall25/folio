import {
  ArrowUp,
  ArrowDown,
  ChevronDown,
  GripVertical,
  Ellipsis,
  Trash2,
} from "lucide-react";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
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
import type { DatabaseProperty, SortRule } from "src/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** One row in the sort panel: grip, property, direction, remove. */
export function SortRow({
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
              padding: 8,
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
                  className="tiptap-button-delete"
                  onClick={onDelete}
                  style={{ justifyContent: "flex-start", width: "100%" }}
                >
                  <Trash2 className="tiptap-button-icon" />
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
