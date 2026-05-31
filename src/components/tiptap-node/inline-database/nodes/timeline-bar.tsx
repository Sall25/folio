import { useDraggable } from "@dnd-kit/core";
import type { CSSProperties } from "react";

export interface BarGeo {
  left: number;
  width: number;
}

export function TimelineBar({
  recordId,
  title,
  geo,
  hasEnd,
  canResize,
  onResizeStart,
  onOpen,
}: {
  recordId: string;
  title: string;
  geo: BarGeo;
  hasEnd: boolean;
  canResize: boolean;
  onResizeStart: (e: React.MouseEvent, edge: "start" | "end") => void;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: recordId });

  // live horizontal follow while dragging the whole bar
  const dx = transform?.x ?? 0;

  const style: CSSProperties = {
    left: geo.left,
    width: geo.width,
    transform: `translateX(${dx}px)`,
    opacity: isDragging ? 0.7 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 10 : 3,
  };

  return (
    <div
      ref={setNodeRef}
      className="db-tl-bar"
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // suppress the click that fires at the end of a drag
        if (isDragging) return;
        e.stopPropagation();
        onOpen();
      }}
    >
      {canResize && hasEnd && (
        <div
          className="db-tl-bar__handle db-tl-bar__handle--left"
          // stop dnd-kit from starting a whole-bar drag when grabbing a handle
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => onResizeStart(e, "start")}
        />
      )}
      <span className="db-tl-bar__title">{title}</span>
      {canResize && hasEnd && (
        <div
          className="db-tl-bar__handle db-tl-bar__handle--right"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => onResizeStart(e, "end")}
        />
      )}
    </div>
  );
}
