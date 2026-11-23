import { useCallback } from "react";
import type { CellValue, DatabaseProperty, ID } from "src/types";
import { relationRecordIds } from "src/lib/relation-ids";
import { canConnectWith } from "../../utils/graph-model";

// Joining two pages: drop one on the other.
//
// There was a ring around each node to drag from, and it was a bad idea —
// a two-pixel dashed hairline is not something anyone can take hold of, and
// a gesture nobody can start is a gesture that does not exist. Dragging one
// page onto another is the whole thing now: it is what the picture already
// says (two pages touching are joined), it needs no handle, and it cannot
// be missed by a few pixels.
//
// The link is written on the page the drag started from, with whichever
// relation the graph is set to connect by: a relation has one stored side,
// and this is it. The mirror takes care of the way back.

export function useGraphConnect({
  property,
  linksOf,
  setCellValue,
}: {
  /** The relation a drop writes to, if the database has one to write. */
  property: DatabaseProperty | null;
  /** What a record already links to through that property. */
  linksOf: (recordId: ID) => ID[];
  setCellValue: (
    recordId: string,
    propertyId: string,
    value: CellValue,
  ) => void;
}) {
  /** Whether these two can be joined: not to itself, not twice, and only
   *  where there is a relation to write it in. */
  const canLink = useCallback(
    (from: ID, to: ID) => canConnectWith(property, linksOf, from, to),
    [property, linksOf],
  );

  /** Join them. Says whether it did, so the caller knows whether the drag
   *  was a link or a move. */
  const link = useCallback(
    (from: ID, to: ID) => {
      if (!property || !canLink(from, to)) return false;
      setCellValue(from, property.id, [
        ...linksOf(from),
        to,
      ] as unknown as CellValue);
      return true;
    },
    [property, canLink, linksOf, setCellValue],
  );

  return { canLink, link, canConnect: !!property };
}

/** What a record links to through one relation property. */
export function relationIdsOf(
  values: Record<string, unknown> | undefined,
  propertyId: ID,
): ID[] {
  return relationRecordIds(values?.[propertyId]);
}
