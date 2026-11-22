import { useCallback, useState } from "react";
import type { ID } from "src/types";
import type { GraphPoint } from "../../utils/graph-layout";
import {
  graphPointIn,
  pannedBy,
  zoomedAbout,
  START_CAMERA,
  type Box,
  type Camera,
} from "../../utils/graph-camera";

// The canvas the graph sits on: moved, zoomed, and nodes dragged about on
// it. Screen business only — none of it touches a record.
//
// Nothing here holds a ref to the surface. Every gesture starts from an
// event on the canvas itself, so it can measure the canvas from that event
// and keep the box for as long as the gesture lasts — which is also more
// truthful than reading it again mid-drag, since the page may have scrolled
// under the pointer.

export interface GraphGesture {
  /** The node being dragged about, if any. */
  moving: ID | null;
  /** Where it is while it is dragged, before anything is saved. */
  movingAt: GraphPoint | null;
}

/** How far a press may wander and still count as a press. */
const SLACK = 4;

export function useGraphCanvas({
  box,
  onMoveNode,
  onOpen,
  onConnectStart,
}: {
  box: Box;
  /** A node let go of somewhere: where it now lives. */
  onMoveNode: (id: ID, at: GraphPoint) => void;
  onOpen: (id: ID) => void;
  /** A drag that began on a node's ring rather than its face. */
  onConnectStart?: (id: ID, event: React.PointerEvent) => void;
}) {
  const [camera, setCamera] = useState<Camera>(START_CAMERA);
  const [gesture, setGesture] = useState<GraphGesture>({
    moving: null,
    movingAt: null,
  });

  /** The canvas an event happened on, whatever part of it was touched. */
  const surfaceOf = (event: {
    currentTarget: Element;
  }): SVGSVGElement | null => {
    const el = event.currentTarget as Element & {
      ownerSVGElement?: SVGSVGElement | null;
    };
    if (el instanceof SVGSVGElement) return el;
    return el.ownerSVGElement ?? null;
  };

  const onWheel = useCallback(
    (event: React.WheelEvent) => {
      // A canvas is zoomed, not scrolled past.
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      setCamera((c) =>
        zoomedAbout(
          c,
          box,
          graphPointIn(rect, box, c, event),
          event.deltaY < 0 ? 1.12 : 1 / 1.12,
        ),
      );
    },
    [box],
  );

  /** Drag the background: the canvas moves under the pointer. */
  const onBackgroundPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const from = { x: event.clientX, y: event.clientY };
      // The camera this drag started from: each move is measured from it,
      // not from the last one, so the canvas follows the pointer exactly.
      const start = camera;

      const move = (e: PointerEvent) => {
        setCamera(
          pannedBy(start, box, rect, e.clientX - from.x, e.clientY - from.y),
        );
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [box, camera],
  );

  /**
   * Press a node: still, and the page opens; moved, and the node moves.
   * A press on the ring around it draws a link instead.
   */
  const onNodePointerDown = useCallback(
    (event: React.PointerEvent, id: ID, ring: boolean) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (ring) {
        onConnectStart?.(id, event);
        return;
      }
      const surface = surfaceOf(event);
      const rect = surface?.getBoundingClientRect();
      if (!rect) return;
      const from = { x: event.clientX, y: event.clientY };
      let moved = false;
      // The camera as it stands: a drag of a node does not zoom.
      const now = camera;

      const move = (e: PointerEvent) => {
        if (
          !moved &&
          Math.hypot(e.clientX - from.x, e.clientY - from.y) < SLACK
        )
          return;
        moved = true;
        setGesture({ moving: id, movingAt: graphPointIn(rect, box, now, e) });
      };
      const up = (e: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setGesture({ moving: null, movingAt: null });
        if (!moved) onOpen(id);
        else onMoveNode(id, graphPointIn(rect, box, now, e));
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [box, camera, onOpen, onMoveNode, onConnectStart],
  );

  const zoomBy = useCallback(
    (factor: number) =>
      setCamera((c) =>
        zoomedAbout(
          c,
          box,
          { x: c.x + box.width / 2, y: c.y + box.height / 2 },
          factor,
        ),
      ),
    [box],
  );

  return {
    camera,
    gesture,
    onWheel,
    onBackgroundPointerDown,
    onNodePointerDown,
    zoomIn: useCallback(() => zoomBy(1.2), [zoomBy]),
    zoomOut: useCallback(() => zoomBy(1 / 1.2), [zoomBy]),
    reset: useCallback(() => setCamera(START_CAMERA), []),
  };
}
