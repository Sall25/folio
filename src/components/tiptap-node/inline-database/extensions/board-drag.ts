import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface BoardDropInfo {
  recordId: string;
  targetColumnKey: string;
  beforeRecordId: string | null;
}

export interface BoardDragStorage {
  onDrop: (info: BoardDropInfo) => void;
  isBoardActive: () => boolean;
  draggingId: string | null;
}

declare module "@tiptap/core" {
  interface Storage {
    boardDrag: BoardDragStorage;
  }
}

const boardDragKey = new PluginKey("boardDrag");

export const BoardDrag = Extension.create<unknown, BoardDragStorage>({
  name: "boardDrag",

  addStorage() {
    return { onDrop: () => {}, isBoardActive: () => false, draggingId: null };
  },

  addProseMirrorPlugins() {
    // Capture the extension instance so the plugin reads live storage.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ext = this;
    //let draggingId: string | null = null;

    const columnKeyAtPoint = (grid: HTMLElement, x: number): string | null => {
      const marked = grid.querySelectorAll<HTMLElement>("[data-col-key]");
      let best: { key: string; dist: number } | null = null;
      for (const el of marked) {
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right) return el.getAttribute("data-col-key");
        const cx = (r.left + r.right) / 2;
        const d = Math.abs(x - cx);
        const key = el.getAttribute("data-col-key");
        if (key && (!best || d < best.dist)) best = { key, dist: d };
      }
      return best?.key ?? null;
    };

    const beforeCardAtPoint = (
      grid: HTMLElement,
      columnKey: string,
      y: number,
      skipId: string,
    ): string | null => {
      const cards = Array.from(
        grid.querySelectorAll<HTMLElement>(
          `[data-record-id][data-col-key="${columnKey}"]`,
        ),
      ).filter((c) => c.getAttribute("data-record-id") !== skipId);
      for (const c of cards) {
        const r = c.getBoundingClientRect();
        if (y < r.top + r.height / 2) return c.getAttribute("data-record-id");
      }
      return null;
    };

    return [
      new Plugin({
        key: boardDragKey,
        props: {
          handleDOMEvents: {
            
            drop(_v, event) {
              const storage = ext.storage as BoardDragStorage;
              if (!storage.isBoardActive() || !storage.draggingId) return false;

              const grid = (event.target as HTMLElement)?.closest<HTMLElement>(
                ".db-board-grid",
              );
              if (!grid) {
                storage.draggingId = null;
                return false;
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
                storage.draggingId,
              );

              storage.onDrop({
                recordId: storage.draggingId,
                targetColumnKey,
                beforeRecordId,
              });

              storage.draggingId = null;
              return true;
            },

            dragend() {
              ext.storage.draggingId = null;
              return false;
            },
          },
        },
      }),
    ];
  },
});
