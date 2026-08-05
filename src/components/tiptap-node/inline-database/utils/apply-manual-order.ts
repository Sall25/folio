import type { ID, Page } from "src/types";

/**
 * Reorders records to match `manualOrder` (a list of record ids). Ids present
 * in `manualOrder` come first, in that order; any record NOT listed (new rows,
 * or rows added since the last drag) keeps its incoming order and sorts after
 * the arranged ones. Pure — returns a new array.
 *
 * Applied AFTER sortRecords, so a manual drag overrides the active sort. If you
 * want sort to win when a sort rule is active, gate the call at the view.
 */
export function applyManualOrder(records: Page[], manualOrder?: ID[]): Page[] {
  if (!manualOrder?.length) return records;
  const pos = new Map(manualOrder.map((id, i) => [id, i]));
  return [...records].sort((a, b) => {
    const ai = pos.get(a.id) ?? Infinity;
    const bi = pos.get(b.id) ?? Infinity;
    if (ai === bi) return 0; // both unlisted → keep incoming order
    return ai - bi;
  });
}