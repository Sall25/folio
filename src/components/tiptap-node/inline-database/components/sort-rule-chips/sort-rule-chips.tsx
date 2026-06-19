import { nanoid } from "nanoid";
import { Plus, ArrowUp, ArrowDown, Trash, ChevronDown } from "lucide-react";
import {
  Card,
  CardBody,
  CardFooter,
  CardGroupLabel,
} from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type { DatabaseProperty, DatabaseView, ID, SortRule } from "src/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import "./sort-rule-chips.scss";
import { Grid, GridRow } from "src/components/tiptap-ui-primitive/grid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";

function SortChip({
  sort,
  properties,
  onUpdate,
  onDelete,
  locked,
}: {
  sort: SortRule;
  properties: DatabaseProperty[];
  onUpdate: (patch: Partial<SortRule>) => void;
  onDelete: () => void;
  locked: boolean;
}) {
  const property = properties.find((p) => p.id === sort.propertyId);
  const Icon = property ? PROPERTY_TYPE_ICONS[property.config.type] : null;
  const DirIcon = sort.direction === "asc" ? ArrowUp : ArrowDown;

  const chipButton = (
    <Button
      variant="ghost"
      style={{
        border: "1px solid var(--tt-brand-color-400)",
        padding: "2px 8px",
        height: 24,
        minHeight: 24,
        color: "var(--tt-brand-color-400)",
        fontSize: 12,
        cursor: locked ? "default" : undefined,
      }}
    >
      {Icon && (
        <Icon
          className="tiptap-button-icon"
          style={{ color: "inherit", width: 12.5 }}
        />
      )}
      <span className="tiptap-button-text">{property?.name ?? "Property"}</span>
      <DirIcon
        size={11}
        className="tiptap-button-icon-sub"
        style={{ color: "inherit" }}
      />
      {!locked && (
        <ChevronDown
          size={10}
          className="tiptap-button-icon-sub"
          style={{ color: "inherit" }}
        />
      )}
    </Button>
  );

  if (locked) return chipButton;

  return (
    <Popover>
      <PopoverTrigger asChild>{chipButton}</PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="db-panel">
        <Card
          style={{
            padding: "5px",
            minWidth: 200,
            boxShadow: "var(--tt-shadow-elevated-sm)",
          }}
        >
          <CardBody>
            <Grid columns="1fr 1fr" gap={5}>
              <GridRow>
                <CardGroupLabel>Property</CardGroupLabel>
                <CardGroupLabel>Direction</CardGroupLabel>
              </GridRow>
              <GridRow>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      key={property?.id}
                      variant="ghost"
                      style={{
                        justifyContent: "flex-start",
                        width: "100%",
                        border: "1px solid var(--tt-border-color)",
                      }}
                    >
                      {Icon && (
                        <Icon size={13} className="tiptap-button-icon" />
                      )}
                      <span className="tiptap-button-text">
                        {property?.name}
                      </span>
                      <Spacer orientation="horizontal" />
                      <ChevronDown className="tiptap-button-icon-sub" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <Card
                      style={{
                        padding: "5px 10px",
                        boxShadow: "var(--tt-shadow-elevated-sm)",
                      }}
                    >
                      {properties.map((p) => {
                        const PIcon = PROPERTY_TYPE_ICONS[p.config.type];
                        return (
                          <DropdownMenuItem key={p.id} asChild>
                            <Button
                              variant="ghost"
                              style={{
                                justifyContent: "flex-start",
                                width: "100%",
                              }}
                              data-active-state={
                                sort.propertyId === p.id ? "on" : "off"
                              }
                              onClick={() => onUpdate({ propertyId: p.id })}
                            >
                              <PIcon size={13} className="tiptap-button-icon" />
                              <span className="tiptap-button-text">
                                {p.name}
                              </span>
                            </Button>
                          </DropdownMenuItem>
                        );
                      })}
                    </Card>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      style={{
                        justifyContent: "flex-start",
                        width: "100%",
                        border: "1px solid var(--tt-border-color)",
                      }}
                    >
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
                    <Card style={{ padding: "5px 10px" }}>
                      {(["asc", "desc"] as const).map((dir) => (
                        <DropdownMenuItem key={dir} asChild>
                          <Button
                            variant="ghost"
                            style={{
                              justifyContent: "flex-start",
                              width: "100%",
                            }}
                            data-active-state={
                              sort.direction === dir ? "on" : "off"
                            }
                            onClick={() => onUpdate({ direction: dir })}
                          >
                            {dir === "asc" ? (
                              <ArrowUp
                                size={13}
                                className="tiptap-button-icon"
                              />
                            ) : (
                              <ArrowDown
                                size={13}
                                className="tiptap-button-icon"
                              />
                            )}
                            <span className="tiptap-button-text">
                              {dir === "asc" ? "Ascending" : "Descending"}
                            </span>
                          </Button>
                        </DropdownMenuItem>
                      ))}
                    </Card>
                  </DropdownMenuContent>
                </DropdownMenu>
              </GridRow>
            </Grid>
          </CardBody>
          <CardFooter style={{ width: "100%" }}>
            <Button
              variant="ghost"
              onClick={onDelete}
              aria-label="Remove sort"
              style={{
                justifyContent: "flex-start",
                width: "100%",
                borderRadius: "var(--tt-radius-sm)",
              }}
            >
              <Trash className="tiptap-button-icon" />
              <span className="tiptap-button-text">Remove sort</span>
            </Button>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
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
  if (!activeView) return null;
  if (sorts.length === 0) return null;

  const locked = db.locked;

  function updateSort(id: ID, patch: Partial<SortRule>) {
    db.updateView(activeView!.id, {
      sorts: sorts.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  }

  function deleteSort(id: ID) {
    db.updateView(activeView!.id, { sorts: sorts.filter((s) => s.id !== id) });
  }

  function addSort() {
    const unused = properties.find(
      (p) => !sorts.some((s) => s.propertyId === p.id),
    );
    if (!unused) return;
    db.updateView(activeView!.id, {
      sorts: [
        ...sorts,
        { id: nanoid(), propertyId: unused.id, direction: "asc" },
      ],
    });
  }

  return (
    <div className="db-sort-chips">
      {sorts.map((sort) => (
        <SortChip
          key={sort.id}
          sort={sort}
          properties={properties}
          onUpdate={(patch) => updateSort(sort.id, patch)}
          onDelete={() => deleteSort(sort.id)}
          locked={locked}
        />
      ))}
      {!locked && sorts.length < properties.length && (
        <Button
          variant="ghost"
          className="db-sort-chips__add"
          onClick={addSort}
        >
          <Plus className="tiptap-button-icon" />
          <span className="tiptap-button-text">Add sort</span>
        </Button>
      )}
    </div>
  );
}
