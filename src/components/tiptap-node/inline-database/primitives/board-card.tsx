import { usePageViewActions } from "src/components/tiptap-templates/simple/context/page-view-context";
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
import { BoardCardControls } from "../components/board-card-controls/board-card-controls";
import { useCallback, useState } from "react";
import { useActivePageActions } from "src/components/tiptap-templates/simple/context/active-page-context";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

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
const EMPTY_CELL_VALUES: CellValue[] = [];

export function BoardCard({
  record: linkedPage,
  properties,
  cardPreview,
  onChange,
  view,
  columnValuesByProp = {},
  onCoverPositionChange,
  onCoverPositionCommit,
  disableDrag = false,
  coverHeight = 140,
}: {
  record: Page;
  properties: DatabaseProperty[];
  cardPreview: "none" | "cover" | "content";
  sourceId: string;
  onChange: (propertyId: string, value: CellValue | null, record: Page) => void;
  view: DatabaseView;
  columnValuesByProp?: Record<string, CellValue[]>;
  onCoverPositionChange?: (
    recordId: string,
    positionY: number,
    record: Page,
  ) => void;
  onCoverPositionCommit?: () => void;
  disableDrag?: boolean;
  coverHeight?: number;
}) {
  const [repositioning, setRepositioning] = useState(false);
  const { setTarget } = usePageViewActions();
  const { setActivePageId } = useActivePageActions();
  // When a parent (e.g. the gallery's SortableContext) owns the drag, don't
  // register our own — two dnd nodes with the same id cancel each other out
  // and the drop never resolves.
  const draggable = useDraggable({
    id: linkedPage.id,
    disabled: disableDrag || repositioning,
  });
  const setNodeRef = disableDrag ? undefined : draggable.setNodeRef;
  const attributes = disableDrag ? undefined : draggable.attributes;
  const listeners = disableDrag ? undefined : draggable.listeners;
  const transform = disableDrag ? null : draggable.transform;
  const isDragging = disableDrag ? false : draggable.isDragging;

  const titleProp = properties.find((p) => p.config.type === "title") ?? null;
  // Non-title props that actually have a value — empty ones are hidden so the
  // card has no blank-box gap between title and the populated fields.
  const otherProps = properties.filter((p) => {
    if (p.config.type === "title") return false;
    const v = (linkedPage.values?.[p.id] ?? null) as CellValue | null;
    return !isEmptyCellValue(v, p);
  });
  // a shared open helper, matching the title cell's logic:
  const openRecord = useCallback(() => {
    const pageId = linkedPage.id;
    if (pageId == null || !view) return;
    if (view.openPageIn === "Side") {
      setTarget({ pageId, view: "Peek" });
    } else if (view.openPageIn === "Center") {
      setTarget({ pageId, view: "Center" });
    } else if (view.openPageIn === "Full") {
      setActivePageId(pageId);
    } else {
      // gallery/board default → Center (or Peek — match your title-cell default)
      setTarget({ pageId, view: "Center" });
    }
  }, [linkedPage.id, setTarget, setActivePageId, view]);
  const [editing, setEditing] = useState(false);

  // title-editing enable = set editing true → title cell focuses
  const enableEdit = useCallback(() => setEditing(true), []);

  const onPositionChange = useCallback(
    (positionY: number) =>
      onCoverPositionChange?.(linkedPage.id, positionY, linkedPage),
    [linkedPage, onCoverPositionChange],
  );

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      ref={setNodeRef}
      className="db-board-card"
      data-menu-open={menuOpen || undefined}
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
        if (repositioning) return; // ← don't open while repositioning
        openRecord();
      }}
    >
      {cardPreview === "cover" ? (
        <>
          <div className="db-board-card__cover-wrap">
            <BoardCardCover
              page={linkedPage}
              recordId={linkedPage.id}
              height={coverHeight}
              repositioning={repositioning}
              onPositionChange={onPositionChange}
              onPositionCommit={onCoverPositionCommit}
            />
            <BoardCardControls
              key={"reposition-card"}
              record={linkedPage}
              repositioning={repositioning}
              onReposition={() => setRepositioning((v) => !v)}
              menuOpen={menuOpen}
              onMenuOpenChange={setMenuOpen}
              editing={editing}
              onEnableEdit={enableEdit}
              onOpenRecord={openRecord}
            />
          </div>
          <Spacer orientation="vertical" size={10} />
        </>
      ) : (
        <BoardCardControls
          key={"no-reposition-card"}
          record={linkedPage}
          menuOpen={menuOpen}
          onMenuOpenChange={setMenuOpen}
          editing={editing}
          onEnableEdit={enableEdit}
          onOpenRecord={openRecord}
        />
      )}

      {cardPreview === "content" && (
        <>
          <BoardCardContent page={linkedPage} />
          <Spacer orientation="vertical" size={10} />
        </>
      )}

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
            onChange={(v) => onChange(titleProp.id, v, linkedPage)}
            view={view}
            properties={properties}
            columnValues={
              !columnValuesByProp
                ? EMPTY_CELL_VALUES
                : columnValuesByProp[titleProp.id]
            }
            autoEdit={editing}
            onEditingChange={setEditing}
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
              onChange={(v) => onChange(prop.id, v, linkedPage)}
              view={view}
              properties={properties}
              columnValues={
                !columnValuesByProp
                  ? EMPTY_CELL_VALUES
                  : columnValuesByProp[prop.id]
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
