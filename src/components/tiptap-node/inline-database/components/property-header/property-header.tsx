import { createElement, useEffect, useState, type CSSProperties } from "react";
import {
  Check,
  Type as UltimateFallbackIcon,
  type LucideIcon,
} from "lucide-react";
import type {
  DatabaseProperty,
  PropertyConfig,
  SelectOption,
} from "../../types/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { PropertyEditPopover } from "../property-edit-popover";
import { SelectOptionsEditor } from "../../ui/select/select-options-editor";
import { useDatabaseContext } from "../../nodes/database-context";
import { PROPERTY_TYPE_ICONS } from "../../types/property-type-meta";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { DeletePropertyButton } from "../delete-property-button";
import { DuplicatePropertyButton } from "../duplicate-property-button";
import { FreezePropertyButton } from "../freeze-property-button";
import { UnwrapPropertyButton } from "../unwrap-property-button";
import { HidePropertyButton } from "../hide-property-button";
import { useResizableNode } from "src/components/tiptap-node/figure-node";
import FormulaEditor from "../formula-editor/formula-editor";
import { TextareaAutosize } from "src/components/tiptap-ui-primitive/textarea-auto-size";
import { NumberEditDisplay } from "../number-edit-display";
import { DateEditDisplay } from "../date-edit-display/date-edit-display";
import { PersonEditDisplay } from "../person-edit-display";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconPicker } from "src/components/tiptap-ui/cover/icon-picker.js";
import { ICON_LIST } from "src/components/tiptap-ui/cover/data/icon-list.js";
import { RelationEditDisplay } from "../relation-edit-display";
import { RollupEditDisplay } from "../rollup-edit-display";
import { useDataSource } from "../../hooks/use-data-source";
import { PROPERTY_TYPE_META } from "../../types/property-type-meta";
import { PropertyTypeChangePopover } from "../property-type-change-popover";

// name -> Lucide component, so a stored `prop.icon` string can be rendered.
const ICON_MAP = new Map<string, LucideIcon>(
  (ICON_LIST ?? []).map((e) => [e.name, e.icon]),
);

/**
 * Resolves a property's icon to a Lucide component and renders it.
 * Declared at module level (and rendered via createElement on a lowercase
 * binding) so the chosen component is never "created during render".
 */
function PropertyIcon({
  iconName,
  fallback,
  color,
  ...rest
}: {
  iconName?: string;
  fallback: LucideIcon;
  color?: string;
} & React.ComponentProps<LucideIcon>) {
  const resolved =
    (iconName && ICON_MAP.get(iconName)) || fallback || UltimateFallbackIcon;
  // Pass color through lucide's own `color` prop, and only when set — passing
  // `stroke={undefined}` would override lucide's default stroke="currentColor"
  // and the icon would render with no stroke (invisible).
  return createElement(resolved, color ? { color, ...rest } : { ...rest });
}

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
  const [iconOpen, setIconOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prop.id, disabled: locked });

  const { db, source } = useDatabaseContext();
  const { changePropertyTypeAsync } = useDataSource(source?.id);

  // The type's default icon — used as fallback when no custom icon is set.
  const TypeIcon = PROPERTY_TYPE_ICONS[prop.config.type];

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

  // The trigger button. When locked it carries no drag listeners and never
  // opens the edit popover — it's a plain, inert label.
  const triggerButton = (
    <Button
      variant="ghost"
      className="db-th__trigger"
      {...(locked ? {} : attributes)}
      {...(locked ? {} : listeners)}
      style={{
        width: "100%",
        borderRadius: "var(--tt-radius-sm)",
        justifyContent: "flex-start",
        overflow: "hidden",
        background: "transparent !important",
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
        fontSize: 14,
        color: "var(--tt-text-color)",
        lineHeight: 1.5,
        cursor: locked ? "default" : undefined,
      }}
    >
      <PropertyIcon
        iconName={prop.icon}
        fallback={TypeIcon}
        color={prop.iconColor}
        className="tiptap-button-icon"
        style={{ width: 16, height: 16 }}
      />
      <span className="tiptap-button-text">{prop.name}</span>
    </Button>
  );

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
      {locked ? (
        // Locked: no popover, no edit surface — just the label.
        triggerButton
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          <PopoverContent side="bottom" align="start">
            <Card
              style={{
                padding: "5px 10px",
                boxShadow: "var(--tt-shadow-elevated-sm)",
                minWidth: 260,
              }}
            >
              <CardHeader>
                <CardGroupLabel>Edit Property</CardGroupLabel>
              </CardHeader>
              <CardBody>
                <CardItemGroup>
                  <CardItemGroup orientation="horizontal">
                    {/* Icon button → icon picker popover */}
                    <Popover open={iconOpen} onOpenChange={setIconOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" tooltip="Change icon">
                          <PropertyIcon
                            iconName={prop.icon}
                            fallback={TypeIcon}
                            color={prop.iconColor}
                            className="tiptap-button-icon"
                          />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" align="start">
                        <Card style={{ padding: "5px 10px", minWidth: 360 }}>
                          <IconPicker
                            onSelect={(iconName, color) => {
                              db.updateProperty(prop.id, {
                                ...prop,
                                icon: iconName,
                                iconColor: color,
                              });
                              setIconOpen(false);
                            }}
                          />
                        </Card>
                      </PopoverContent>
                    </Popover>
                    <TextareaAutosize
                      cols={30}
                      maxRows={1}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      contentEditable={true}
                      onBlur={() =>
                        db.updateProperty(prop.id, { ...prop, name })
                      }
                      onSubmit={() =>
                        db.updateProperty(prop.id, { ...prop, name })
                      }
                    />
                  </CardItemGroup>
                  <PropertyTypeChangePopover>
                    <CardItemGroup
                      style={{
                        // maxHeight: 280,
                        // overflowY: "auto",
                        width: "100%",
                        marginTop: 10,
                      }}
                    >
                      {PROPERTY_TYPE_META.filter((m) => m.type !== "title").map(
                        (m) => {
                          const Icon = PROPERTY_TYPE_ICONS[m.type];
                          return (
                            <Button
                              key={m.type}
                              variant="ghost"
                              onClick={async () =>
                                await changePropertyTypeAsync(prop.id, m.type)
                              }
                              style={{
                                justifyContent: "flex-start",
                                width: "100%",
                                gap: 8,
                              }}
                            >
                              <Icon className="tiptap-button-icon" size={14} />
                              <span className="tiptap-button-text">
                                {m.label}
                              </span>
                              {prop.config.type === m.type && (
                                <Check
                                  size={14}
                                  style={{
                                    marginLeft: "auto",
                                    color: "var(--tt-brand-color-400)",
                                  }}
                                />
                              )}
                            </Button>
                          );
                        },
                      )}
                    </CardItemGroup>
                  </PropertyTypeChangePopover>
                  {prop.config.type === "select" && (
                    <PropertyEditPopover>
                      <SelectOptionsEditor
                        options={prop.config.options}
                        onEditOption={(option) =>
                          db.updateProperty(prop.id, {
                            ...prop,
                            config: {
                              ...prop.config,
                              options: (
                                prop.config as {
                                  type: typeof prop.config.type;
                                  options: SelectOption[];
                                }
                              ).options.map((o) =>
                                o.id !== option.id ? o : option,
                              ),
                            } as PropertyConfig,
                          })
                        }
                        onChange={(options) =>
                          db.updateProperty(prop.id, {
                            ...prop,
                            config: {
                              ...(prop.config as {
                                type: "select";
                                options: SelectOption[];
                              }),
                              options,
                            },
                          })
                        }
                      />
                    </PropertyEditPopover>
                  )}
                  {prop.config.type === "multi_select" && (
                    <PropertyEditPopover>
                      <SelectOptionsEditor
                        options={prop.config.options}
                        onEditOption={(option) =>
                          db.updateProperty(prop.id, {
                            ...prop,
                            config: {
                              ...prop.config,
                              options: (
                                prop.config as {
                                  type: typeof prop.config.type;
                                  options: SelectOption[];
                                }
                              ).options.map((o) =>
                                o.id !== option.id ? o : option,
                              ),
                            } as PropertyConfig,
                          })
                        }
                        onChange={(options) =>
                          db.updateProperty(prop.id, {
                            ...prop,
                            config: {
                              ...(prop.config as {
                                type: "select";
                                options: SelectOption[];
                              }),
                              options,
                            },
                          })
                        }
                      />
                    </PropertyEditPopover>
                  )}
                  {prop.config.type === "relation" && (
                    <PropertyEditPopover>
                      <RelationEditDisplay
                        prop={prop}
                        source={source ?? undefined}
                        onChange={(config, name) =>
                          db.updateProperty(prop.id, {
                            ...prop,
                            config,
                            ...(name ? { name } : {}),
                          })
                        }
                      />
                    </PropertyEditPopover>
                  )}
                  {prop.config.type === "rollup" && (
                    <PropertyEditPopover>
                      <RollupEditDisplay
                        prop={prop}
                        properties={source?.properties ?? []}
                        onChange={(config) =>
                          db.updateProperty(prop.id, { ...prop, config })
                        }
                      />
                    </PropertyEditPopover>
                  )}
                  {prop.config.type === "formula" && (
                    <PropertyEditPopover>
                      <FormulaEditor
                        propertyId={prop.id}
                        properties={source?.properties ?? []}
                        onDone={() => setOpen(false)}
                      />
                    </PropertyEditPopover>
                  )}
                  {prop.config.type === "number" && (
                    <PropertyEditPopover>
                      <NumberEditDisplay
                        prop={prop}
                        onChange={(patch) => {
                          if (prop.config.type !== "number") return;
                          db.updateProperty(prop.id, {
                            ...prop,
                            config: { ...prop.config, ...patch },
                          });
                        }}
                      />
                    </PropertyEditPopover>
                  )}
                  {prop.config.type === "date" && (
                    <PropertyEditPopover>
                      <DateEditDisplay
                        prop={prop}
                        onChange={(config) =>
                          db.updateProperty(prop.id, { ...prop, config })
                        }
                      />
                    </PropertyEditPopover>
                  )}
                  {prop.config.type === "person" && (
                    <PropertyEditPopover>
                      <PersonEditDisplay
                        prop={prop}
                        onChange={(config) =>
                          db.updateProperty(prop.id, { ...prop, config })
                        }
                      />
                    </PropertyEditPopover>
                  )}
                </CardItemGroup>
                <CardItemGroup>
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

                {prop.config.type !== "title" && (
                  <CardItemGroup>
                    <Separator orientation="horizontal" />
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
