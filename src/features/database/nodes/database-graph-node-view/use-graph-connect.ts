import { useCallback, useRef, useState } from "react";
import type { CellValue, DatabaseProperty, ID } from "src/types";
import { relationRecordIds } from "src/lib/relation-ids";
import { canConnectWith } from "../../utils/graph-model";
import { graphPointIn, type Box, type Camera } from "../../utils/graph-camera";
import type { GraphPoint } from "../../utils/graph-layout";

/** A line being drawn from one node, before it has an end. */
export interface ConnectDraft {
  from: ID;
  over: ID | null;
  valid: boolean;
  /** The pointer, in the graph's own coordinates. */
  at: GraphPoint;
}

/**
 * Joining two records by dragging from one node to another.
 *
 * A press that does not move opens the record; a press that moves draws a
 * link. The same gesture does both because a node is a small thing and
 * asking which of two meanings was meant — with a handle, or a mode — costs
 * more than it saves.
 *
 * The link is written on the record the drag started from, with whichever
 * relation the graph is set to connect by: a relation only has one stored
 * side, and this is it.
 */
export function useGraphConnect({
  property,
  linksOf,
  setCellValue,
  openRecord,
  box,
  camera,
}: {
  /** The relation a drag writes to, if the database has one to write. */
  property: DatabaseProperty | null;
  /** What a record already links to through that property. */
  linksOf: (recordId: ID) => ID[];
  setCellValue: (
    recordId: string,
    propertyId: string,
    value: CellValue,
  ) => void;
  openRecord: (recordId: ID) => void;
  /** The canvas the drag happens on, and where it is looking. */
  box: Box;
  camera: Camera;
}) {
  const [draft, setDraft] = useState<ConnectDraft | null>(null);
  const press = useRef<{ id: ID; x: number; y: number; moved: boolean } | null>(
    null,
  );

  const allowed = useCallback(
    (from: ID, to: ID) => canConnectWith(property, linksOf, from, to),
    [property, linksOf],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent, nodeId: ID) => {
      // Left button only, and never the browser's own text drag.
      if (event.button !== 0) return;
      // The caret and the editor's own drag have no business here: this is
      // a node, not text. The pointer is captured for the same reason the
      // timeline's bars capture it — so the gesture survives whatever it
      // passes over on the way.
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget as Element & {
        setPointerCapture?: (id: number) => void;
        ownerSVGElement?: SVGSVGElement | null;
      };
      // The canvas, measured once: it does not move while the pointer is
      // down, and reading it again mid-drag would follow the page's own
      // scrolling instead of the pointer.
      const surface =
        target instanceof SVGSVGElement
          ? target
          : (target.ownerSVGElement ?? null);
      const rect = surface?.getBoundingClientRect();
      if (!rect) return;
      const at = (e: { clientX: number; clientY: number }) =>
        graphPointIn(rect, box, camera, e);
      try {
        target.setPointerCapture?.(event.pointerId);
      } catch {
        // A pointer that is already gone cannot be captured; the window
        // listeners below still see the rest of the gesture.
      }
      press.current = {
        id: nodeId,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };

      const move = (e: PointerEvent) => {
        const held = press.current;
        if (!held) return;
        // A few pixels of slack: a click is rarely perfectly still.
        if (
          !held.moved &&
          Math.hypot(e.clientX - held.x, e.clientY - held.y) < 4
        )
          return;
        held.moved = true;
        if (!property) return;
        const under = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<SVGGElement>("[data-node-id]");
        const over = under?.dataset.nodeId ?? null;
        setDraft({
          from: held.id,
          over: over && over !== held.id ? over : null,
          valid: !!over && allowed(held.id, over),
          at: at(e),
        });
      };

      const finish = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", cancel);
        const held = press.current;
        press.current = null;
        setDraft((current) => {
          if (!held) return null;
          if (!held.moved) {
            // Still: the record was asked for, not a link.
            openRecord(held.id);
            return null;
          }
          if (property && current?.over && current.valid) {
            setCellValue(held.id, property.id, [
              ...linksOf(held.id),
              current.over,
            ] as unknown as CellValue);
          }
          return null;
        });
      };

      const cancel = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", cancel);
        press.current = null;
        setDraft(null);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", cancel);
    },
    [property, allowed, linksOf, openRecord, setCellValue, box, camera],
  );

  return { draft, onPointerDown, canConnect: !!property };
}

/** What a record links to through one relation property. */
export function relationIdsOf(
  values: Record<string, unknown> | undefined,
  propertyId: ID,
): ID[] {
  return relationRecordIds(values?.[propertyId]);
}
