// ─── CardActionsValue ───────────────────────────────────────────────────────
// The shared type for the card/record action handlers. In its own file so the
// store, the context, and the provider can all import it without a cycle.
//
// Every handler is keyed by recordId (not bound to one record), so the SAME
// bundle serves any record — a board card, a gallery card, or a table/list
// drag-handle row. The menu supplies the id; the handler does the work.
import type { DatabaseProperty, ID, Page } from "src/types";
import type { OpenInMode } from "../components/open-in-flyout";

export interface CardActionsValue {
  // ── Data access ──────────────────────────────────────────────────────────
  getRecord: (recordId: ID) => Page | null;
  properties: DatabaseProperty[];
  /** Current favorite state (category === "Favorites") — drives the menu item's
   *  label ("Add" vs "Remove") and the filled/outline star. */
  isFavorite: (recordId: ID) => boolean;

  // ── Value + record mutations ──────────────────────────────────────────────
  setValue: (recordId: ID, propertyId: ID, value: unknown) => void;
  deleteRecord: (recordId: ID) => void;
  duplicateRecord: (recordId: ID) => void;

  // ── Page-level actions ────────────────────────────────────────────────────
  toggleFavorite: (recordId: ID) => void;
  moveRecord: (recordId: ID, newParentId: ID | null, category?: string) => void;
  setRecordIcon: (
    recordId: ID,
    iconName: string,
    color?: string | null,
    target?: string,
  ) => void;

  // ── Panels (open the view-options popover at a panel) ─────────────────────
  openLayout: () => void;
  openPropertyVisibility: () => void;
  openEditProperty: (propertyId: ID) => void;

  openInRecord: (recordId: ID, mode: OpenInMode) => void;
}
