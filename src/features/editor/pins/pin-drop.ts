import { Extension, type Editor, type JSONContent } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { dropPoint } from "@tiptap/pm/transform";
import type { EditorView } from "@tiptap/pm/view";

// Dragging a pin from the pins pane into the page.
//
// The card's grip starts the drag (PinFrame) with the block it shows. While
// it's over the page, the editor is told a block is being dragged, so the
// usual drop line shows where it would land, between blocks. On drop nothing
// is inserted yet: the drop menu (pin-drop-menu.tsx) asks whether to put a
// copy there or a live view of the original (the blockRef node).

/** The drag's data type, so other drops (files, text) are left alone. */
export const PIN_MIME = "application/x-folio-pin";

export type PinDragPayload = {
  pageId: string;
  blockId: string;
  /** The block as the card shows it. */
  node: JSONContent;
};

// The drag in progress. Its data can't be read during dragover (browsers
// only show the types until the drop), so it's kept here too.
let dragging: PinDragPayload | null = null;
let draggingView: EditorView | null = null;

export function startPinDrag(dt: DataTransfer, payload: PinDragPayload) {
  dragging = payload;
  dt.effectAllowed = "copy";
  dt.setData(PIN_MIME, JSON.stringify(payload));
}

/** The drag ended (dropped anywhere, or cancelled). */
export function endPinDrag() {
  if (draggingView && dragging) draggingView.dragging = null;
  dragging = null;
  draggingView = null;
}

// ── The drop waiting for a choice ──────────────────────────────────────────
export type PendingPinDrop = {
  editor: Editor;
  /** Where it goes in the page. */
  pos: number;
  /** Where the pointer was (the menu opens there). */
  x: number;
  y: number;
  payload: PinDragPayload;
};

let pending: PendingPinDrop | null = null;
const listeners = new Set<() => void>();

export const pinDrop = {
  set(next: PendingPinDrop | null) {
    pending = next;
    listeners.forEach((l) => l());
  },
  get: () => pending,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

function readPayload(event: DragEvent): PinDragPayload | null {
  const raw = event.dataTransfer?.getData(PIN_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PinDragPayload;
  } catch {
    return null;
  }
}

export const PinDropExtension = Extension.create({
  name: "pinDrop",
  // Before the other drop handlers (columns, files): a pin drop is ours.
  priority: 1000,

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("pinDrop"),
        props: {
          handleDOMEvents: {
            dragover(view, event) {
              if (!dragging || !view.editable) return false;
              // The drop line (Dropcursor) follows view.dragging: give it
              // the block, so it shows between blocks where it fits.
              if (!view.dragging) {
                try {
                  const node = view.state.schema.nodeFromJSON(dragging.node);
                  view.dragging = {
                    slice: new Slice(Fragment.from(node), 0, 0),
                    move: false,
                  };
                  draggingView = view;
                } catch {
                  return false; // a block type this editor doesn't know
                }
              }
              if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
              return false;
            },
          },

          handleDrop(view, event, slice) {
            const payload = dragging ?? readPayload(event);
            if (!payload) return false;
            dragging = null;
            draggingView = null;
            if (!view.editable) return true;

            const at = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (!at) return true;
            const { doc } = view.state;
            let pos =
              (slice.size ? dropPoint(doc, at.pos, slice) : null) ?? at.pos;
            // Never above the page title.
            const first = doc.firstChild;
            if (first?.type.name === "title" && pos < first.nodeSize) {
              pos = first.nodeSize;
            }
            pinDrop.set({
              editor,
              pos,
              x: event.clientX,
              y: event.clientY,
              payload,
            });
            return true;
          },
        },
      }),
    ];
  },
});
