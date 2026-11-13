import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Copy,
  Expand,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Trash2,
  X,
} from "src/components/icons";
import { useEditorEditable } from "../button-node/use-editor-editable";
import {
  DEFAULT_BLOCK_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  MAX_CANVAS_HEIGHT,
  MIN_BLOCK_WIDTH,
  MIN_CANVAS_HEIGHT,
  POSITIONABLE_TYPES,
  canvasId,
  labelEdges,
  linkEdges,
  parseEdges,
  unlinkEdges,
  type CanvasEdge,
} from "./canvas-attrs";
import { canvasLayoutPlugin } from "./canvas-layout-plugin";
import {
  GRID,
  SIDES,
  centreOn,
  miniBox,
  draftPath,
  edgeMidpoint,
  edgePath,
  fitView,
  nearestSide,
  placeNew,
  snap,
  toCanvas,
  zoomAt,
  type Point,
  type Rect,
  type Side,
  type Viewport,
} from "./canvas-geometry";
import "./canvas-node.scss";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    canvas: {
      insertCanvas: () => ReturnType;
    };
  }
}

// A canvas is a block that holds other blocks, laid out by hand instead of
// down a column, with edges between them.
//
// What belongs to the document, and so to everyone on the page: where each
// block sits (canvasX / canvasY / canvasW on the block itself) and the edges
// (on the canvas). What stays local to one reader: the pan and the zoom —
// sharing those would drag everyone's view along with whoever is panning.

const PAD = { top: 74, right: 46, bottom: 72, left: 46 };

interface Child {
  /** canvasId; empty until the canvas adopts the block. */
  id: string;
  /** Offset of the block inside the canvas, for its document position. */
  offset: number;
  x: number | null;
  y: number | null;
  w: number;
}

interface Size {
  w: number;
  h: number;
}

function sameSizes(
  a: Record<string, Size>,
  b: Record<string, Size>,
): boolean {
  const keys = Object.keys(b);
  return (
    keys.length === Object.keys(a).length &&
    keys.every((k) => a[k] && a[k].w === b[k].w && a[k].h === b[k].h)
  );
}

/**
 * Measured sizes by canvasId. Position comes from the document, size from the
 * block itself: a paragraph is as tall as its own text, and it changes as
 * someone types into it.
 *
 * The reading happens in the observer's callback rather than in the effect
 * body — a ResizeObserver reports every element once as soon as it is
 * observed, so that first call is also the first measurement.
 */
function useChildSizes(
  root: React.RefObject<HTMLElement | null>,
  children: Child[],
): Record<string, Size> {
  const [sizes, setSizes] = useState<Record<string, Size>>({});

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const read = () => {
      const next: Record<string, Size> = {};
      el.querySelectorAll<HTMLElement>("[data-canvas-id]").forEach((child) => {
        const id = child.dataset.canvasId;
        if (!id) return;
        next[id] = { w: child.offsetWidth, h: child.offsetHeight };
      });
      setSizes((prev) => (sameSizes(prev, next) ? prev : next));
    };

    const ro = new ResizeObserver(read);
    el.querySelectorAll<HTMLElement>("[data-canvas-id]").forEach((child) =>
      ro.observe(child),
    );
    return () => ro.disconnect();
  }, [root, children]);

  return sizes;
}

/**
 * The frame's own size, watched rather than measured when something needs it:
 * the minimap works it out while rendering, and a ref can't be read then.
 */
function useFrameSize(root: React.RefObject<HTMLElement | null>): {
  w: number;
  h: number;
} {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize((prev) =>
        prev.w === r.width && prev.h === r.height
          ? prev
          : { w: r.width, h: r.height },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [root]);

  return size;
}

function CanvasView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const { t } = useTranslation();
  const editable = useEditorEditable(editor);
  const frameRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<Viewport>({ x: 0, y: 0, k: 1 });
  const [locked, setLocked] = useState(false);
  const [pickedEdge, setPickedEdge] = useState<string | null>(null);
  /** The height while it is being dragged; the attribute gets the last one. */
  const [liveHeight, setLiveHeight] = useState<number | null>(null);
  // Room to work in. Local, like the pan and the zoom: one reader's decision
  // to look closely isn't everyone's.
  //
  // It goes through the Fullscreen API rather than a fixed-position overlay,
  // because the editor sets `contain: layout` and gives each top-level block
  // `content-visibility: auto`. Both make an ancestor the containing block
  // for a fixed descendant, and paint containment clips it as well, so a
  // fixed overlay inside the editor is sized to a block and then cut away.
  // Fullscreen puts the frame in the browser's top layer, above all of it,
  // and moves nothing in the document.
  const [full, setFull] = useState(false);
  /** When the browser won't go fullscreen: as tall as the window instead. */
  const [tall, setTall] = useState(false);
  const wide = full || tall;
  const [draft, setDraft] = useState<{
    from: string;
    side: Side;
    to: Point;
  } | null>(null);

  const height = Number(node.attrs.height ?? DEFAULT_CANVAS_HEIGHT);
  const edges = useMemo(() => parseEdges(node.attrs.edges), [node.attrs.edges]);

  const children = useMemo(() => {
    const out: Child[] = [];
    node.forEach((child, offset) => {
      const x = child.attrs.canvasX;
      const y = child.attrs.canvasY;
      out.push({
        id: String(child.attrs.canvasId ?? ""),
        offset,
        x: x == null ? null : Number(x),
        y: y == null ? null : Number(y),
        w: Number(child.attrs.canvasW ?? DEFAULT_BLOCK_WIDTH),
      });
    });
    return out;
  }, [node]);

  const sizes = useChildSizes(planeRef, children);
  const frame = useFrameSize(frameRef);

  const rects = useMemo(() => {
    const out: Record<string, Rect> = {};
    for (const c of children) {
      if (!c.id) continue;
      out[c.id] = {
        x: c.x ?? 0,
        y: c.y ?? 0,
        w: sizes[c.id]?.w ?? c.w,
        h: sizes[c.id]?.h ?? 80,
      };
    }
    return out;
  }, [children, sizes]);

  const frameRect = () =>
    frameRef.current?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    };

  const pointIn = (e: { clientX: number; clientY: number }) =>
    toCanvas({ x: e.clientX, y: e.clientY }, frameRect(), view);

  // ── Writing to the document ──────────────────────────────────────────
  const writeChild = (
    offset: number,
    attrs: Record<string, unknown>,
    keep: boolean,
  ) => {
    const base = getPos?.();
    if (base == null) return;
    const pos = base + 1 + offset;
    const tr = editor.view.state.tr;
    for (const [name, value] of Object.entries(attrs)) {
      tr.setNodeAttribute(pos, name, value);
    }
    // A drag is one undo step, not one per frame.
    if (!keep) tr.setMeta("addToHistory", false);
    editor.view.dispatch(tr);
  };

  // A block can arrive without a place: pasted in, dragged in, or made before
  // the canvas existed. Give it an id and somewhere to stand.
  useEffect(() => {
    if (!editable) return;
    const base = getPos?.();
    if (base == null) return;
    const orphans = children.filter((c) => !c.id || c.x == null || c.y == null);
    if (orphans.length === 0) return;

    const tr = editor.view.state.tr;
    const taken: Rect[] = children
      .filter((c) => c.x != null && c.y != null)
      .map((c) => ({ x: c.x!, y: c.y!, w: c.w, h: sizes[c.id]?.h ?? 80 }));

    for (const c of orphans) {
      const pos = base + 1 + c.offset;
      if (!c.id) tr.setNodeAttribute(pos, "canvasId", canvasId());
      if (c.x == null || c.y == null) {
        const spot = placeNew(taken, c.w);
        taken.push({ x: spot.x, y: spot.y, w: c.w, h: 80 });
        tr.setNodeAttribute(pos, "canvasX", spot.x);
        tr.setNodeAttribute(pos, "canvasY", spot.y);
      }
    }
    tr.setMeta("addToHistory", false);
    editor.view.dispatch(tr);
  }, [children, editable, editor, getPos, sizes]);

  /**
   * One pointer drag: capture it on the control that started it, follow it,
   * and let go. Capturing means the drag keeps working past the edge of the
   * canvas, which is exactly where a drag to the corner of a block ends up.
   */
  const onDrag = (
    e: ReactPointerEvent,
    move: (ev: PointerEvent) => void,
    done?: (ev: PointerEvent) => void,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const end = (ev: PointerEvent) => {
      done?.(ev);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  };

  // The browser owns fullscreen: it can be left with Escape, or by the page
  // losing it some other way, and this follows rather than guesses.
  useEffect(() => {
    const onChange = () =>
      setFull(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Escape leaves the fallback too, where the browser isn't handling it.
  useEffect(() => {
    if (!tall) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTall(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tall]);

  const toggleWide = () => {
    const el = frameRef.current;
    if (full) {
      if (document.fullscreenElement) void document.exitFullscreen();
      return;
    }
    if (tall) {
      setTall(false);
      return;
    }
    if (el && typeof el.requestFullscreen === "function") {
      // A refusal (an embedded frame, a permissions policy) isn't an error
      // worth showing: take the room that is available instead.
      el.requestFullscreen().catch(() => setTall(true));
      return;
    }
    setTall(true);
  };

  // ── Moving a block ───────────────────────────────────────────────────
  const startMove = (e: ReactPointerEvent, child: Child) => {
    if (!editable || locked) return;
    const start = pointIn(e);
    const from = { x: child.x ?? 0, y: child.y ?? 0 };
    const to = (ev: PointerEvent) => {
      const now = pointIn(ev);
      return {
        canvasX: snap(from.x + (now.x - start.x)),
        canvasY: snap(from.y + (now.y - start.y)),
      };
    };
    onDrag(
      e,
      (ev) => writeChild(child.offset, to(ev), false),
      (ev) => writeChild(child.offset, to(ev), true),
    );
  };

  // ── Widening a block ─────────────────────────────────────────────────
  // Width is the block's own attribute, so it is written the same way the
  // position is: every frame without history, the last one with it.
  const startWiden = (e: ReactPointerEvent, child: Child) => {
    if (!editable || locked) return;
    const start = pointIn(e);
    const from = child.w;
    const to = (ev: PointerEvent) => ({
      canvasW: Math.max(MIN_BLOCK_WIDTH, snap(from + (pointIn(ev).x - start.x))),
    });
    onDrag(
      e,
      (ev) => writeChild(child.offset, to(ev), false),
      (ev) => writeChild(child.offset, to(ev), true),
    );
  };

  // ── Resizing the canvas itself ───────────────────────────────────────
  // The height is the one thing about a canvas that belongs to the page
  // rather than to the canvas's own space, so it is the node's attribute.
  const startStretch = (e: ReactPointerEvent) => {
    if (!editable) return;
    const startY = e.clientY;
    const from = height;
    const next = (ev: PointerEvent) =>
      Math.min(
        MAX_CANVAS_HEIGHT,
        Math.max(MIN_CANVAS_HEIGHT, Math.round(from + (ev.clientY - startY))),
      );
    onDrag(
      e,
      (ev) => setLiveHeight(next(ev)),
      (ev) => {
        setLiveHeight(null);
        updateAttributes({ height: next(ev) });
      },
    );
  };

  // ── Drawing an edge ──────────────────────────────────────────────────
  const startLink = (e: ReactPointerEvent, child: Child, side: Side) => {
    if (!editable || locked || !child.id) return;
    setDraft({ from: child.id, side, to: pointIn(e) });
    onDrag(
      e,
      (ev) => setDraft({ from: child.id, side, to: pointIn(ev) }),
      (ev) => {
        const under = document
          .elementFromPoint(ev.clientX, ev.clientY)
          ?.closest<HTMLElement>("[data-canvas-id]");
        const target = under?.dataset.canvasId;
        if (target && target !== child.id && rects[target]) {
          updateAttributes({
            edges: linkEdges(edges, {
              id: canvasId(),
              from: child.id,
              to: target,
              fromSide: side,
              toSide: nearestSide(rects[target], pointIn(ev)),
            }),
          });
        }
        setDraft(null);
      },
    );
  };

  const removeEdge = (id: string) => {
    updateAttributes({ edges: unlinkEdges(edges, id) });
    setPickedEdge(null);
  };

  // ── Panning and zooming ──────────────────────────────────────────────
  const startPan = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    setPickedEdge(null);
    const from = { x: e.clientX - view.x, y: e.clientY - view.y };
    onDrag(e, (ev) =>
      setView((v) => ({ ...v, x: ev.clientX - from.x, y: ev.clientY - from.y })),
    );
  };

  // Plain scrolling belongs to the page: a block that swallowed the wheel
  // would trap the reader on their way down the document.
  const onWheel = (e: ReactWheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const f = frameRect();
    const at = { x: e.clientX - f.left, y: e.clientY - f.top };
    setView((v) => zoomAt(v, at, e.deltaY < 0 ? 1.1 : 1 / 1.1));
  };

  const zoomMiddle = (factor: number) => {
    const f = frameRect();
    setView((v) => zoomAt(v, { x: f.width / 2, y: f.height / 2 }, factor));
  };

  // Fitting is a button, never automatic: a view that jumps on its own while
  // someone is reading is worse than one they move themselves.
  const fit = () => {
    const f = frameRect();
    if (!f.width || !f.height) return;
    setView(fitView(Object.values(rects), { w: f.width, h: f.height }, PAD));
  };

  const addBlock = () => {
    const base = getPos?.();
    if (base == null) return;
    const f = frameRect();
    const middle = toCanvas(
      { x: f.left + f.width / 2, y: f.top + f.height / 2 },
      f,
      view,
    );
    editor
      .chain()
      .focus()
      .insertContentAt(base + node.nodeSize - 1, {
        type: "paragraph",
        attrs: {
          canvasId: canvasId(),
          canvasX: snap(middle.x - DEFAULT_BLOCK_WIDTH / 2),
          canvasY: snap(middle.y),
          canvasW: DEFAULT_BLOCK_WIDTH,
        },
      })
      .run();
  };

  // ── One block ────────────────────────────────────────────────────────
  const duplicateBlock = (child: Child) => {
    const base = getPos?.();
    if (base == null) return;
    const at = base + 1 + child.offset;
    const original = editor.view.state.doc.nodeAt(at);
    if (!original) return;
    const copy = original.toJSON() as {
      attrs?: Record<string, unknown>;
    } & Record<string, unknown>;
    // A copy is its own block: new id, a step down and to the right, and
    // none of the original's links — which of them it inherits is a guess,
    // and the wrong guess is harder to undo than drawing one.
    copy.attrs = {
      ...(copy.attrs ?? {}),
      canvasId: canvasId(),
      canvasX: (child.x ?? 0) + GRID * 3,
      canvasY: (child.y ?? 0) + GRID * 3,
    };
    editor
      .chain()
      .focus()
      .insertContentAt(at + original.nodeSize, copy)
      .run();
  };

  const removeBlock = (child: Child) => {
    const base = getPos?.();
    if (base == null) return;
    const at = base + 1 + child.offset;
    const target = editor.view.state.doc.nodeAt(at);
    if (!target) return;
    // The links go with it, in the same transaction — see the pruning in
    // canvas-layout-plugin, which also covers a delete from anywhere else.
    editor
      .chain()
      .focus()
      .deleteRange({ from: at, to: at + target.nodeSize })
      .run();
  };

  // ── The minimap ──────────────────────────────────────────────────────
  const mini =
    frame.w && frame.h ? miniBox(Object.values(rects), frame, view) : null;

  const panToMini = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!mini) return;
    const map = e.currentTarget.getBoundingClientRect();
    // The map fits its box with xMidYMid meet, so one scale covers both axes
    // and the leftover space is split evenly.
    const scale = Math.min(map.width / mini.box.w, map.height / mini.box.h);
    const at = {
      x:
        mini.box.x +
        (e.clientX - map.left - (map.width - mini.box.w * scale) / 2) / scale,
      y:
        mini.box.y +
        (e.clientY - map.top - (map.height - mini.box.h * scale) / 2) / scale,
    };
    setView((v) => centreOn(at, frame, v));
  };

  const plane = {
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
  };
  const showControls = editable && !locked;

  return (
    <NodeViewWrapper
      as="div"
      className="folio-canvas"
      data-type="canvas"
      data-locked={locked ? "true" : undefined}
      data-tall={tall ? "true" : undefined}
    >
      <div
        ref={frameRef}
        className="folio-canvas__frame"
        style={{
          // In either of the roomy views the height is CSS's job; the
          // attribute only says how tall the block is inside the page.
          height: wide ? undefined : `${liveHeight ?? height}px`,
          backgroundSize: `${GRID * 2.75 * view.k}px ${GRID * 2.75 * view.k}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
        onWheel={onWheel}
      >
        {/* Empty space: panning, and nothing else. Below every block. */}
        <div
          className="folio-canvas__ground"
          contentEditable={false}
          onPointerDown={startPan}
        />

        <svg className="folio-canvas__edges" aria-hidden="true">
          <defs>
            <marker
              id="folio-canvas-arrow"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L8,4 L0,8 z" />
            </marker>
          </defs>
          <g
            transform={`translate(${view.x},${view.y}) scale(${view.k})`}
          >
            {edges.map((edge) => {
              const a = rects[edge.from];
              const b = rects[edge.to];
              if (!a || !b) return null;
              const d = edgePath(a, edge.fromSide, b, edge.toSide);
              const mid = edge.label
                ? edgeMidpoint(a, edge.fromSide, b, edge.toSide)
                : null;
              return (
                <g
                  key={edge.id}
                  className={edge.id === pickedEdge ? "is-picked" : undefined}
                >
                  <path className="wire" d={d} markerEnd="url(#folio-canvas-arrow)" />
                  <path
                    className="hit"
                    d={d}
                    onClick={() => setPickedEdge(edge.id)}
                  />
                  {mid && (
                    <text x={mid.x} y={mid.y - 5} textAnchor="middle">
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
            {draft && rects[draft.from] && (
              <path
                className="draft"
                d={draftPath(rects[draft.from], draft.side, draft.to)}
                markerEnd="url(#folio-canvas-arrow)"
              />
            )}
          </g>
        </svg>

        {/* The blocks themselves, placed by canvas-layout-plugin. */}
        <div ref={planeRef} className="folio-canvas__plane" style={plane}>
          <NodeViewContent className="folio-canvas__content" />
        </div>

        {/* Grips, connection points and the edge tools: over the blocks, but
            out of the way of the caret — only the controls take the pointer. */}
        <div
          className="folio-canvas__overlay"
          style={plane}
          contentEditable={false}
        >
          {showControls &&
            children.map((child) => {
              const r = child.id ? rects[child.id] : null;
              if (!r) return null;
              return (
                <div
                  key={child.id}
                  className="folio-canvas__chrome"
                  style={{
                    transform: `translate(${r.x}px, ${r.y}px)`,
                    width: `${r.w}px`,
                    height: `${r.h}px`,
                  }}
                >
                  <span
                    className="folio-canvas__grip"
                    aria-hidden="true"
                    onPointerDown={(e) => startMove(e, child)}
                    title={t("canvas.move", "Move this block")}
                  >
                    ⠿
                  </span>
                  {SIDES.map((side) => (
                    <span
                      key={side}
                      className="folio-canvas__dot"
                      data-side={side}
                      aria-hidden="true"
                      onPointerDown={(e) => startLink(e, child, side)}
                    />
                  ))}
                  <span
                    className="folio-canvas__widen"
                    aria-hidden="true"
                    title={t("canvas.widen", "Change this block's width")}
                    onPointerDown={(e) => startWiden(e, child)}
                  />
                  <span className="folio-canvas__acts">
                    <button
                      type="button"
                      onClick={() => duplicateBlock(child)}
                      title={t("canvas.duplicate", "Duplicate this block")}
                    >
                      <Copy className="tiptap-button-icon" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(child)}
                      title={t("canvas.remove", "Remove this block")}
                    >
                      <Trash2 className="tiptap-button-icon" />
                    </button>
                  </span>
                </div>
              );
            })}

          {pickedEdge &&
            (() => {
              const edge = edges.find((e) => e.id === pickedEdge);
              const a = edge && rects[edge.from];
              const b = edge && rects[edge.to];
              if (!edge || !a || !b) return null;
              const m = edgeMidpoint(a, edge.fromSide, b, edge.toSide);
              return (
                <div
                  className="folio-canvas__edge-tools"
                  style={{ transform: `translate(${m.x}px, ${m.y}px)` }}
                >
                  {/* Uncontrolled, keyed on the edge: a transaction per
                      keystroke would reach every collaborator and fill the
                      undo stack with half-typed words. */}
                  <input
                    key={edge.id}
                    type="text"
                    className="folio-canvas__label"
                    defaultValue={edge.label ?? ""}
                    placeholder={t("canvas.label", "Label")}
                    aria-label={t("canvas.label", "Label")}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter" || e.key === "Escape") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    onBlur={(e) =>
                      updateAttributes({
                        edges: labelEdges(edges, edge.id, e.target.value),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="folio-canvas__cut"
                    onClick={() => removeEdge(edge.id)}
                    title={t("canvas.unlink", "Remove this link")}
                  >
                    <X className="tiptap-button-icon" />
                  </button>
                </div>
              );
            })()}
        </div>

        {children.length <= 1 && editable && (
          <p className="folio-canvas__empty" contentEditable={false}>
            {t(
              "canvas.empty",
              "Drag a block in, or add one — then drag a dot to link two together.",
            )}
          </p>
        )}

        <Card className="folio-canvas__bar folio-canvas__bar--start">
          {editable && (
            <Button
              type="button"
              variant="ghost"
              onClick={addBlock}
              disabled={locked}
            >
              <Plus className="tiptap-button-icon" />
              <span className="tiptap-button-text">
                {t("canvas.add", "Add block")}
              </span>
            </Button>
          )}
          {editable && (
            <Button
              type="button"
              variant="ghost"
              aria-pressed={locked}
              onClick={() => setLocked((v) => !v)}
              title={t("canvas.lock", "Lock the layout")}
            >
              <Lock className="tiptap-button-icon" />
            </Button>
          )}
        </Card>

        <Card className="folio-canvas__bar folio-canvas__bar--end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => zoomMiddle(1 / 1.15)}
            aria-label={t("canvas.zoomOut", "Zoom out")}
          >
            <Minus className="tiptap-button-icon" />
          </Button>
          <span className="folio-canvas__zoom">{Math.round(view.k * 100)}%</span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => zoomMiddle(1.15)}
            aria-label={t("canvas.zoomIn", "Zoom in")}
          >
            <Plus className="tiptap-button-icon" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={fit}
            aria-label={t("canvas.fit", "Fit to the blocks")}
          >
            <Maximize2 className="tiptap-button-icon" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-pressed={wide}
            onClick={toggleWide}
            aria-label={
              wide
                ? t("canvas.collapse", "Back into the page")
                : t("canvas.expand", "Fill the window")
            }
          >
            {wide ? (
              <Minimize2 className="tiptap-button-icon" />
            ) : (
              <Expand className="tiptap-button-icon" />
            )}
          </Button>
        </Card>

        {mini && (
          <svg
            className="folio-canvas__mini"
            viewBox={`${mini.box.x} ${mini.box.y} ${mini.box.w} ${mini.box.h}`}
            preserveAspectRatio="xMidYMid meet"
            role="presentation"
            onPointerDown={panToMini}
          >
            {Object.entries(rects).map(([id, r]) => (
              <rect
                key={id}
                className="block"
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                rx="6"
              />
            ))}
            <rect
              className="seen"
              x={mini.seen.x}
              y={mini.seen.y}
              width={mini.seen.w}
              height={mini.seen.h}
              rx="4"
            />
          </svg>
        )}

        {editable && !wide && (
          <span
            className="folio-canvas__stretch"
            title={t("canvas.height", "Drag to change the canvas height")}
            onPointerDown={startStretch}
          >
            <span className="folio-canvas__stretch-grip" />
          </span>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export interface CanvasOptions {
  /** Block types that can carry a canvas position. */
  types: string[];
}

export const Canvas = Node.create<CanvasOptions>({
  name: "canvas",
  group: "block",
  content: "block+",
  isolating: true,
  draggable: true,

  addOptions() {
    return { types: POSITIONABLE_TYPES };
  },

  addAttributes() {
    return {
      edges: {
        default: [] as CanvasEdge[],
        parseHTML: (el: HTMLElement) => parseEdges(el.getAttribute("data-edges")),
        renderHTML: (attrs: Record<string, unknown>) => {
          const edges = parseEdges(attrs.edges);
          return edges.length ? { "data-edges": JSON.stringify(edges) } : {};
        },
      },
      height: {
        default: DEFAULT_CANVAS_HEIGHT,
        parseHTML: (el: HTMLElement) =>
          Number(el.getAttribute("data-height")) || DEFAULT_CANVAS_HEIGHT,
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-height": String(attrs.height ?? DEFAULT_CANVAS_HEIGHT),
        }),
      },
    };
  },

  // Position belongs to the block, not to the canvas: that is what lets any
  // block type land on a canvas without knowing about one.
  addGlobalAttributes() {
    const attr = (name: string, data: string) => ({
      default: null as number | string | null,
      parseHTML: (el: HTMLElement) => {
        const raw = el.getAttribute(data);
        if (raw == null) return null;
        return name === "canvasId" ? raw : Number(raw);
      },
      renderHTML: (attrs: Record<string, unknown>) =>
        attrs[name] == null ? {} : { [data]: String(attrs[name]) },
    });

    return [
      {
        types: this.options.types,
        attributes: {
          canvasId: attr("canvasId", "data-canvas-id"),
          canvasX: attr("canvasX", "data-canvas-x"),
          canvasY: attr("canvasY", "data-canvas-y"),
          canvasW: attr("canvasW", "data-canvas-w"),
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [canvasLayoutPlugin(this.name)];
  },

  parseHTML() {
    return [{ tag: 'div[data-type="canvas"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "canvas" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CanvasView);
  },

  addCommands() {
    return {
      insertCanvas:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              content: [
                {
                  type: "paragraph",
                  attrs: {
                    canvasId: canvasId(),
                    canvasX: 32,
                    canvasY: 32,
                    canvasW: DEFAULT_BLOCK_WIDTH,
                  },
                },
              ],
            })
            .run(),
    };
  },
});
