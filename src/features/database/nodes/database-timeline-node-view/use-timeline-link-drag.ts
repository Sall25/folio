import { useCallback, useMemo } from "react";
import type { CellValue, DatabaseProperty, ID } from "src/types";
import { canLink, dependencyPair } from "../../utils/dependencies";
import { linkDraft, useLinkRole } from "../../utils/link-draft-store";

/**
 * Drawing a dependency from one bar to another.
 *
 * A dot at each end of a bar: drag from the right-hand one and this record
 * blocks what you drop on, drag from the left-hand one and that record
 * blocks this one. Either way the link is stored on the record that blocks,
 * which is the only side a relation keeps.
 *
 * The pointer is followed on the window rather than the bar: the bar is a
 * couple of hundred pixels wide and the record being linked to is usually
 * somewhere else entirely.
 */
export function useTimelineLinkDrag({
  recordId,
  properties,
  blockingByRecord,
  setCellValue,
}: {
  recordId: ID;
  properties: DatabaseProperty[];
  /** Every record's stored links, so a write keeps the ones off screen. */
  blockingByRecord: Record<ID, ID[]>;
  setCellValue: (
    recordId: string,
    propertyId: string,
    value: CellValue,
  ) => void;
}) {
  const pair = useMemo(
    () => dependencyPair(properties, undefined),
    [properties],
  );

  /** Whether a link in this direction can be made at all. */
  const allowed = useCallback(
    (from: ID, to: ID) => canLink(blockingByRecord, from, to),
    [blockingByRecord],
  );

  const start = useCallback(
    (event: React.PointerEvent, side: "left" | "right") => {
      if (!pair) return;
      event.preventDefault();
      event.stopPropagation();

      const body = (event.currentTarget as HTMLElement).closest<HTMLElement>(
        ".db-tl-gantt__body",
      );
      if (!body) return;
      // Read once: the grid does not move while the pointer is down, and
      // asking for the box on every move would lay out the page each time.
      const box = body.getBoundingClientRect();
      const at = (e: { clientX: number; clientY: number }) => ({
        x: e.clientX - box.left,
        y: e.clientY - box.top,
      });

      const anchor = at(event);
      const ends = (over: ID | null): [ID, ID] | null => {
        if (!over) return null;
        return side === "right" ? [recordId, over] : [over, recordId];
      };

      linkDraft.start({
        from: recordId,
        over: null,
        valid: false,
        x: anchor.x,
        y: anchor.y,
        anchorX: anchor.x,
        anchorY: anchor.y,
      });

      const move = (e: PointerEvent) => {
        const under = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLElement>("[data-record-id]");
        const over = under?.dataset.recordId ?? null;
        const pairIds = ends(over && over !== recordId ? over : null);
        linkDraft.move({
          ...at(e),
          over: pairIds ? (over as ID) : null,
          valid: !!pairIds && allowed(pairIds[0], pairIds[1]),
        });
      };

      const finish = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", cancel);
        const draft = linkDraft.get();
        linkDraft.end();
        if (!draft?.over || !draft.valid) return;
        const made = ends(draft.over);
        if (!made) return;
        const [from, to] = made;
        setCellValue(from, pair.blocking.id, [
          ...(blockingByRecord[from] ?? []),
          to,
        ] as unknown as CellValue);
      };

      const cancel = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", cancel);
        linkDraft.end();
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", cancel);
    },
    [pair, recordId, allowed, blockingByRecord, setCellValue],
  );

  return {
    /** Nothing to drag from until the database has the pair. */
    enabled: !!pair,
    start,
    /** This bar's part in the link being drawn, if any. */
    role: useLinkRole(recordId),
  };
}
