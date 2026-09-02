import React from "react";
import { Plus } from "lucide-react";
import { chunk } from "lodash";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "src/components/tiptap-ui-primitive/popover";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Grid,
  GridCell,
  GridRow,
} from "src/components/tiptap-ui-primitive/grid";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { IconPickerPopover } from "src/components/tiptap-ui/cover";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import { PROPERTY_TYPE_META, type PropertyConfig } from "src/types";
import { useCenteredPopover } from "src/hooks/use-centered-popover";

type PropertyType = PropertyConfig["type"];

const allPropertyTypes = [
  "text",
  "number",
  "select",
  "multi_select",
  "status",
  "date",
  "person",
  "checkbox",
  "url",
  "email",
  "phone",
  "formula",
  "relation",
  "rollup",
  "created_time",
  "created_by",
  "edited_time",
  "edited_by",
] as const satisfies readonly PropertyType[];

export interface AddPropertyPopoverProps {
  /** Create the property. icon/iconColor are the chosen default icon. */
  onAddProperty: (
    type: PropertyType,
    name?: string,
    icon?: string,
    iconColor?: string,
  ) => void;
}

export function AddPropertyPopover({ onAddProperty }: AddPropertyPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState<string | undefined>(undefined);
  const [iconColor, setIconColor] = React.useState<string | undefined>(
    undefined,
  );
  const [query, setQuery] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);

  const { triggerRef, targetRef } = useCenteredPopover<
    HTMLButtonElement,
    HTMLInputElement
  >(open);

  const propertyLabel = (t: PropertyType) =>
    PROPERTY_TYPE_META.find((m) => m.type === t)?.label ?? t;

  const reset = () => {
    setName("");
    setIcon(undefined);
    setIconColor(undefined);
    setQuery("");
    setSearchOpen(false);
  };

  // "Leaving without picking does nothing" — closing just discards state; no
  // property is created unless a type is chosen.
  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) reset();
  };

  const create = (type: PropertyType) => {
    onAddProperty(type, name.trim() || undefined, icon, iconColor);
    reset();
    setOpen(false);
  };

  // Filter the type grid by the search query (matches the label).
  const q = query.trim().toLowerCase();
  const filteredTypes = q
    ? allPropertyTypes.filter((t) => propertyLabel(t).toLowerCase().includes(q))
    : allPropertyTypes;

  // Collapsed: just the button.
  if (!open) {
    return (
      <Button
        ref={triggerRef}
        variant="ghost"
        style={{ background: "transparent" }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={() => setOpen(true)}
      >
        <Plus className="tiptap-button-icon" />
        <span className="tiptap-button-text" style={{ fontWeight: 400 }}>
          Add Property
        </span>
      </Button>
    );
  }

  // Expanded: input + icon picker as an ANCHORED row (not a trigger, so
  // clicking/typing in it doesn't toggle the popover), with the type grid
  // controlled-open beside it.
  return (
    <Popover open onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div
          className="db-add-prop__row"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            paddingRight: 2,

            minHeight: 38,
          }}
        >
          {/* Default-icon picker beside the input */}
          <IconPickerPopover
            onSelect={(iconName, color) => {
              setIcon(iconName);
              setIconColor(color);
            }}
          >
            <Button
              variant="ghost"
              tooltip="Icon"
              style={{
                border: "1px solid var(--tt-border-color)",
                minHeight: 30,
                height: 30,
                padding: "0 6px",
              }}
            >
              <DynamicIcon
                name={icon ?? "smile"}
                size={18}
                style={{ color: iconColor }}
                className="tiptap-button-icon"
              />
            </Button>
          </IconPickerPopover>

          <Input
            ref={targetRef}
            autoFocus
            value={name}
            placeholder="Type property name..."
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                create("text");
              }
            }}
            style={{
              flex: 1,
              minWidth: 0,
              boxSizing: "border-box",
              background: "var(--tt-bg-color)",
              color: "var(--tt-text-primary)",
              outline: "none",
            }}
          />
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        avoidCollisions
        collisionPadding={8}
        // Don't steal focus from the input when the grid opens.
        onOpenAutoFocus={(e) => e.preventDefault()}
        // Focusing the anchored input, or opening the nested icon picker
        // (portaled elsewhere), registers as "interaction outside" and would
        // dismiss this popover. Keep it open for interactions inside our own
        // row or inside any other floating popover/menu content.
        onInteractOutside={(e) => {
          const t = e.target as HTMLElement | null;
          if (!t) return;
          if (
            t.closest(".db-add-prop__row") ||
            t.closest("[data-radix-popper-content-wrapper]") ||
            t.closest("[role='dialog']") ||
            t.closest("[role='menu']")
          ) {
            e.preventDefault();
          }
        }}
      >
        <Card
          className="table-header-popover-card"
          style={{ maxHeight: 400, minWidth: 380 }}
        >
          <CardBody style={{ width: "100%" }}>
            <CardItemGroup>
              <CardGroupLabel
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <span>Select type</span>
                <Button
                  variant="ghost"
                  aria-label="Search types"
                  style={{ padding: 2, background: "transparent" }}
                  onClick={() => setSearchOpen((v) => !v)}
                >
                  <DynamicIcon
                    name="search"
                    size={16}
                    className="tiptap-button-icon"
                  />
                </Button>
              </CardGroupLabel>

              {searchOpen && (
                <Input
                  autoFocus
                  value={query}
                  placeholder="Search types..."
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    width: "100%",
                    marginBottom: 6,
                    background: "var(--tt-bg-color)",
                    color: "var(--tt-text-primary)",
                  }}
                />
              )}

              <Grid columns="1fr 1fr" gap={6}>
                {chunk(filteredTypes, 2).map((gridRow, i) => (
                  <GridRow key={i}>
                    {gridRow.map((t) => {
                      const iconName = PROPERTY_TYPE_ICONS[t];
                      return (
                        <GridCell key={t}>
                          <Button
                            variant="ghost"
                            style={{
                              borderRadius: "var(--tt-radius-sm)",
                              width: "100%",
                              justifyContent: "flex-start",
                              gap: 8,
                            }}
                            onClick={() => create(t)}
                          >
                            <DynamicIcon
                              name={iconName}
                              size={20}
                              filled={false}
                              className="tiptap-button-icon"
                            />
                            <span className="tiptap-button-text">
                              {propertyLabel(t)}
                            </span>
                          </Button>
                        </GridCell>
                      );
                    })}
                  </GridRow>
                ))}
              </Grid>
            </CardItemGroup>
          </CardBody>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
