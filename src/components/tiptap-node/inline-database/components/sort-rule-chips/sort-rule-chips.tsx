import { Plus, Trash } from "lucide-react";
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
import { Button } from "src/components/tiptap-ui-primitive/button";
import type { DatabaseProperty, SortRule } from "src/types";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortRow } from "./sort-row";
import { SortChipButton } from "./sort-chip-button";
import { useSortRules } from "./use-sort-rules";
import { useDatabaseContext } from "../../nodes/database-context";
import "./sort-rule-chips.scss";

const EMPTY_SORTS: SortRule[] = [];
const EMPTY_PROPERTIES: DatabaseProperty[] = [];

export function SortRuleChips() {
  const { db, attrs } = useDatabaseContext();
  const activeView = db.activeView;
  const sorts = activeView?.sorts ?? EMPTY_SORTS;
  const properties = attrs.properties ?? EMPTY_PROPERTIES;
  const locked = db.locked;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const { updateSort, deleteSort, addSort, clearSorts, onDragEnd } =
    useSortRules(db, activeView?.id ?? "", sorts, properties);

  if (!activeView) return null;
  if (sorts.length === 0) return null;

  // Locked → the chip is a static badge, no popover.
  if (locked) {
    return (
      <div className="db-sort-chips">
        <SortChipButton count={sorts.length} locked />
      </div>
    );
  }

  return (
    <div className="db-sort-chips" contentEditable={false}>
      <Popover>
        <PopoverTrigger asChild>
          <SortChipButton count={sorts.length} locked={false} />
        </PopoverTrigger>
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
                onClick={clearSorts}
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
