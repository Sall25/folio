import { useSyncExternalStore } from "react";
import type { ID } from "src/types";

// A dependency being drawn, while the pointer is still down.
//
// The bar the drag started on, the bar under the pointer, and where the
// pointer is in the grid's own pixels — which is what the arrow layer needs
// to draw the line, and what the bars need to show themselves as the end of
// it. A store rather than props: the bar is portalled into the gantt from
// the record's own node, so the two ends of a half-made link are rendered
// by different nodes and neither is the other's parent.

export interface LinkDraft {
  /** The record the link will be stored on: the one that blocks. */
  from: ID;
  /** The record it will block, when the pointer is over one. */
  over: ID | null;
  /** Whether dropping on `over` would actually make the link. */
  valid: boolean;
  /** The pointer, in the gantt body's pixels. */
  x: number;
  y: number;
  /** The end the drag started from, which is where the line leaves. */
  anchorX: number;
  anchorY: number;
}

let draft: LinkDraft | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const linkDraft = {
  start(next: LinkDraft) {
    draft = next;
    emit();
  },
  move(at: { x: number; y: number; over: ID | null; valid: boolean }) {
    if (!draft) return;
    if (
      draft.x === at.x &&
      draft.y === at.y &&
      draft.over === at.over &&
      draft.valid === at.valid
    )
      return;
    draft = { ...draft, ...at };
    emit();
  },
  end() {
    if (!draft) return;
    draft = null;
    emit();
  },
  get() {
    return draft;
  },
};

/** The link being drawn, for whatever is drawing part of it. */
export function useLinkDraft(): LinkDraft | null {
  return useSyncExternalStore(
    subscribe,
    () => draft,
    () => null,
  );
}

/** What one bar needs to know, without re-rendering every bar on every
 *  pointer move: whether this record is the start or the end of the link
 *  being drawn. */
export function useLinkRole(recordId: ID): "from" | "over" | "refused" | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (!draft) return null;
      if (draft.from === recordId) return "from";
      if (draft.over !== recordId) return null;
      return draft.valid ? "over" : "refused";
    },
    () => null,
  );
}
