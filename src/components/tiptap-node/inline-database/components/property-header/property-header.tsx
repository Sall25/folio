import { useEffect, useState, type CSSProperties } from "react";
import {
  DEFAULT_CONFIGS,
  isGroupableProperty,
  type BoardView,
  type CalcType,
  type DatabaseProperty,
  type DatabaseView,
  type FilterGroup,
  type FilterGroupOperator,
  type FilterRule,
  type ListView,
  type SortRule,
  type TableView,
} from "src/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { useDatabaseContext } from "../../nodes/database-context";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { DeletePropertyButton } from "../delete-property-button";
import { DuplicatePropertyButton } from "../duplicate-property-button";
import { FreezePropertyButton } from "../freeze-property-button";
import { UnwrapPropertyButton } from "../unwrap-property-button";
import { HidePropertyButton } from "../hide-property-button";
import { useResizableNode } from "src/components/tiptap-node/figure-node";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDataSource } from "../../hooks/use-data-source";
import { PropertyTypeChangePopover } from "../property-type-change-popover";
import "./property-header.scss";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { Group, ListFilter, SortAscIcon } from "lucide-react";
import { InsertPropertyButton } from "../insert-property-button";

import { nanoid } from "nanoid";
import { MenuRow } from "../menu-row";
import { NavigableMenuItem } from "../navigable-menu-item";
import { makeFilterRule } from "../filter-rule-chips/utils";
import { PropertyIcon } from "./property-icon";
import { PropertyTypeList } from "./property-type-list";
import { PropertyConfigEditor } from "./property-config-editor";
import { IconPickerPopover } from "src/components/tiptap-ui/cover";
import { CalcMenuItem } from "../calc-menu-item";

export function PropertyHeader({
  prop,
  style,
  locked = false,
}: {
  prop: DatabaseProperty;
  style?: Partial<CSSProperties>;
  /** When true, all structural edits are frozen: no edit popover, no drag
      reorder, no resize. The header still renders the name + icon. */
  locked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prop.id, disabled: locked });

  const { db, attrs } = useDatabaseContext();
  const { updatePropertiesAsync, source } = useDataSource(attrs.sourceId);

  /** Insert a new text property beside this one. Cells are created by
   *  useDatabaseCellSync once the property lands. */
  const insertPropertyBeside = (side: "left" | "right") => {
    const props = source?.properties ?? [];
    const index = props.findIndex((p) => p.id === prop.id);
    if (index === -1) return;
    const next = [...props];
    next.splice(side === "left" ? index : index + 1, 0, {
      id: crypto.randomUUID(),
      name: "Text",
      config: DEFAULT_CONFIGS.text,
      width: 160,
    });
    updatePropertiesAsync(next);
    setOpen(false);
  };

  // The type's default icon — used as fallback when no custom icon is set.

  const typeIconName = PROPERTY_TYPE_ICONS[prop.config.type];

  const { nodeRef, handleResizeStart, isResizing } = useResizableNode();
  const [name, setName] = useState(prop.name);

  // Description editor: opens from the name Input's info icon. Shown when the
  // user clicks the icon, or whenever a description already exists.
  const [descOpen, setDescOpen] = useState(false);
  const [desc, setDesc] = useState(prop.description ?? "");

  // Adopt external description changes while idle (popover reopened, another
  // editor updated it).
  const [prevDesc, setPrevDesc] = useState(prop.description ?? "");
  if ((prop.description ?? "") !== prevDesc) {
    setPrevDesc(prop.description ?? "");
    setDesc(prop.description ?? "");
  }

  const commitDesc = (value: string) => {
    const next = value.trim();
    if (next !== (prop.description ?? "")) {
      db.updateProperty(prop.id, { ...prop, description: next || undefined });
    }
  };

  useEffect(() => {
    if (!isResizing || !nodeRef) return;
    const el = nodeRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      el.dispatchEvent(
        new CustomEvent("column:resize", {
          bubbles: true,
          detail: { propId: prop.id, width: el.offsetWidth },
        }),
      );
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [isResizing, nodeRef, prop.id]);

  const [menuOpen, setMenuOpen] = useState(false);
  // The trigger button. When locked it carries no drag listeners and never
  // opens the edit popover — it's a plain, inert label.
  const triggerButton = (
    <Button
      variant="ghost"
      className="db-th__trigger"
      {...(locked ? {} : attributes)}
      {...(locked ? {} : listeners)}
      onClick={() => {
        setMenuOpen(true);
        setOpen(true);
      }}
      style={{
        width: "100%",
        borderRadius: 0,
        gap: 4,
        display: "flex",
        alignItems: "center",
        padding: "0",
        margin: 0,
        justifyContent: "flex-start",
        overflow: "hidden",
        background: "transparent !important",
        color: "var(--tt-text-color)",
        cursor: locked ? "default" : undefined,
      }}
    >
      <PropertyIcon
        iconName={prop.icon}
        fallback={typeIconName}
        color={prop.iconColor}
        className="tiptap-button-icon"
        filled={true}
        size={20}
      />
      <span className="tiptap-button-text">{prop.name}</span>
    </Button>
  );

  const view = db.activeView;

  /** Current sort on this property, if any — drives the check in the flyout. */
  const currentSort = view.sorts?.find((s) => s.propertyId === prop.id);

  /** Same construction FilterPanel.addRuleFor uses — appends to the first
   *  filter group, creating it if the view has none. */
  const addFilter = () => {
    const group: FilterGroup = view.filters?.[0] ?? {
      id: nanoid(),
      operator: "and" as FilterGroupOperator,
      rules: [],
    };
    db.updateView(view.id, {
      filters: [
        {
          ...group,
          rules: [...(group.rules as FilterRule[]), makeFilterRule(prop)],
        },
      ],
    });
    setOpen(false);
  };

  /** Same as SortPanel.addSortFor — no-op if this property is already sorted. */
  const addSort = (direction: "asc" | "desc") => {
    const sorts = view.sorts ?? [];
    if (sorts.some((s) => s.propertyId === prop.id)) {
      setOpen(false);
      return;
    }
    const next: SortRule = { id: nanoid(), propertyId: prop.id, direction };
    db.updateView(view.id, { sorts: [...sorts, next] });
    setOpen(false);
  };

  const showDescField = descOpen;

  return (
    <div
      className="db-th"
      ref={(el) => {
        setNodeRef(el);
        (nodeRef as React.RefObject<HTMLElement | null>).current = el;
      }}
      style={{
        position: "relative",
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 3 : undefined,
        paddingLeft: 5,
        background: "transparent",
        ...style,
      }}
      data-prop-id={prop.id}
      contentEditable={false}
      onMouseDown={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest("input, textarea, [contenteditable='true']")) return;
        e.preventDefault();
      }}
    >
      {locked || !menuOpen ? (
        // Locked: no popover, no edit surface — just the label.
        triggerButton
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            avoidCollisions
            collisionPadding={8}
          >
            <Card
              className="property-header-dropdown"
              style={{
                boxShadow: "var(--tt-shadow-elevated-md)",
                minWidth: 180,
              }}
            >
              <CardBody style={{ scrollbarWidth: "thin" }}>
                <CardItemGroup style={{ gap: 3 }}>
                  <CardItemGroup orientation="horizontal">
                    {/* Icon button → icon picker popover */}
                    <IconPickerPopover
                      onSelect={(iconName, color) => {
                        db.updateProperty(prop.id, {
                          ...prop,
                          icon: iconName,
                          iconColor: color,
                        });
                      }}
                    >
                      <Button
                        tooltip="Change icon"
                        variant="ghost"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          border: "1px solid var(--tt-border-color)",
                          minHeight: 20,
                          height: 30,
                        }}
                      >
                        <PropertyIcon
                          iconName={prop.icon}
                          fallback={typeIconName}
                          color={prop.iconColor}
                          className="tiptap-button-icon"
                          filled={false}
                          size={20}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        />
                      </Button>
                    </IconPickerPopover>

                    <Input
                      value={name}
                      placeholder="Property name"
                      onChange={(e) => {
                        setName(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          db.updateProperty(prop.id, {
                            ...prop,
                            name: e.currentTarget.value,
                          });
                          e.currentTarget.blur();
                          setOpen(false);
                        }
                      }}
                      onBlur={(e) => {
                        db.updateProperty(prop.id, {
                          ...prop,
                          name: e.currentTarget.value,
                        });
                      }}
                      style={{ minHeight: 20, height: 30 }}
                      description={prop.description || undefined}
                      onInfoClick={() => setDescOpen((v) => !v)}
                    />
                  </CardItemGroup>

                  {/* Description editor — opens from the name info icon, or
                      stays visible whenever a description already exists. */}
                  {showDescField && (
                    <>
                      <Spacer size={1} />
                      <CardItemGroup orientation="horizontal">
                        <Spacer orientation="horizontal" size={15} />
                        <Input
                          autoFocus={descOpen}
                          value={desc}
                          placeholder="Add a description..."
                          onChange={(e) => setDesc(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitDesc(e.currentTarget.value);
                              e.currentTarget.blur();
                              setDescOpen(false);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              setDesc(prop.description ?? "");
                              setDescOpen(false);
                            }
                          }}
                          onBlur={(e) => {
                            commitDesc(e.currentTarget.value);
                            setDescOpen(false);
                          }}
                          style={{ minHeight: 20, height: 24 }}
                        />
                      </CardItemGroup>
                    </>
                  )}

                  <Spacer size={3} />
                  <PropertyConfigEditor
                    prop={prop}
                    onClose={() => setOpen(false)}
                  />
                  <PropertyTypeChangePopover>
                    <PropertyTypeList prop={prop} />
                  </PropertyTypeChangePopover>
                </CardItemGroup>
                <Separator orientation="horizontal" />
                <CardItemGroup style={{ gap: 3 }}>
                  <FreezePropertyButton
                    isFrozen={db.isFrozen(db.activeView.id, prop.id)}
                    onFreeze={() => {
                      const isFrozen = db.isFrozen(db.activeView.id, prop.id);
                      db.freezeProperty(
                        db.activeView.id,
                        isFrozen ? null : prop.id,
                      );
                    }}
                  />
                  <HidePropertyButton
                    onHide={() => db.hideProperty(db.activeView.id, prop.id)}
                  />
                  <UnwrapPropertyButton
                    isUnwrapped={db.isUnwrapped(db.activeView.id, prop.id)}
                    onUnwrap={() =>
                      db.toggleUnwrapProperty(db.activeView.id, prop.id)
                    }
                  />
                </CardItemGroup>
                <CardItemGroup style={{ gap: 3 }}>
                  <MenuRow
                    Icon={ListFilter}
                    label="Filter"
                    onClick={addFilter}
                  />
                  <NavigableMenuItem Icon={SortAscIcon} label="Sort">
                    <Card style={{ padding: "5px 10px" }}>
                      <CardItemGroup>
                        <MenuRow
                          label="Ascending"
                          selected={currentSort?.direction === "asc"}
                          onClick={() => addSort("asc")}
                        />
                        <MenuRow
                          label="Descending"
                          selected={currentSort?.direction === "desc"}
                          onClick={() => addSort("desc")}
                        />
                      </CardItemGroup>
                    </Card>
                  </NavigableMenuItem>
                  {isGroupableProperty(prop.config.type) && (
                    <MenuRow
                      Icon={Group}
                      label="Group"
                      selected={
                        (view as TableView | ListView | BoardView)
                          .groupByPropertyId === prop.id
                      }
                      onClick={() => {
                        const current = (view as TableView).groupByPropertyId;
                        db.updateView(view.id, {
                          groupByPropertyId:
                            current === prop.id ? null : prop.id,
                        } as Partial<DatabaseView>);
                      }}
                    />
                  )}
                  <CalcMenuItem
                    prop={prop}
                    calc={(view.calculations?.[prop.id] ?? "none") as CalcType}
                    onChange={(c) =>
                      db.updateView(view.id, {
                        calculations: { ...view.calculations, [prop.id]: c },
                      })
                    }
                  />
                </CardItemGroup>

                {prop.config.type !== "title" && (
                  <CardItemGroup style={{ gap: 3 }}>
                    <Separator orientation="horizontal" />
                    <InsertPropertyButton
                      side="left"
                      onInsert={() => insertPropertyBeside("left")}
                    />
                    <InsertPropertyButton
                      side="right"
                      onInsert={() => insertPropertyBeside("right")}
                    />
                    <DuplicatePropertyButton
                      onDuplicate={() => db.duplicateProperty(prop.id)}
                    />
                    <DeletePropertyButton
                      onDelete={() => db.deleteProperty(prop.id)}
                    />
                  </CardItemGroup>
                )}
              </CardBody>
            </Card>
          </PopoverContent>
        </Popover>
      )}

      {/* Resize handle — omitted entirely when locked. */}
      {!locked && (
        <span
          className="column-resizer"
          style={{ right: -8 }}
          onMouseDown={(e) => {
            if (nodeRef?.current) {
              const currentPx = nodeRef.current.getBoundingClientRect().width;
              nodeRef.current.style.width = `${currentPx}px`;
            }
            handleResizeStart?.(e, "right");
          }}
          onTouchStart={(e) => {
            if (nodeRef?.current) {
              const currentPx = nodeRef.current.getBoundingClientRect().width;
              nodeRef.current.style.width = `${currentPx}px`;
            }
            handleResizeStart?.(e, "right");
          }}
        />
      )}
    </div>
  );
}
