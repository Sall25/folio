import { nanoid } from "nanoid";
import { Plus, X, GripVertical } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardBody,
  CardItemGroup,
  CardGroupLabel,
} from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import type {
  DatabaseAttrs,
  DatabaseView,
  ID,
  SortRule,
} from "../../types/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import { PROPERTY_TYPE_ICONS } from "../../types/property-type-meta";
import "./sort-panel.scss";
import {
  Grid,
  GridCell,
  GridRow,
} from "src/components/tiptap-ui-primitive/grid";

function SortRuleRow({
  sort,
  attrs,
  onUpdate,
  onDelete,
}: {
  sort: SortRule;
  attrs: DatabaseAttrs;
  onUpdate: (patch: Partial<SortRule>) => void;
  onDelete: () => void;
}) {
  const property = attrs.properties.find((p) => p.id === sort.propertyId);
  const Icon = property ? PROPERTY_TYPE_ICONS[property.config.type] : null;

  return (
    <GridRow>
      <GridCell>
        <Button variant="ghost" style={{ background: "transparent" }}>
          <GripVertical size={13} className="tiptap-button-icon" />
        </Button>
      </GridCell>
      <GridCell>
        {/* Property selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="db-sort-rule__btn db-sort-rule__btn--property"
            >
              {Icon && <Icon className="tiptap-button-icon" size={12} />}
              <span className="tiptap-button-text">
                {property?.name ?? "Property"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="db-panel">
            <Card style={{ padding: "5px 10px", minWidth: 180 }}>
              <CardItemGroup>
                {attrs.properties.map((p) => {
                  const PIcon = PROPERTY_TYPE_ICONS[p.config.type];
                  return (
                    <Button
                      key={p.id}
                      variant="ghost"
                      style={{
                        justifyContent: "flex-start",
                        width: "100%",
                        fontWeight: p.id === sort.propertyId ? 600 : 400,
                      }}
                      onClick={() => onUpdate({ propertyId: p.id })}
                    >
                      <PIcon size={13} className="tiptap-button-icon" />
                      <span className="tiptap-button-text">{p.name}</span>
                    </Button>
                  );
                })}
              </CardItemGroup>
            </Card>
          </PopoverContent>
        </Popover>
      </GridCell>
      <GridCell>
        {/* Direction selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="db-sort-rule__btn db-sort-rule__btn--direction"
            >
              {sort.direction === "asc" ? "Ascending" : "Descending"}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="db-panel">
            <Card style={{ padding: "5px 10px", minWidth: 140 }}>
              <CardItemGroup>
                {(["asc", "desc"] as const).map((dir) => (
                  <Button
                    key={dir}
                    variant="ghost"
                    style={{
                      justifyContent: "flex-start",
                      width: "100%",
                      fontWeight: sort.direction === dir ? 600 : 400,
                    }}
                    onClick={() => onUpdate({ direction: dir })}
                  >
                    <span className="tiptap-button-text">
                      {dir === "asc" ? "Ascending" : "Descending"}
                    </span>
                  </Button>
                ))}
              </CardItemGroup>
            </Card>
          </PopoverContent>
        </Popover>
      </GridCell>
      <GridCell>
        <Button
          variant="ghost"
          // className="db-sort-rule__delete"
          onClick={onDelete}
        >
          <X
            style={{ color: "var(--tt-color-red-base)" }}
            className="tiptap-button-icon"
            size={12}
          />
        </Button>
      </GridCell>
    </GridRow>
  );
}

export function SortPanel({
  attrs,
  db,
  activeView,
  sorts,
}: {
  attrs: DatabaseAttrs;
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
  sorts: SortRule[];
}) {
  if (!activeView) return null;

  function addSort() {
    const unusedProp = attrs.properties.find(
      (p) => !sorts.some((s) => s.propertyId === p.id),
    );
    if (!unusedProp) return;
    const newSort: SortRule = {
      id: nanoid(),
      propertyId: unusedProp.id,
      direction: "asc",
    };
    db.updateView(activeView!.id, { sorts: [...sorts, newSort] });
    db.sortDatabaseRecords();
  }

  function updateSort(id: ID, patch: Partial<SortRule>) {
    db.updateView(activeView!.id, {
      sorts: sorts.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
    db.sortDatabaseRecords();
  }

  function deleteSort(id: ID) {
    db.updateView(activeView!.id, { sorts: sorts.filter((s) => s.id !== id) });
    db.sortDatabaseRecords();
  }

  return (
    <Card className="db-sort-panel">
      <CardHeader>
        {sorts.length === 0 ? (
          <span className="db-panel__empty">No sorts applied to this view</span>
        ) : (
          <CardGroupLabel>Sort</CardGroupLabel>
        )}
      </CardHeader>

      {sorts.length > 0 && (
        <CardBody style={{ width: "100%" }}>
          <Grid columns="20px 1fr 1fr 25px" gap={10} style={{ width: "100%" }}>
            {sorts.map((sort) => (
              <SortRuleRow
                key={sort.id}
                sort={sort}
                attrs={attrs}
                onUpdate={(patch) => updateSort(sort.id, patch)}
                onDelete={() => deleteSort(sort.id)}
              />
            ))}
          </Grid>
        </CardBody>
      )}

      <CardFooter style={{ width: "100%" }}>
        <Button
          variant="ghost"
          onClick={addSort}
          disabled={sorts.length >= attrs.properties.length}
          style={{ justifyContent: "flex-start", width: "100%" }}
        >
          <Plus size={13} className="tiptap-button-icon" />
          <span className="tiptap-button-text">Add sort</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
