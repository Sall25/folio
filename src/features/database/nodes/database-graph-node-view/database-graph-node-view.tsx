import { memo, useCallback, useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  DatabaseProperty,
  GraphBackground,
  GraphView,
  ID,
  Page,
} from "src/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Plus } from "src/components/icons";
import { usePagesBase } from "src/hooks/use-pages";
import { DynamicIcon } from "src/features/pages/cover/dynamic-icon";
import { useDatabaseContext } from "../../context/database-context";
import { useDataSource } from "../../hooks/use-data-source";
import { useOpenRecord } from "../../hooks/use-open-record";
import {
  buildGraph,
  linkProperties,
  type GraphNode,
} from "../../utils/graph-model";
import { graphLegend } from "../../utils/graph-colors";
import { onGraphRequest } from "../../utils/graph-cameras";
import {
  fromMinimap,
  minimapFit,
  minimapViewport,
  onMinimap,
} from "../../utils/graph-minimap";
import {
  fitIntoView,
  layoutGraph,
  nodeRadius,
  type GraphPoint,
} from "../../utils/graph-layout";
import {
  cameraTransform,
  visibleRect,
  type Camera,
} from "../../utils/graph-camera";
import { useGraphCanvas } from "./use-graph-canvas";
import { useGraphConnect, relationIdsOf } from "./use-graph-connect";
import { ViewStage } from "../../components/view-stage";
import "./database-graph-node-view.scss";

// The pages of a view, and what joins them, on a canvas.
//
// What joins them is anything that does: a link written in a page, a
// mention of one, or a relation property. Folio does not have to guess the
// way a notes app does, but it should not be fussy either — a connection is
// a connection, and the graph is the one place they are all the same thing.
//
// Drawn in SVG: a node is a real element, so it can be clicked, focused and
// read out, and the whole thing stays in the stylesheet with everything
// else. Moved, zoomed and dragged about by use-graph-canvas.

const BOX = { width: 1000, height: 600 };

function DatabaseGraphNodeViewImpl() {
  const { t } = useTranslation();
  const { db, source, sortedRecords } = useDatabaseContext();
  const view = db.activeView?.type === "graph" ? db.activeView : undefined;
  const openRecord = useOpenRecord(db.activeView);
  const { setCellValue, updatePropertiesAsync } = useDataSource(source?.id);
  // Ids of this view's own, so two graphs on one page cannot borrow each
  // other's ground or each other's clipped covers.
  const uid = useId().replace(/:/g, "");

  // Pages linked from elsewhere: another database's rows, or ones this
  // view's filters left out. Looked up, not fetched — they are already in
  // hand for everything else on the page.
  const { data: allPages } = usePagesBase<Page[]>((pages) => pages);
  const pageById = useMemo(() => {
    const map = new Map<ID, Page>();
    for (const page of allPages ?? []) {
      if (page.deletedAt == null) map.set(page.id, page);
    }
    return map;
  }, [allPages]);

  const graph = useMemo(
    () =>
      buildGraph(sortedRecords, source?.properties ?? [], view, (id) =>
        pageById.get(id),
      ),
    [sortedRecords, source?.properties, view, pageById],
  );

  // Where everything sits: worked out when the graph itself changes, and
  // seeded, so the same pages settle in the same places each time this view
  // is opened rather than rearranging themselves under the person.
  const pinned = view?.pinned;
  const positions = useMemo(() => {
    const settled = layoutGraph(graph.nodes, graph.edges, {
      ...BOX,
      pinned: pinned ?? {},
    });
    // Once anything has been put somewhere on purpose, the canvas stops
    // rearranging itself around it.
    const anyPinned = !!pinned && Object.keys(pinned).length > 0;
    return anyPinned ? settled : fitIntoView(settled, BOX).at;
  }, [graph, pinned]);

  const [held, setHeld] = useState<ID | null>(null);
  const near = useCallback(
    (id: ID) => held === id || !!graph.neighbours.get(held ?? "")?.has(id),
    [held, graph.neighbours],
  );

  /** A node dropped somewhere stays there, for everyone. */
  const pinNode = useCallback(
    (id: ID, at: GraphPoint) => {
      if (!view) return;
      db.updateView(view.id, {
        pinned: { ...(view.pinned ?? {}), [id]: at },
      } as Partial<GraphView>);
    },
    [db, view],
  );

  /** ⌥-press: the node goes back to being placed by the layout. */
  const unpinNode = useCallback(
    (id: ID) => {
      if (!view?.pinned?.[id]) return;
      const rest = { ...view.pinned };
      delete rest[id];
      db.updateView(view.id, { pinned: rest } as Partial<GraphView>);
    },
    [db, view],
  );

  // The relation a drag writes to. Plain relations first: a dependency says
  // "this blocks that" and sub-items say "this is inside that", neither of
  // which is what dragging one page onto another means.
  const connectProperty = useMemo(() => {
    const drawn = linkProperties(source?.properties ?? [], view);
    const plain = drawn.find(
      (p) =>
        p.config.type === "relation" &&
        !p.config.dependency &&
        !p.config.subItems,
    );
    return plain ?? drawn[0] ?? null;
  }, [source?.properties, view]);

  const recordById = useMemo(() => {
    const map = new Map<ID, Page>();
    for (const r of sortedRecords) map.set(r.id, r);
    return map;
  }, [sortedRecords]);

  const linksOf = useCallback(
    (id: ID) =>
      connectProperty
        ? relationIdsOf(
            (recordById.get(id) ?? pageById.get(id))?.values as
              Record<string, unknown> | undefined,
            connectProperty.id,
          )
        : [],
    [connectProperty, recordById, pageById],
  );

  // Opened over the page, the way a picture is: the one place a plain wheel
  // may zoom, because there is no page left under it to scroll.
  const [focused, setFocused] = useState(false);
  const background = view?.background ?? "dots";

  const connect = useGraphConnect({
    property: connectProperty,
    linksOf,
    setCellValue,
  });

  const canvas = useGraphCanvas({
    box: BOX,
    viewId: view?.id,
    points: positions,
    neighbours: graph.neighbours,
    onMoveNode: pinNode,
    onOpen: openRecord,
    onUnpin: unpinNode,
    canLink: connect.canLink,
    onLink: connect.link,
  });

  // The wheel, listened for by hand: React's own wheel is passive, and a
  // zoom that cannot stop ⌘-wheel from zooming the whole page with it is
  // worse than no zoom at all.
  //
  // Held as state rather than in a ref, because opening the graph over the
  // page moves the canvas into a portal: the element is made again there,
  // and a ref would leave the listener on the one that was thrown away.
  const [surface, setSurface] = useState<SVGSVGElement | null>(null);
  const onWheel = canvas.onWheel;
  const onTouchStart = canvas.onTouchStart;
  useEffect(() => {
    if (!surface) return;
    surface.addEventListener("wheel", onWheel, { passive: false });
    // Two fingers on a screen, for machines where the trackpad's pinch is
    // eaten by the webview before the page sees it.
    surface.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => {
      surface.removeEventListener("wheel", onWheel);
      surface.removeEventListener("touchstart", onTouchStart);
    };
  }, [surface, onWheel, onTouchStart]);

  // Framing the graph and opening it over the page are settings in the
  // layout panel now, and that panel sits in the toolbar knowing nothing
  // about where the pages are or whether this canvas is the one on screen.
  // It asks by view; this is the canvas that answers (graph-cameras.ts).
  const fit = canvas.fit;
  const zoomIn = canvas.zoomIn;
  const zoomOut = canvas.zoomOut;
  useEffect(() => onGraphRequest(view?.id, "fit", fit), [view?.id, fit]);
  useEffect(
    () => onGraphRequest(view?.id, "zoomIn", zoomIn),
    [view?.id, zoomIn],
  );
  useEffect(
    () => onGraphRequest(view?.id, "zoomOut", zoomOut),
    [view?.id, zoomOut],
  );
  useEffect(
    () => onGraphRequest(view?.id, "open", () => setFocused(true)),
    [view?.id],
  );

  /** Make the relation a graph needs, when the database has none: dragging
   *  writes a relation, and with nowhere to write it the gesture can only
   *  do nothing, which is the worst a gesture can do. */
  const addRelation = useCallback(() => {
    if (!source) return;
    const id = () =>
      crypto.randomUUID?.() ??
      `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const outward = id();
    const inward = id();
    void updatePropertiesAsync([
      ...(source.properties ?? []),
      {
        id: outward,
        name: t("database.graph.relatedTo"),
        config: {
          type: "relation",
          targetSourceId: source.id,
          showOnTarget: true,
          mirrorPropertyId: inward,
        },
        width: 200,
      } as DatabaseProperty,
      {
        id: inward,
        name: t("database.graph.relatedFrom"),
        config: {
          type: "relation",
          targetSourceId: source.id,
          showOnTarget: false,
          mirrorPropertyId: outward,
        },
        width: 200,
      } as DatabaseProperty,
    ]);
  }, [source, updatePropertiesAsync, t]);

  // The legend: what each colour on the canvas means, in the words and the
  // accents the rest of the database uses for the same values — an option's
  // own label and its own colour, not the id it is stored under.
  const legend = useMemo(() => {
    const keys: string[] = [];
    for (const node of graph.nodes)
      if (node.colorKey && !keys.includes(node.colorKey))
        keys.push(node.colorKey);
    const property = (source?.properties ?? []).find(
      (p) => p.id === view?.colorPropertyId,
    );
    return graphLegend(property, keys, {
      titleOf: (id) => pageById.get(id)?.title ?? undefined,
    });
  }, [graph.nodes, source?.properties, view?.colorPropertyId, pageById]);

  const colors = useMemo(
    () => new Map(legend.map((entry) => [entry.key, entry.accent])),
    [legend],
  );

  const at = useCallback(
    (id: ID): GraphPoint | undefined =>
      canvas.gesture.moving === id && canvas.gesture.movingAt
        ? canvas.gesture.movingAt
        : positions.get(id),
    [canvas.gesture, positions],
  );

  if (graph.nodes.length === 0) {
    return (
      <div className="db-graph db-graph--empty">
        <p>{t("database.graph.empty")}</p>
      </div>
    );
  }

  const { camera } = canvas;

  const body = (
    <div
      className="db-graph"
      data-type="database-graph"
      data-open={focused || undefined}
    >
      <div className="db-graph__bar">
        {legend.map((entry) => (
          <span key={entry.key} className="db-graph__key">
            <span
              className="db-graph__dot"
              style={{ background: entry.accent }}
            />
            {entry.label}
          </span>
        ))}
        <span className="db-graph__spacer" />
        {!connect.canConnect && (
          // Nothing to write a link in: an older database, or a graph view
          // added to one that started as something else. Everything else a
          // graph needs it is born with (make-data-source.ts).
          <Button variant="ghost" onClick={addRelation}>
            <Plus className="tiptap-button-icon" size={15} />
            <span className="tiptap-button-text">
              {t("database.graph.addRelation")}
            </span>
          </Button>
        )}
      </div>

      <div className="db-graph__stage">
        <svg
          ref={setSurface}
          className="db-graph__canvas"
          data-panning={canvas.gesture.panning || undefined}
          viewBox={`0 0 ${BOX.width} ${BOX.height}`}
          tabIndex={0}
          aria-label={t("database.graph.canvas")}
          onPointerDown={(e) => {
            // Quietly: :focus-visible stays off for a press, so no ring — but
            // 0, + and − work from the moment the canvas is touched instead
            // of only after it has been tabbed to.
            e.currentTarget.focus({ preventScroll: true });
            canvas.onBackgroundPointerDown(e);
          }}
          onKeyDown={canvas.onKeyDown}
          onPointerLeave={() => setHeld(null)}
        >
          <defs>
            <GroundPaint
              id={`${uid}-ground`}
              kind={background}
              camera={camera}
            />
            {graph.nodes.map((node) =>
              node.image ? (
                <clipPath
                  key={node.id}
                  id={`${uid}-clip-${node.id}`}
                  clipPathUnits="objectBoundingBox"
                >
                  <circle cx="0.5" cy="0.5" r="0.5" />
                </clipPath>
              ) : null,
            )}
          </defs>

          <g transform={cameraTransform(camera, BOX)}>
            <Ground
              id={`${uid}-ground`}
              camera={camera}
              onDoubleClick={canvas.fit}
            />

            {graph.edges.map((edge, i) => {
              const a = at(edge.from);
              const b = at(edge.to);
              if (!a || !b) return null;
              const lit = held ? edge.from === held || edge.to === held : false;
              return (
                <line
                  key={`${edge.from}>${edge.to}>${edge.propertyId ?? "link"}>${i}`}
                  className="db-graph__edge"
                  data-kind={edge.kind}
                  data-lit={lit || undefined}
                  data-dim={held && !lit ? "" : undefined}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                />
              );
            })}

            {graph.nodes.map((node) => {
              const point = at(node.id);
              if (!point) return null;
              return (
                <Node
                  key={node.id}
                  node={node}
                  at={point}
                  clipId={`${uid}-clip-${node.id}`}
                  color={node.colorKey ? colors.get(node.colorKey) : undefined}
                  state={held ? (near(node.id) ? "near" : "dim") : "rest"}
                  isHeld={held === node.id}
                  isMoving={canvas.gesture.moving === node.id}
                  isPlaced={!!view?.pinned?.[node.id]}
                  linking={
                    canvas.gesture.moving === node.id
                      ? "from"
                      : canvas.gesture.over === node.id
                        ? canvas.gesture.joins
                          ? "over"
                          : "refused"
                        : undefined
                  }
                  onHold={setHeld}
                  onPointerDown={canvas.onNodePointerDown}
                />
              );
            })}
          </g>
        </svg>

        <Minimap
          nodes={graph.nodes}
          points={positions}
          camera={camera}
          colorOf={(node) =>
            node.colorKey ? colors.get(node.colorKey) : undefined
          }
          onLookAt={canvas.lookAt}
          label={t("database.graph.map")}
        />
      </div>
    </div>
  );

  return (
    <ViewStage
      open={focused}
      onClose={() => setFocused(false)}
      label={t("database.graph.canvas")}
    >
      {body}
    </ViewStage>
  );
}

/**
 * The small map in the corner.
 *
 * A canvas you can pan forever is a canvas you can get lost on: pages end
 * up off the edge with nothing to say which edge. Everything fits in here,
 * the frame shows what the canvas is looking at, and a press on it goes
 * there.
 */
const MAP = { width: 170, height: 112 };

function Minimap({
  nodes,
  points,
  camera,
  colorOf,
  onLookAt,
  label,
}: {
  nodes: GraphNode[];
  points: Map<ID, GraphPoint>;
  camera: Camera;
  colorOf: (node: GraphNode) => string | undefined;
  onLookAt: (at: GraphPoint) => void;
  label: string;
}) {
  const spots = nodes
    .map((node) => ({ node, at: points.get(node.id) }))
    .filter((s): s is { node: GraphNode; at: GraphPoint } => !!s.at);
  if (spots.length === 0) return null;
  const fit = minimapFit(
    spots.map((s) => s.at),
    BOX,
    MAP,
    camera,
  );
  const frame = minimapViewport(fit, camera, BOX);

  const go = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    // The mapping as it is now, kept for the whole drag: it is worked out
    // from where the camera is looking, and re-reading it mid-drag would
    // move the map under the finger that is dragging it.
    const held = fit;
    const scale = rect.width ? MAP.width / rect.width : 1;
    const look = (e: { clientX: number; clientY: number }) =>
      onLookAt(
        fromMinimap(held, {
          x: (e.clientX - rect.left) * scale,
          y: (e.clientY - rect.top) * scale,
        }),
      );
    look(event);
    const move = (e: PointerEvent) => look(e);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <svg
      className="db-graph__map"
      viewBox={`0 0 ${MAP.width} ${MAP.height}`}
      width={MAP.width}
      height={MAP.height}
      aria-label={label}
      onPointerDown={go}
    >
      <rect
        className="db-graph__map-frame"
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        rx={3}
      />
      {spots.map(({ node, at }) => {
        const on = onMinimap(fit, at);
        return (
          <circle
            key={node.id}
            className="db-graph__map-spot"
            cx={on.x}
            cy={on.y}
            r={node.degree > 0 ? 2.4 : 1.6}
            style={colorOf(node) ? { fill: colorOf(node) } : undefined}
          />
        );
      })}
    </svg>
  );
}

/**
 * The ground the graph stands on.
 *
 * Drawn inside the camera's own group and in the graph's own coordinates,
 * so it pans and scales with everything standing on it — that is what tells
 * a canvas from a picture that changes size. What stays the same size is
 * the ink: a dot is a dot and a rule is a hairline however far in the view
 * is, so only the spacing between them grows.
 */
function Ground({
  id,
  camera,
  onDoubleClick,
}: {
  id: string;
  camera: Camera;
  onDoubleClick: () => void;
}) {
  return (
    <rect
      className="db-graph__ground"
      {...visibleRect(camera, BOX)}
      fill={`url(#${id})`}
      // Twice on the ground itself, never on a page: everything in view.
      onDoubleClick={onDoubleClick}
    />
  );
}

/** The paint the ground is filled with: one pattern, or one gradient. */
function GroundPaint({
  id,
  kind,
  camera,
}: {
  id: string;
  kind: GraphBackground;
  camera: Camera;
}) {
  if (kind === "grid")
    return (
      <pattern id={id} width={32} height={32} patternUnits="userSpaceOnUse">
        <path
          className="db-graph__rule"
          d="M32 0H0V32"
          fill="none"
          strokeWidth={1 / camera.zoom}
        />
      </pattern>
    );
  if (kind === "glow")
    return (
      <radialGradient
        id={id}
        gradientUnits="userSpaceOnUse"
        cx={BOX.width / 2}
        cy={BOX.height / 2}
        r={BOX.width * 0.62}
      >
        <stop className="db-graph__glow-near" offset="0" />
        <stop className="db-graph__glow-far" offset="1" />
      </radialGradient>
    );
  return (
    <pattern id={id} width={32} height={32} patternUnits="userSpaceOnUse">
      <circle className="db-graph__speck" cx={16} cy={16} r={1 / camera.zoom} />
    </pattern>
  );
}

function Node({
  node,
  at,
  clipId,
  color,
  state,
  isHeld,
  isMoving,
  isPlaced,
  linking,
  onHold,
  onPointerDown,
}: {
  node: GraphNode;
  at: GraphPoint;
  clipId: string;
  color: string | undefined;
  state: "rest" | "near" | "dim";
  isHeld: boolean;
  isMoving: boolean;
  isPlaced: boolean;
  linking: "from" | "over" | "refused" | undefined;
  onHold: (id: ID | null) => void;
  onPointerDown: (event: React.PointerEvent, id: ID) => void;
}) {
  // Its links make it bigger, but a page is a page: never a speck.
  const r = nodeRadius(node.degree);
  return (
    <g
      className="db-graph__node"
      data-state={state}
      data-held={isHeld || undefined}
      data-moving={isMoving || undefined}
      data-placed={isPlaced || undefined}
      data-foreign={!node.own || undefined}
      data-node-id={node.id}
      data-linking={linking}
      transform={`translate(${at.x} ${at.y})`}
      role="button"
      tabIndex={0}
      onPointerEnter={() => onHold(node.id)}
      onFocus={() => onHold(node.id)}
      // Press to open the page; drag it onto another to join the two, or
      // anywhere else to move it. ⌥ hands it back to the layout and ⇧
      // frames it with everything it touches (use-graph-canvas.ts).
      onPointerDown={(e) => onPointerDown(e, node.id)}
    >
      <circle
        className="db-graph__face"
        r={r}
        style={color ? { fill: color } : undefined}
      />
      {node.image && (
        <image
          href={node.image}
          x={-r}
          y={-r}
          width={r * 2}
          height={r * 2}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      )}
      {/* An emoji is text and can be drawn as text. A glyph is a name —
          "ac_unit" — that means a snowflake only to the icon font, and the
          font is reached through the same component every other page icon
          in the app uses, so a name with a look saved on it ("home;fill:0")
          and the older names that map to new glyphs all behave here as
          they do everywhere else. */}
      {!node.image &&
        node.icon &&
        (node.iconKind === "emoji" ? (
          <text className="db-graph__icon" y={r * 0.35} fontSize={r}>
            {node.icon}
          </text>
        ) : (
          <foreignObject
            x={-r * 0.58}
            y={-r * 0.58}
            width={r * 1.16}
            height={r * 1.16}
            // The glyph belongs to the node under it: the press that opens
            // or drags the page must not land on the icon instead.
            style={{ pointerEvents: "none", overflow: "visible" }}
          >
            <DynamicIcon
              name={node.icon}
              size={Math.round(r * 1.16)}
              className="db-graph__glyph"
              style={node.iconColor ? { color: node.iconColor } : undefined}
            />
          </foreignObject>
        ))}
      <circle className="db-graph__rim" r={r} />
      <text className="db-graph__label" y={r + 16}>
        {node.title || "—"}
      </text>
    </g>
  );
}

export const DatabaseGraphNodeView = memo(DatabaseGraphNodeViewImpl);
