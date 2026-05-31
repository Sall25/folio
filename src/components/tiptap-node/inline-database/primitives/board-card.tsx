import { useMemo } from "react";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { findPage } from "src/lib/find-page";
import { usePeekPage } from "src/components/tiptap-templates/simple/context/peek-page-context";
import { Cell } from "../components/cells/cell";
import { BoardCardCover } from "../primitives/board-card-cover";
import { BoardCardContent } from "../primitives/board-card-content";
import type {
  DataSourceRecord,
  DatabaseProperty,
  CellValue,
} from "../types/types";
//import "./board-card.scss";
import { useDraggable } from "@dnd-kit/core";

export function BoardCard({
  record,
  properties,
  cardPreview,
  onChange,
}: {
  record: DataSourceRecord;
  properties: DatabaseProperty[];
  cardPreview: "none" | "cover" | "content";
  sourceId: string;
  onChange: (propertyId: string, value: CellValue | null) => void;
}) {
  const { pages } = usePages();
  const { setPeekPageId } = usePeekPage();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: record.id });

  const linkedPage = useMemo(
    () =>
      record.pageId != null && pages
        ? (findPage(pages, record.pageId) ?? null)
        : null,
    [pages, record.pageId],
  );

  const titleProp = properties.find((p) => p.config.type === "title") ?? null;
  const otherProps = properties.filter((p) => p.config.type !== "title");

  return (
    <div
      ref={setNodeRef}
      className="db-board-card"
      style={{
        transform: transform
          ? `translate(${transform.x}px, ${transform.y}px)`
          : undefined,
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? "grabbing" : "grab",
        zIndex: isDragging ? 10 : undefined,
      }}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (isDragging) return;
        if (record.pageId != null) setPeekPageId(record.pageId);
      }}
    >
      {cardPreview === "cover" && (
        <BoardCardCover page={linkedPage} recordId={record.id} height={120} />
      )}
      {cardPreview === "content" && <BoardCardContent page={linkedPage} />}

      {titleProp && (
        <div
          className="db-board-card__title"
          onClick={(e) => e.stopPropagation()}
        >
          <Cell
            property={titleProp}
            value={(record.values[titleProp.id] ?? null) as CellValue | null}
            record={record}
            onChange={(v) => onChange(titleProp.id, v)}
          />
        </div>
      )}

      <div
        className="db-board-card__props"
        onClick={(e) => e.stopPropagation()}
      >
        {otherProps.map((prop) => (
          <Cell
            key={prop.id}
            property={prop}
            value={(record.values[prop.id] ?? null) as CellValue | null}
            record={record}
            onChange={(v) => onChange(prop.id, v)}
          />
        ))}
      </div>
    </div>
  );
}
