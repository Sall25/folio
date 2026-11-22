import { useCallback, useEffect, useRef, useState } from "react";
import type { ID } from "src/types";
import type { GraphPoint } from "../../utils/graph-layout";
import {
  frameAround,
  graphPointIn,
  lookingAt,
  pannedBy,
  zoomedAbout,
  START_CAMERA,
  type Box,
  type Camera,
} from "../../utils/graph-camera";
import { rememberCamera, rememberedCamera } from "../../utils/graph-cameras";

// The canvas the graph sits on: moved, zoomed, and nodes dragged about on
// it. Screen business only — none of it touches a record.
//
// Nothing here holds a ref to the surface. Every gesture starts from an
// event on the canvas itself, so it can measure the canvas from that event
// and keep the box for as long as the gesture lasts — which is also more
// truthful than reading it again mid-drag, since the page may have scrolled
// under the pointer. The one ref is the glide below, which is a number and
// is never read while rendering.

export interface GraphGesture {
  /** The node being dragged about, if any. */
  moving: ID | null;
  /** Where it is while it is dragged, before anything is saved. */
  movingAt: GraphPoint | null;
  /** The canvas itself is being dragged. */
  panning: boolean;
}

const RESTING: GraphGesture = { moving: null, movingAt: null, panning: false };

/** How far a press may wander and still count as a press. */
const SLACK = 4;
/** How much of its speed a let-go canvas keeps each frame. */
const GLIDE_FRICTION = 0.9;
/** Below this it has stopped, whatever the arithmetic says. */
const GLIDE_FLOOR = 0.5;
/** A drag that paused before letting go was aimed, not thrown. */
const THROW_WINDOW = 90;

export function useGraphCanvas({
  box,
  viewId,
  points,
  neighbours,
  wheelZooms,
  onMoveNode,
  onOpen,
  onUnpin,
  onConnectStart,
}: {
  box: Box;
  /** The view this canvas belongs to, so it comes back where it was left. */
  viewId: ID | undefined;
  /** Where everything is, for framing a view around it. */
  points: Map<ID, GraphPoint>;
  /** What each node touches, for framing one with its own. */
  neighbours: Map<ID, Set<ID>>;
  /** Whether a plain wheel zooms, or is left to the page it sits in. */
  wheelZooms: boolean;
  /** A node let go of somewhere: where it now lives. */
  onMoveNode: (id: ID, at: GraphPoint) => void;
  onOpen: (id: ID) => void;
  /** A node handed back to the layout. */
  onUnpin?: (id: ID) => void;
  /** A drag that began on a node's ring rather than its face. */
  onConnectStart?: (id: ID, event: React.PointerEvent) => void;
}) {
  const [camera, setCamera] = useState<Camera>(
    () => rememberedCamera(viewId) ?? START_CAMERA,
  );
  const [gesture, setGesture] = useState<GraphGesture>(RESTING);
  const glide = useRef<number | null>(null);

  // Kept for as long as the tab is open, so switching to the table and back
  // does not land whoever did it at the start again.
  useEffect(() => rememberCamera(viewId, camera), [viewId, camera]);

  /** The canvas an event happened on, whatever part of it was touched. */
  const surfaceOf = (event: {
    currentTarget: EventTarget | null;
  }): SVGSVGElement | null => {
    const el = event.currentTarget as
      (Element & { ownerSVGElement?: SVGSVGElement | null }) | null;
    if (!el) return null;
    if (el instanceof SVGSVGElement) return el;
    return el.ownerSVGElement ?? null;
  };

  const stopGlide = useCallback(() => {
    if (glide.current != null) cancelAnimationFrame(glide.current);
    glide.current = null;
  }, []);

  /**
   * A thrown canvas carries on and settles, the way a map does. Stopping
   * dead the instant the pointer lifts is what makes a draggable thing feel
   * like a table rather than a surface.
   */
  const throwCanvas = useCallback(
    (vx: number, vy: number, rect: { width: number; height: number }) => {
      stopGlide();
      let x = vx;
      let y = vy;
      const step = () => {
        x *= GLIDE_FRICTION;
        y *= GLIDE_FRICTION;
        if (Math.hypot(x, y) < GLIDE_FLOOR) {
          glide.current = null;
          return;
        }
        setCamera((c) => pannedBy(c, box, rect, x, y));
        glide.current = requestAnimationFrame(step);
      };
      glide.current = requestAnimationFrame(step);
    },
    [box, stopGlide],
  );

  /** A page and everything it touches, framed. */
  const frame = useCallback(
    (id: ID) => {
      stopGlide();
      const around = [id, ...(neighbours.get(id) ?? [])]
        .map((near) => points.get(near))
        .filter((p): p is GraphPoint => !!p);
      if (around.length) setCamera(frameAround(around, box));
    },
    [box, neighbours, points, stopGlide],
  );

  /**
   * The wheel, as a native listener: React's own is passive, and a zoom
   * that cannot stop the browser from zooming the whole page with it is
   * worse than no zoom at all.
   *
   * A plain wheel is left to the page while the canvas sits inside one —
   * a canvas in the middle of a document that swallowed the wheel would
   * trap whoever was only scrolling past it. ⌘/Ctrl zooms, which is also
   * what a trackpad pinch arrives as.
   */
  const onWheel = useCallback(
    (event: WheelEvent) => {
      if (!wheelZooms && !event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      stopGlide();
      const surface = event.currentTarget as Element | null;
      const rect = surface?.getBoundingClientRect();
      if (!rect) return;
      // A trackpad sends many small deltas; a wheel sends few big ones.
      const factor = Math.exp(-event.deltaY * 0.002);
      setCamera((c) =>
        zoomedAbout(c, box, graphPointIn(rect, box, c, event), factor),
      );
    },
    [box, wheelZooms, stopGlide],
  );

  /** Drag the background: the canvas moves under the pointer, and keeps
   *  going for a moment when it is thrown. */
  const onBackgroundPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      stopGlide();
      const rect = event.currentTarget.getBoundingClientRect();
      const from = { x: event.clientX, y: event.clientY };
      // The camera this drag started from: each move is measured from it,
      // not from the last one, so the canvas follows the pointer exactly.
      const start = camera;
      let last = { x: event.clientX, y: event.clientY, at: performance.now() };
      let vx = 0;
      let vy = 0;
      let moved = false;

      const move = (e: PointerEvent) => {
        const now = performance.now();
        const since = Math.max(now - last.at, 1);
        // Pixels per frame at 60Hz, which is what the glide spends.
        vx = ((e.clientX - last.x) / since) * 16;
        vy = ((e.clientY - last.y) / since) * 16;
        last = { x: e.clientX, y: e.clientY, at: now };
        if (!moved && Math.hypot(e.clientX - from.x, e.clientY - from.y) < 2)
          return;
        moved = true;
        setGesture((g) => (g.panning ? g : { ...g, panning: true }));
        setCamera(
          pannedBy(start, box, rect, e.clientX - from.x, e.clientY - from.y),
        );
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setGesture((g) => (g.panning ? { ...g, panning: false } : g));
        if (!moved) return;
        // Let go after a pause: the canvas was placed, not thrown.
        if (performance.now() - last.at > THROW_WINDOW) return;
        if (Math.hypot(vx, vy) < 1.5) return;
        throwCanvas(vx, vy, rect);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [box, camera, stopGlide, throwCanvas],
  );

  /**
   * Press a node: still, and the page opens; moved, and the node moves.
   * A press on the ring around it draws a link instead, ⌥ hands it back to
   * the layout, and ⇧ frames it with everything it touches.
   */
  const onNodePointerDown = useCallback(
    (event: React.PointerEvent, id: ID, ring: boolean) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      stopGlide();
      if (ring) {
        onConnectStart?.(id, event);
        return;
      }
      if (event.altKey) {
        onUnpin?.(id);
        return;
      }
      if (event.shiftKey) {
        frame(id);
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
        setGesture({
          moving: id,
          movingAt: graphPointIn(rect, box, now, e),
          panning: false,
        });
      };
      const up = (e: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setGesture(RESTING);
        if (!moved) onOpen(id);
        else onMoveNode(id, graphPointIn(rect, box, now, e));
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [
      box,
      camera,
      frame,
      onOpen,
      onMoveNode,
      onUnpin,
      onConnectStart,
      stopGlide,
    ],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      stopGlide();
      setCamera((c) =>
        zoomedAbout(
          c,
          box,
          { x: c.x + box.width / 2, y: c.y + box.height / 2 },
          factor,
        ),
      );
    },
    [box, stopGlide],
  );

  /** Everything, in view. Where the canvas goes back to. */
  const fit = useCallback(() => {
    stopGlide();
    setCamera(frameAround(points.values(), box));
  }, [box, points, stopGlide]);

  const zoomIn = useCallback(() => zoomBy(1.2), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / 1.2), [zoomBy]);

  /** Look at a point: the map, and anything else that knows where to go. */
  const lookAt = useCallback(
    (at: GraphPoint) => {
      stopGlide();
      setCamera((c) => lookingAt(c, box, at));
    },
    [box, stopGlide],
  );

  /** The canvas, once it has been clicked: 0 to fit, + and − to zoom. */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "0") fit();
      else if (event.key === "+" || event.key === "=") zoomIn();
      else if (event.key === "-" || event.key === "_") zoomOut();
      else return;
      event.preventDefault();
    },
    [fit, zoomIn, zoomOut],
  );

  return {
    camera,
    gesture,
    onWheel,
    onBackgroundPointerDown,
    onNodePointerDown,
    onKeyDown,
    zoomIn,
    zoomOut,
    fit,
    frame,
    lookAt,
  };
}
