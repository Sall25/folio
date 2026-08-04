import { useSyncExternalStore } from "react";

type SelectionMap = Record<string, string[]>;

const EMPTY: string[] = [];

let selection: SelectionMap = {};
let hoveredRecordId: string | null = null;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

let hoverClearTimer: ReturnType<typeof setTimeout> | null = null;

/**
 *
export const recordSelection = {
  // …rest unchanged
};
 */

export const recordSelection = {
  // ── Hover (published by the drag handle) ─────────────────────────────
  setHovered(recordId: string | null) {
    // Clearing is deferred: the checkbox is portaled outside the row, so moving
    // onto it momentarily reads as "left the row". A short grace period stops
    // that from unmounting the element the pointer is travelling toward.
    if (recordId === null) {
      if (hoveredRecordId === null) return; // already clear
      if (hoverClearTimer) return; // a clear is already scheduled — let it fire
      hoverClearTimer = setTimeout(() => {
        hoverClearTimer = null;
        hoveredRecordId = null;
        emit();
      }, 200);
      return;
    }

    // A real hover cancels any pending clear.
    if (hoverClearTimer) {
      clearTimeout(hoverClearTimer);
      hoverClearTimer = null;
    }

    if (hoveredRecordId === recordId) return;
    hoveredRecordId = recordId;
    emit();
  },
  getHovered() {
    return hoveredRecordId;
  },

  // ── Selection bookkeeping ────────────────────────────────────────────
  get(databaseId: string): string[] {
    return selection[databaseId] ?? EMPTY;
  },
  isSelected(databaseId: string, recordId: string) {
    return (selection[databaseId] ?? EMPTY).includes(recordId);
  },
  toggle(databaseId: string, recordId: string) {
    const current = selection[databaseId] ?? EMPTY;
    selection = {
      ...selection,
      [databaseId]: current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [...current, recordId],
    };
    emit();
  },
  selectRange(databaseId: string, ids: string[]) {
    const current = selection[databaseId] ?? EMPTY;
    selection = {
      ...selection,
      [databaseId]: Array.from(new Set([...current, ...ids])),
    };
    emit();
  },
  set(databaseId: string, ids: string[]) {
    selection = { ...selection, [databaseId]: ids };
    emit();
  },
  clear(databaseId: string) {
    if ((selection[databaseId] ?? EMPTY).length === 0) return;
    selection = { ...selection, [databaseId]: EMPTY };
    emit();
  },
};

/** Full selected-id list for a database — use for bulk actions/toolbar. */
export function useRecordSelection(databaseId: string | null) {
  return useSyncExternalStore(
    subscribe,
    () => (databaseId ? (selection[databaseId] ?? EMPTY) : EMPTY),
    () => EMPTY,
  );
}

/**
 * Per-row subscription. Returns booleans, so React bails out of re-rendering
 * every row on hover — only the two rows whose value actually flipped update.
 */
export function useRecordRowState(
  databaseId: string | null,
  recordId: string | null,
) {
  const isSelected = useSyncExternalStore(
    subscribe,
    () =>
      !!databaseId &&
      !!recordId &&
      (selection[databaseId] ?? EMPTY).includes(recordId),
    () => false,
  );

  const isHovered = useSyncExternalStore(
    subscribe,
    () => !!recordId && hoveredRecordId === recordId,
    () => false,
  );

  return { isSelected, isHovered };
}
