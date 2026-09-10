import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import type {
  CellValue,
  DatabaseProperty,
  DatabaseView,
  Page,
} from "src/types";
import { BoardCardCover } from "./board-card-cover";
import { BoardCardContent } from "./board-card-content";
import { Cell } from "../components/cells/cell";
import { BoardCardControls } from "../components/board-card-controls/board-card-controls";
import { useState } from "react";
import { useCurrentEditor } from "@tiptap/react";
import type { DragStorage } from "../extensions";
import "./board-card-body.scss";

export function BoardCardBody({
  record,
  properties,
  titleProp,
  otherProps,
  cardPreview,
  view,
  recordId,
  setCellValue,
  color = "gray",
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
  const { setTarget } = usePageView();
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { editor } = useCurrentEditor();

  if (!recordId) return null;

  return (
    <div
      className="db-board-card"
      data-record-id={recordId ?? undefined}
      data-type="database-record"
      data-view-type={view.type}
      data-dragging={dragging}
      draggable
      style={{
        // backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        borderRadius: "var(--tt-radius-lg)",
        padding: 0,
        margin: view.type === "gallery" ? "0px !important" : undefined,
        height: view.type === "board" ? "fit-content" : "100%",
      }}
      onDragStart={(event) => {
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
      onDrop={() => setDragging(false)}
      onClick={() => setTarget({ pageId: recordId, view: "Center" })}
    >
      {cardPreview === "cover" && (
        <>
          <BoardCardCover page={record} recordId={recordId} height={120} />
          <BoardCardControls
            record={record}
            onOpenRecord={() => setTarget({ pageId: recordId, view: "Center" })}
            editing={editing}
            onEnableEdit={() => setEditing(true)}
            menuOpen={menuOpen}
            onMenuOpenChange={setMenuOpen}
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
          />

          {cardPreview !== "cover" && (
            <BoardCardControls
              record={record}
              onOpenRecord={() =>
                setTarget({ pageId: recordId, view: "Center" })
              }
              editing={editing}
              onEnableEdit={() => setEditing(true)}
              menuOpen={menuOpen}
              onMenuOpenChange={setMenuOpen}
              color={color}
            />
          )}
        </div>
      )}
      <div
        className="db-board-card__props"
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
    </div>
  );
}
