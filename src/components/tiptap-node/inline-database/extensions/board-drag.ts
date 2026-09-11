import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { DatabaseView } from "src/types";
import {
  beforeCardAtPoint,
  beforeGalleryCardAtPoint,
  beforeRecordAtPoint,
  columnKeyAtPoint,
  hideGalleryDropIndicator,
} from "./utils";

export interface DropInfo {
  recordId: string;
  beforeRecordId: string | null;
  targetColumnKey?: string;
  targetDate?: string; // ISO date, calendar drops only
}

export interface DragStorage {
  onDrop: (info: DropInfo) => void;
  isBoardActive: () => boolean;
  draggingId: string | null;
  getActiveView: () => DatabaseView["type"];
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
    return {
      onDrop: () => {},
      isBoardActive: () => false,
      draggingId: null,
      getActiveView() {
        return "board";
      },
    };
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
              const view = storage.getActiveView();
              const draggingId = storage.draggingId;

              if (!view || !draggingId) return false;

              const target = event.target as HTMLElement;

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

                storage.onDrop({
                  recordId: draggingId,
                  targetColumnKey,
                  beforeRecordId,
                });

                storage.draggingId = null;

                return true;
              }

              if (view === "gallery") {
                let gallery = target.closest<HTMLElement>(".db-board-grid");

                if (!gallery) {
                  const galleries =
                    document.querySelectorAll<HTMLElement>(".db-board-grid");

                  gallery =
                    Array.from(galleries).find((candidate) => {
                      const rect = candidate.getBoundingClientRect();

                      return (
                        event.clientX >= rect.left &&
                        event.clientX <= rect.right &&
                        event.clientY >= rect.top &&
                        event.clientY <= rect.bottom
                      );
                    }) ?? null;
                }

                if (!gallery) {
                  event.preventDefault();
                  return true;
                }

                event.preventDefault();

                const beforeRecordId = beforeGalleryCardAtPoint(
                  gallery,
                  event.clientX,
                  event.clientY,
                  draggingId,
                );

                storage.onDrop({
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

                storage.onDrop({
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
              return true;
            },
            dragend() {
              ext.storage.draggingId = null;
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
