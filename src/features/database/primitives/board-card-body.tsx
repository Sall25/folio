import { useOpenRecord } from "../hooks/use-open-record";
import type {
  CellValue,
  DatabaseProperty,
  DatabaseView,
  FileValue,
  Page,
} from "src/types";
import { BoardCardCover } from "./board-card-cover";
import { BoardCardContent } from "./board-card-content";
import { Cell } from "../components/cells/cell";
import { BoardCardControls } from "../components/board-card-controls/board-card-controls";
import { useRef, useState } from "react";
import { useCurrentEditor } from "@tiptap/react";
import type { DragStorage } from "../extensions";
import { normalizeColor } from "../utils/pill-colors";
import "./board-card-body.scss";
import { useCardActions } from "../context";
import { useAssignToMe } from "../hooks/use-assign-to-me";

// Gallery cover height per card size. A fitted image is as tall as the cover,
// so a taller cover is also a wider image.
const GALLERY_COVER_HEIGHT = { small: 150, medium: 190, large: 230 } as const;

export function BoardCardBody({
  record,
  properties,
  titleProp,
  otherProps,
  cardPreview,
  view,
  recordId,
  setCellValue,
  color,
}: {
  record: Page;
  properties: DatabaseProperty[];
  titleProp: DatabaseProperty | null;
  otherProps: DatabaseProperty[];
  cardPreview: "none" | "cover" | "content";
  view: DatabaseView;
  recordId: string | null;
  setCellValue: (
    recordId: string,
    propertyId: string,
    value: CellValue | null,
  ) => void;
  color?: string;
}) {
  const onOpenRecord = useOpenRecord(view);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const positionRef = useRef<number | null>(null);
  const cardActions = useCardActions();
  const assignToMe = useAssignToMe(properties, setCellValue)(record);
  const { editor } = useCurrentEditor();
  const fit =
    view.type === "gallery" || view.type === "board" ? view.coverFit : "cover";
  const cardLayout =
    view.type === "gallery" || view.type === "board"
      ? (view.cardLayout ?? "list")
      : "list";
  // The cover from a Files & media property (Card preview → that
  // property): its first image, and how many files it holds.
  const coverPropertyId =
    view.type === "gallery" || view.type === "board"
      ? view.coverPropertyId
      : undefined;
  const coverFiles = coverPropertyId
    ? ((record.values?.[coverPropertyId] ?? []) as FileValue[])
    : null;
  const filesCover = coverFiles
    ? {
        src:
          coverFiles.find(
            (f) =>
              f.mimeType?.startsWith("image/") ||
              /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test(f.url),
          )?.url ?? null,
        count: coverFiles.length,
      }
    : undefined;
  // Notion offers Reposition only for an image that fills the cover.
  const canReposition =
    !filesCover && !!record.cover?.coverImage && fit !== "contain";

  if (!recordId) return null;

  return (
    <div
      className="db-board-card"
      data-record-id={recordId ?? undefined}
      data-type="database-record"
      data-view-type={view.type}
      data-dragging={dragging}
      // In a coloured board column the card takes its colour (see
      // board-card-body.scss): a tinted border, and a tinted card in dark.
      data-accent={(view.type === "board" && !!color) || undefined}
      draggable
      style={{
        ...(view.type === "board" && color
          ? ({
              "--card-accent": `var(--tt-color-accent-${normalizeColor(color)})`,
            } as React.CSSProperties)
          : {}),
        borderRadius: "var(--tt-radius-lg)",
        padding: 0,
        margin: view.type === "gallery" ? "0px !important" : undefined,
        height: view.type === "board" ? "fit-content" : "100%",
      }}
      onDragStart={(event) => {
        // Dragging the image moves it inside the cover, not the card.
        if (repositioning) {
          event.preventDefault();
          return;
        }
        if (!editor) return;
        setDragging(true);
        const storage = editor.storage.boardDrag as DragStorage;
        // if (!storage.isBoardActive()) return false;
        // eslint-disable-next-line react-hooks/immutability
        storage.draggingId = recordId;
        if (storage.draggingId && event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", storage.draggingId);
        }
      }}
      onDragEnd={() => setDragging(false)}
      onClick={() => onOpenRecord(recordId)}
    >
      {cardPreview === "cover" && (
        <>
          <BoardCardCover
            page={record}
            recordId={recordId}
            files={filesCover}
            height={
              view.type === "gallery"
                ? GALLERY_COVER_HEIGHT[view.cardSize ?? "medium"]
                : 120
            }
            fit={fit}
            repositioning={repositioning}
            onPositionChange={(y) => {
              positionRef.current = y;
            }}
            onPositionCommit={() => {
              if (positionRef.current === null) return;
              cardActions?.setRecordCoverPosition(
                recordId,
                positionRef.current,
              );
              positionRef.current = null;
            }}
          />
          <BoardCardControls
            record={record}
            onOpenRecord={() => onOpenRecord(recordId)}
            editing={editing}
            onEnableEdit={() => setEditing(true)}
            menuOpen={menuOpen}
            onMenuOpenChange={setMenuOpen}
            onReposition={
              canReposition ? () => setRepositioning((r) => !r) : undefined
            }
            repositioning={repositioning}
            onAssignToMe={assignToMe}
            color={color}
          />
        </>
      )}
      {cardPreview === "content" && <BoardCardContent page={record} />}
      {titleProp && (
        <div
          className="db-board-card__title"
          style={{ background: "transparent" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Cell
            property={titleProp}
            value={(record.values?.[titleProp.id] ?? null) as CellValue | null}
            record={record}
            onChange={(v) => setCellValue(recordId, titleProp.id, v)}
            view={view}
            properties={properties}
            onEditingChange={setEditing}
            autoEdit={editing}
            unwrapped={false}
          />

          {cardPreview !== "cover" && view.type !== "calendar" && (
            <BoardCardControls
              record={record}
              onOpenRecord={() => onOpenRecord(recordId)}
              editing={editing}
              onEnableEdit={() => setEditing(true)}
              menuOpen={menuOpen}
              onMenuOpenChange={setMenuOpen}
              onAssignToMe={assignToMe}
              color={color}
            />
          )}
        </div>
      )}
      {view.type !== "calendar" && (
        <div
          className="db-board-card__props"
          data-layout={cardLayout}
          onClick={(e) => e.stopPropagation()}
        >
          {otherProps.map((p) => (
            <Cell
              key={p.id}
              property={p}
              value={(record.values?.[p.id] ?? null) as CellValue | null}
              record={record}
              onChange={(v) => setCellValue(recordId, p.id, v)}
              view={view}
              properties={properties}
            />
          ))}
        </div>
      )}
    </div>
  );
}
