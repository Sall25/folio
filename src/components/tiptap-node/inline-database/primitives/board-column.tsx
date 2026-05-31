import { useDroppable } from "@dnd-kit/core";

export function BoardColumn({
  columnId,
  children,
  isOver,
}: {
  columnId: string;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: columnId });
  return (
    <div
      ref={setNodeRef}
      className={`db-board-col__cards${isOver ? " db-board-col__cards--over" : ""}`}
    >
      {children}
    </div>
  );
}
