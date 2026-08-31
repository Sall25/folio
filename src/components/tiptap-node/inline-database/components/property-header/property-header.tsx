import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from "react";
import {
  DEFAULT_CONFIGS,
  type DatabaseProperty,
  type FilterGroup,
  type FilterGroupOperator,
  type FilterRule,
  type SortRule,
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
import { ListFilter, SortAscIcon } from "lucide-react";
import { InsertPropertyButton } from "../insert-property-button";

import { nanoid } from "nanoid";
import { MenuRow } from "../menu-row";
import { NavigableMenuItem } from "../navigable-menu-item";
import { makeFilterRule } from "../filter-rule-chips/utils";
import { PropertyIcon } from "./property-icon";
import { PropertyTypeList } from "./property-type-list";
import { PropertyConfigEditor } from "./property-config-editor";
import { IconPickerPopover } from "src/components/tiptap-ui/cover";

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
        borderRadius: "var(--tt-radius-sm)",
        gap: 4,
        display: "flex",
        alignItems: "center",
        padding: "0",
        justifyContent: "flex-start",
        overflow: "hidden",
        background: "transparent !important",
        fontSize: 14,
        color: "var(--tt-text-color)",
        lineHeight: 1.4,
        fontWeight: 400,
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

  const [triggerH, setTriggerH] = useState(34);

  useLayoutEffect(() => {
    if (open && nodeRef?.current) {
      setTriggerH(nodeRef.current.getBoundingClientRect().height);
    }
  }, [open]);

  // geometry of the input row inside the card
  const CARD_PAD_TOP = 10; // top padding of your Card/CardBody
  const INPUT_H = 30; // matches your Input style={{ height: 30 }}

  // distance from content top → input's vertical center
  const inputCenterFromTop = CARD_PAD_TOP + INPUT_H / 2;

  // offset so input center == header center
  const centerOffset = -(triggerH / 2 + inputCenterFromTop);

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
          <PopoverContent side="bottom" align="start" sideOffset={centerOffset}>
            <Card
              className="property-header-dropdown"
              style={{
                boxShadow: "var(--tt-shadow-elevated-md)",
                minWidth: 60,
              }}
            >
              <CardBody>
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
                        variant="ghost"
                        tooltip="Change icon"
                        style={{
                          display: "flex",
                          alignItems: "center",
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
                    />
                  </CardItemGroup>
                  <Spacer size={3} />
                  <PropertyTypeChangePopover>
                    <PropertyTypeList prop={prop} />
                  </PropertyTypeChangePopover>
                  <PropertyConfigEditor
                    prop={prop}
                    onClose={() => setOpen(false)}
                  />
                </CardItemGroup>
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
