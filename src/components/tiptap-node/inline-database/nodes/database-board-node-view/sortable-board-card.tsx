import { useSortable } from "@dnd-kit/sortable";
import type { ID } from "src/types";
import { CSS } from "@dnd-kit/utilities";

// Sortable wrapper — owns the drag so BoardCard runs with disableDrag.
export function SortableBoardCard({
  id,
  children,
}: {
  id: ID;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
