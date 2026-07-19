import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { Cell } from "../components/cells/cell";
import { BoardCardCover } from "../primitives/board-card-cover";
import { BoardCardContent } from "../primitives/board-card-content";
import type {
  Page,
  DatabaseProperty,
  CellValue,
  DatabaseView,
} from "src/types";
import "./board-card.scss";
import { useDraggable } from "@dnd-kit/core";

// A card hides properties that have no value (Notion behavior), so cards size
// to their real content instead of showing empty boxes. Checkbox is excluded:
// `false` is a meaningful value, not "empty", so checkboxes always render.
function isEmptyCellValue(
  value: CellValue | null,
  prop: DatabaseProperty,
): boolean {
  if (prop.config.type === "checkbox") return false; // always show checkboxes
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function BoardCard({
  record: linkedPage,
  properties,
  cardPreview,
  onChange,
  view,
  columnValuesByProp,
}: {
  record: Page;
  properties: DatabaseProperty[];
  cardPreview: "none" | "cover" | "content";
  sourceId: string;
  onChange: (propertyId: string, value: CellValue | null) => void;
  view: DatabaseView;
  /** propertyId → column max, for number bar/ring fills. */
  numberMaxes?: Record<string, number>;
  columnValuesByProp?: Record<string, CellValue[]>;
}) {
  const { setTarget } = usePageView();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: linkedPage.id });

  const titleProp = properties.find((p) => p.config.type === "title") ?? null;
  // Non-title props that actually have a value — empty ones are hidden so the
  // card has no blank-box gap between title and the populated fields.
  const otherProps = properties.filter((p) => {
    if (p.config.type === "title") return false;
    const v = (linkedPage.values?.[p.id] ?? null) as CellValue | null;
    return !isEmptyCellValue(v, p);
  });

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
        padding: 0,
        borderRadius: "var(--tt-radius-sm)",
      }}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (isDragging) return;
        if (linkedPage.id != null)
          setTarget({ pageId: linkedPage.id, view: "Center" });
      }}
    >
      {cardPreview === "cover" && (
        <BoardCardCover
          page={linkedPage}
          recordId={linkedPage.id}
          height={120}
        />
      )}
      {cardPreview === "content" && <BoardCardContent page={linkedPage} />}

      {titleProp && (
        <div
          className="db-board-card__title"
          onClick={(e) => e.stopPropagation()}
        >
          <Cell
            property={titleProp}
            value={
              (linkedPage.values?.[titleProp.id] ?? null) as CellValue | null
            }
            record={linkedPage}
            onChange={(v) => onChange(titleProp.id, v)}
            view={view}
            properties={properties}
            columnValues={
              !columnValuesByProp ? [] : columnValuesByProp[titleProp.id]
            }
          />
        </div>
      )}

      {otherProps.length > 0 && (
        <div
          className="db-board-card__props"
          onClick={(e) => e.stopPropagation()}
        >
          {otherProps.map((prop) => (
            <Cell
              key={prop.id}
              property={prop}
              value={(linkedPage.values?.[prop.id] ?? null) as CellValue | null}
              record={linkedPage}
              onChange={(v) => onChange(prop.id, v)}
              view={view}
              properties={properties}
              columnValues={
                !columnValuesByProp ? [] : columnValuesByProp[prop.id]
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
