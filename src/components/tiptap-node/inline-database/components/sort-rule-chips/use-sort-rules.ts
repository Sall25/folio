import { nanoid } from "nanoid";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import type { DatabaseProperty, ID, SortRule } from "src/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";

export function useSortRules(
  db: UseDatabaseReturn,
  viewId: ID,
  sorts: SortRule[],
  properties: DatabaseProperty[],
) {
  const save = (next: SortRule[]) => db.updateView(viewId, { sorts: next });

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

  const clearSorts = () => save([]);

  // Order is precedence — dragging a rule up makes it sort first.
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = sorts.findIndex((s) => s.id === active.id);
    const to = sorts.findIndex((s) => s.id === over.id);
    if (from === -1 || to === -1) return;
    save(arrayMove(sorts, from, to));
  };

  return { updateSort, deleteSort, addSort, clearSorts, onDragEnd };
}
