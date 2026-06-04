// Adjust this import to wherever your Page/View types live.
import type { Page, View } from "../../types";
/**
 * An open tab. A tab is not the same thing as a page: it holds a View, and
 * only carries a pageId when that view is "page". This is why the tab needs
 * its own instance id — "home" and "resources" tabs have no page, and you may
 * want the same page open in two tabs.
 */
export type Tab = {
  /** Stable per-tab instance id, e.g. crypto.randomUUID(). */
  id: string;
  view: View; // "home" | "page" | "resources"
  /** Set when view === "page", otherwise null. */
  pageId: Page["id"] | null; // number | null
  /**
   * Scroll offset captured on blur, restored on focus — what makes switching
   * back land you where you left off. Wire-up is parent territory.
   */
  scrollTop?: number;
};
