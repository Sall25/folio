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
  /** The node it is being held over: dropping it there joins the two. */
  over: ID | null;
  /** Whether that drop would be allowed — already joined, or no relation
   *  to write it in, and it would not. */
  joins: boolean;
  /** The canvas itself is being dragged. */
  panning: boolean;
}

const RESTING: GraphGesture = {
  moving: null,
  movingAt: null,
  over: null,
  joins: false,
  panning: false,
};

/** How far a press may wander and still count as a press. */
const SLACK = 4;
/** How much of its speed a let-go canvas keeps each frame. */
const GLIDE_FRICTION = 0.9;
/** Below this it has stopped, whatever the arithmetic says. */
const GLIDE_FLOOR = 0.5;
/** A drag that paused before letting go was aimed, not thrown. */
const THROW_WINDOW = 90;
/** The hardest a throw can be, in pixels per frame. A pointer that jumps —
 *  a tablet, a flick, a frame the browser skipped — would otherwise work
 *  out as a speed no hand could produce and send the canvas into orbit. */
const MAX_THROW = 60;

export function useGraphCanvas({
  box,
  viewId,
  points,
  neighbours,
  onMoveNode,
  onOpen,
  onUnpin,
  canLink,
  onLink,
}: {
  box: Box;
  /** The view this canvas belongs to, so it comes back where it was left. */
  viewId: ID | undefined;
  /** Where everything is, for framing a view around it. */
  points: Map<ID, GraphPoint>;
  /** What each node touches, for framing one with its own. */
  neighbours: Map<ID, Set<ID>>;
  /** A node let go of somewhere: where it now lives. */
  onMoveNode: (id: ID, at: GraphPoint) => void;
  onOpen: (id: ID) => void;
  /** A node handed back to the layout. */
  onUnpin?: (id: ID) => void;
  /** Whether dropping one page on another would join them. */
  canLink?: (from: ID, to: ID) => boolean;
  /** Join them. A drop that joins does not also move the page. */
  onLink?: (from: ID, to: ID) => void;
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
   * The wheel, told apart by what made it — which is what every program
   * whose business is a canvas does, and the reason none of them need a
   * modifier explained to anyone:
   *
   *   • a pinch (two fingers closing or spreading) zooms about the pointer.
   *     The browser sends it as a wheel with ctrl held, whether or not any
   *     ctrl key was touched; ⌘/Ctrl with a real wheel lands here too.
   *   • two fingers sliding across a trackpad move the canvas, the way they
   *     move everything else. Zooming on that would make a trackpad
   *     unusable: nothing could be pushed aside without changing size.
   *   • a mouse wheel, which has nothing else to do here, zooms.
   *
   * A trackpad's deltas come in small, often fractional steps and carry
   * sideways movement; a wheel's come in large whole ones, straight down.
   * That is the whole of the telling apart, and it is a guess — so it is a
   * guess that errs towards moving, which is undoable by moving back.
   *
   * A native listener rather than React's, which is passive: a zoom that
   * cannot stop the browser from zooming the whole page with it is worse
   * than no zoom at all.
   */
  const onWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      stopGlide();
      const surface = event.currentTarget as Element | null;
      const rect = surface?.getBoundingClientRect();
      if (!rect) return;

      const pinch = event.ctrlKey || event.metaKey;
      const wheel =
        !pinch &&
        event.deltaMode === 0 &&
        event.deltaX === 0 &&
        Math.abs(event.deltaY) >= 40 &&
        Number.isInteger(event.deltaY);

      if (!pinch && !wheel) {
        // Two fingers, sliding: the canvas goes with them.
        setCamera((c) => pannedBy(c, box, rect, -event.deltaX, -event.deltaY));
        return;
      }
      // Gentler for a pinch, which arrives in many small steps, than for a
      // wheel, which arrives in a few big ones.
      const factor = Math.exp(-event.deltaY * (pinch ? 0.01 : 0.002));
      setCamera((c) =>
        zoomedAbout(c, box, graphPointIn(rect, box, c, event), factor),
      );
    },
    [box, stopGlide],
  );

  /** Drag the background — or the middle button, from anywhere, over a page
   *  as much as over the ground: the canvas moves under the pointer, and
   *  keeps going for a moment when it is thrown. */
  const onBackgroundPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0 && event.button !== 1) return;
      // The canvas is not text and not a block to select: without this the
      // editor puts the caret somewhere, draws its selection ring around
      // the whole database, and the first drag of the canvas looks like a
      // mis-click. (The middle button needs it for another reason too —
      // in a browser that button is autoscroll, and this is what stops the
      // little compass appearing in the middle of the drag.)
      event.preventDefault();
      event.stopPropagation();
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
        const speed = Math.hypot(vx, vy);
        if (speed < 1.5) return;
        const held = speed > MAX_THROW ? MAX_THROW / speed : 1;
        throwCanvas(vx * held, vy * held, rect);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [box, camera, stopGlide, throwCanvas],
  );

  /**
   * Press a page: still, and it opens; dragged onto another page, the two
   * are joined; dragged anywhere else, it is moved there. ⌥ hands it back
   * to the layout, and ⇧ frames it with everything it touches.
   */
  const onNodePointerDown = useCallback(
    (event: React.PointerEvent, id: ID) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      stopGlide();
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

      // The page it is being held over, if any. Read from the document
      // rather than from the points, so it is the thing actually under the
      // pointer — the same test the drop will make.
      const nodeUnder = (e: PointerEvent): ID | null => {
        const el = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<SVGGElement>("[data-node-id]");
        const under = el?.dataset.nodeId ?? null;
        return under && under !== id ? under : null;
      };
      let over: ID | null = null;

      const move = (e: PointerEvent) => {
        if (
          !moved &&
          Math.hypot(e.clientX - from.x, e.clientY - from.y) < SLACK
        )
          return;
        moved = true;
        over = nodeUnder(e);
        setGesture({
          moving: id,
          movingAt: graphPointIn(rect, box, now, e),
          over,
          joins: !!over && !!canLink?.(id, over),
          panning: false,
        });
      };
      const up = (e: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setGesture(RESTING);
        if (!moved) {
          onOpen(id);
          return;
        }
        // Dropped on another page: that is a link, and the page goes back
        // to where it was — it was carried there to say something about
        // the other one, not to live there. A drop the graph refuses (they
        // are already joined, or there is no relation to write) goes back
        // too, rather than leaving the page sitting on top of the other.
        const target = over ?? nodeUnder(e);
        if (target) {
          if (canLink?.(id, target)) onLink?.(id, target);
          return;
        }
        onMoveNode(id, graphPointIn(rect, box, now, e));
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
      canLink,
      onLink,
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
