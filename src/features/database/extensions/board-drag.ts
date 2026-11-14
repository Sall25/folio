import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { DatabaseView } from "src/types";
import {
  beforeCardAtPoint,
  galleryDropTarget,
  beforeRecordAtPoint,
  columnKeyAtPoint,
  hideGalleryDropIndicator,
  hideRowDropIndicator,
  rowDropTarget,
  showRowDropIndicator,
} from "./utils";
import { readDatabaseData } from "../utils/database-bridge";

export interface DropInfo {
  recordId: string;
  beforeRecordId: string | null;
  targetColumnKey?: string;
  targetDate?: string; // ISO date, calendar drops only
}

/** What one database on the page does with a drop (database-provider.tsx). */
export interface DatabaseDropHandler {
  onDrop: (info: DropInfo) => void;
  getActiveView: () => DatabaseView["type"];
}

export interface DragStorage {
  /** Every database on the page, by its id (the node's attrs.id). A page can
   *  hold several; a drop goes to the one it lands in. */
  databases: Map<string, DatabaseDropHandler>;
  draggingId: string | null;
}

declare module "@tiptap/core" {
  interface Storage {
    boardDrag: DragStorage;
  }
}

const boardDragKey = new PluginKey("boardDrag");

export const BoardDrag = Extension.create<unknown, DragStorage>({
  name: "boardDrag",

  addStorage() {
    return { databases: new Map(), draggingId: null };
  },

  addProseMirrorPlugins() {
    // Capture the extension instance so the plugin reads live storage.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ext = this;

    return [
      new Plugin({
        key: boardDragKey,
        props: {
          handleDOMEvents: {
            drop(_view, event) {
              const storage = ext.storage as DragStorage;
              const draggingId = storage.draggingId;
              if (!draggingId) return false;

              const target = event.target as HTMLElement;

              // The database the drop landed in. Every database view root
              // carries data-database-id; its handler knows its own view.
              const dbEl = target.closest<HTMLElement>("[data-database-id]");
              const handler = dbEl?.dataset.databaseId
                ? storage.databases.get(dbEl.dataset.databaseId)
                : undefined;

              if (!dbEl || !handler) {
                // Dropped outside any database: cancel the card move, and
                // keep ProseMirror from inserting the dragged text.
                event.preventDefault();
                storage.draggingId = null;
                return true;
              }

              const view = handler.getActiveView();

              // A table, list or timeline row (dragged by its handle,
              // drag-handle.tsx): reorder within its group.
              if (view === "table" || view === "list" || view === "timeline") {
                event.preventDefault();
                hideRowDropIndicator();
                const databaseId = dbEl.dataset.databaseId!;
                const rowSlots =
                  readDatabaseData(ext.editor, databaseId)?.sortedRecordIds ??
                  [];
                const target = rowDropTarget(
                  dbEl,
                  databaseId,
                  rowSlots,
                  event.clientY,
                  draggingId,
                );
                if (target) {
                  handler.onDrop({
                    recordId: draggingId,
                    beforeRecordId: target.beforeRecordId,
                  });
                }
                storage.draggingId = null;
                return true;
              }

              if (view === "board") {
                const grid = target.closest<HTMLElement>(".db-board-grid");

                if (!grid) {
                  event.preventDefault();
                  return true;
                }

                event.preventDefault();

                const targetColumnKey = columnKeyAtPoint(grid, event.clientX);

                if (!targetColumnKey) {
                  storage.draggingId = null;
                  return false;
                }

                const beforeRecordId = beforeCardAtPoint(
                  grid,
                  targetColumnKey,
                  event.clientY,
                  draggingId,
                );

                hideGalleryDropIndicator(grid);

                handler.onDrop({
                  recordId: draggingId,
                  targetColumnKey,
                  beforeRecordId,
                });

                storage.draggingId = null;

                return true;
              }

              if (view === "gallery") {
                // The grid itself, or (dropped just outside it, still inside
                // the database) this database's grid.
                const gallery =
                  target.closest<HTMLElement>(".db-board-grid") ??
                  dbEl.querySelector<HTMLElement>(".db-board-grid");

                if (!gallery) {
                  event.preventDefault();
                  storage.draggingId = null;
                  return true;
                }
                event.preventDefault();

                const { beforeRecordId } = galleryDropTarget(
                  gallery,
                  event.clientX,
                  event.clientY,
                  draggingId,
                );

                hideGalleryDropIndicator(gallery);

                handler.onDrop({
                  recordId: draggingId,
                  beforeRecordId,
                });

                storage.draggingId = null;

                return true;
              }

              if (view === "calendar") {
                // Each CalendarCell carries data-date="YYYY-MM-DD" (added below) —
                // no need for a column-key lookup, we read the date straight off
                // the cell under the pointer.
                const dayCell = target.closest<HTMLElement>(
                  ".db-calendar__cell[data-date]",
                );

                if (!dayCell) {
                  event.preventDefault();
                  return true;
                }

                event.preventDefault();

                const targetDate = dayCell.dataset.date;

                if (!targetDate) {
                  storage.draggingId = null;
                  return false;
                }

                const beforeRecordId = beforeRecordAtPoint(
                  dayCell,
                  event.clientY,
                  draggingId,
                );

                handler.onDrop({
                  recordId: draggingId,
                  targetDate,
                  beforeRecordId,
                });

                storage.draggingId = null;

                return true;
              }

              storage.draggingId = null;
              return false;
            },
            dragover(_view, event) {
              event.preventDefault();

              // While a row is dragged over a table / list, draw the line
              // where it will land (the same calculation as the drop).
              const storage = ext.storage as DragStorage;
              const draggingId = storage.draggingId;
              if (draggingId) {
                const dbEl = (event.target as HTMLElement).closest<HTMLElement>(
                  "[data-database-id]",
                );
                const databaseId = dbEl?.dataset.databaseId;
                const type = databaseId
                  ? storage.databases.get(databaseId)?.getActiveView()
                  : undefined;
                const target =
                  dbEl && databaseId && (type === "table" || type === "list")
                    ? rowDropTarget(
                        dbEl,
                        databaseId,
                        readDatabaseData(ext.editor, databaseId)
                          ?.sortedRecordIds ?? [],
                        event.clientY,
                        draggingId,
                      )
                    : null;
                if (target) showRowDropIndicator(target.line);
                else hideRowDropIndicator();
              }
              return true;
            },
            dragend() {
              ext.storage.draggingId = null;
              hideRowDropIndicator();
              document.body.classList.remove("db-row-dragging");
              document
                .querySelectorAll<HTMLElement>(".db-gallery-drop-indicator")
                .forEach((indicator) => {
                  indicator.style.display = "none";
                });
              return false;
            },
          },
        },
      }),
    ];
  },
});
